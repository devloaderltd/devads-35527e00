#!/usr/bin/env bash
# Install Prometheus alert rules + a tiny textfile-collector cron that
# emits PM2 restart counts and Kong 5xx counts so the rules can fire.
#
# Rules cover:
#   - Kong 5xx spikes (>5 in 5m)
#   - PM2 process restart count increased
#   - Nightly pg_dump cron did not run / produced no new file in 26h
#   - Weekly restore-verify cron failed (supabase_restore_verify_ok == 0)
#   - Generic healthcheck failure (supabase_healthcheck_up{check} == 0 for 10m)
#
# Idempotent. Run AFTER 80-monitoring.sh up.
set -euo pipefail
source "$(dirname "$0")/lib.sh" 2>/dev/null || true
disable_rollback 2>/dev/null || true

MON_DIR="/opt/monitoring"
TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"
RULES_FILE="${MON_DIR}/alerts.yml"

mkdir -p "$MON_DIR" "$TEXTFILE_DIR"

# 1. Alert rules ---------------------------------------------------------------
cat > "$RULES_FILE" <<'EOF'
groups:
  - name: supabase-vps
    interval: 30s
    rules:
      - alert: KongDown
        expr: supabase_healthcheck_up{check="kong"} == 0
        for: 2m
        labels: { severity: critical, component: kong }
        annotations:
          summary: "Kong gateway is down"
          description: "Healthcheck reports kong unreachable on :8000 for 2m."

      - alert: Kong5xxSpike
        expr: increase(supabase_kong_5xx_total[5m]) > 5
        for: 1m
        labels: { severity: warning, component: kong }
        annotations:
          summary: "Kong returned >5 5xx responses in 5m"
          description: "Check supabase-kong logs: docker logs --tail 200 supabase-kong"

      - alert: PM2ProcessRestart
        expr: increase(supabase_pm2_restart_total[10m]) > 0
        for: 1m
        labels: { severity: warning, component: pm2 }
        annotations:
          summary: "PM2 process restarted"
          description: "The app PM2 process restart counter increased in the last 10m."

      - alert: PM2NotOnline
        expr: supabase_healthcheck_up{check="pm2"} == 0
        for: 5m
        labels: { severity: critical, component: pm2 }
        annotations:
          summary: "No PM2 process is online"

      - alert: BackupCronStalled
        expr: time() - supabase_backup_last_success_ts > 26*3600
        for: 10m
        labels: { severity: critical, component: backups }
        annotations:
          summary: "No successful pg_dump in 26h"
          description: "Nightly cron at 03:15 has not produced a new dump."

      - alert: RestoreVerifyFailed
        expr: supabase_restore_verify_ok == 0
        for: 5m
        labels: { severity: critical, component: backups }
        annotations:
          summary: "Weekly restore-verify reported failure"

      - alert: HealthcheckFailing
        expr: supabase_healthcheck_up == 0
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: "Healthcheck `{{ $labels.check }}` failing for 10m"
EOF

# 2. Wire rules into prometheus.yml and reload --------------------------------
if ! grep -q '^rule_files:' "$MON_DIR/prometheus.yml"; then
  cat >> "$MON_DIR/prometheus.yml" <<'EOF'

rule_files:
  - /etc/prometheus/alerts.yml
EOF
fi
# Mount the rules file into the prometheus container if not already mounted.
if ! grep -q 'alerts.yml' "$MON_DIR/docker-compose.yml"; then
  sed -i '/prometheus.yml:\/etc\/prometheus\/prometheus.yml:ro/a\      - ./alerts.yml:/etc/prometheus/alerts.yml:ro' \
    "$MON_DIR/docker-compose.yml"
fi
(cd "$MON_DIR" && docker compose up -d prometheus)
sleep 2
curl -fsS -X POST http://127.0.0.1:9090/-/reload >/dev/null 2>&1 || true

# 3. Textfile metrics emitter --------------------------------------------------
cat > /usr/local/bin/supabase-metrics-emit.sh <<'EOF'
#!/usr/bin/env bash
# Writes Prometheus textfile metrics every minute.
set -u
DIR=/var/lib/node_exporter/textfile_collector
TMP=$(mktemp)

# Kong 5xx count over the last 5 minutes from docker logs
KONG_5XX=$(docker logs --since 5m supabase-kong 2>&1 \
            | grep -Eo '" 5[0-9]{2} ' | wc -l 2>/dev/null || echo 0)

# PM2 restart counter (sum of restart_time across processes)
PM2_RESTARTS=$(pm2 jlist 2>/dev/null \
            | jq '[.[].pm2_env.restart_time] | add // 0' 2>/dev/null || echo 0)

# Newest dump file mtime
LATEST=$(ls -1t /var/backups/supabase/*.dump 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
  TS=$(stat -c %Y "$LATEST")
else
  TS=0
fi

{
  echo "# TYPE supabase_kong_5xx_total counter"
  echo "supabase_kong_5xx_total $KONG_5XX"
  echo "# TYPE supabase_pm2_restart_total counter"
  echo "supabase_pm2_restart_total $PM2_RESTARTS"
  echo "# TYPE supabase_backup_last_success_ts gauge"
  echo "supabase_backup_last_success_ts $TS"
} > "$TMP"
mv "$TMP" "$DIR/supabase_runtime.prom"
EOF
chmod +x /usr/local/bin/supabase-metrics-emit.sh

cat > /etc/cron.d/supabase-metrics <<'EOF'
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
* * * * * root /usr/local/bin/supabase-metrics-emit.sh >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/supabase-metrics
/usr/local/bin/supabase-metrics-emit.sh || true

# 4. Add an Alerts panel to the existing dashboard ----------------------------
DASH="$MON_DIR/grafana/dashboards/supabase-vps.json"
if [ -f "$DASH" ] && ! grep -q '"Active alerts"' "$DASH"; then
  python3 - "$DASH" <<'PY' || true
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["panels"].append({
  "type":"alertlist","title":"Active alerts",
  "gridPos":{"x":0,"y":28,"w":24,"h":8},
  "options":{"showOptions":"current","maxItems":20,"stateFilter":{"firing":True,"pending":True}}
})
json.dump(d, open(p,"w"), indent=2)
PY
  (cd "$MON_DIR" && docker compose restart grafana >/dev/null 2>&1 || true)
fi

echo "==> alert rules installed"
echo "    rules     : $RULES_FILE"
echo "    verify in Prometheus UI: http://127.0.0.1:9090/alerts"
echo "    verify in Grafana:       Alerting -> Alert rules (data source: Prometheus)"
