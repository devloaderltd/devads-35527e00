#!/usr/bin/env bash
# Prometheus + Grafana + exporters stack for the VPS.
# Replaces Telegram/Email alerting. Everything is visualized in Grafana.
#
# Components (all docker, on the host network or 127.0.0.1-bound ports):
#   - prometheus            127.0.0.1:9090
#   - grafana               127.0.0.1:3030     (CloudPanel reverse-proxy → grafana.${DOMAIN})
#   - node_exporter         127.0.0.1:9100     (host metrics + textfile collector for healthcheck)
#   - cadvisor              127.0.0.1:9101     (per-container CPU/RAM — supabase + pm2)
#   - postgres_exporter     127.0.0.1:9187     (self-hosted supabase DB)
#
# Scraped targets you'll see in Grafana out of the box:
#   - Host (CPU / RAM / disk / network)
#   - Each supabase container (kong, db, auth, rest, studio, …)
#   - PostgreSQL (connections, locks, replication, slow queries, WAL)
#   - Kong (errors, request rate, latency) via cadvisor + textfile
#   - Healthcheck booleans (kong / auth / rest / studio / pm2) from /var/lib/node_exporter/textfile_collector
#   - Backup metrics (kept / pruned / bytes) from 45-snapshot-retention.sh
#
# Usage:
#   sudo DOMAIN=example.com bash scripts/vps/80-monitoring.sh up
#   sudo bash scripts/vps/80-monitoring.sh down
#   sudo bash scripts/vps/80-monitoring.sh status
set -euo pipefail
source "$(dirname "$0")/lib.sh" 2>/dev/null || true
disable_rollback 2>/dev/null || true

MON_DIR="/opt/monitoring"
TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"

cmd_up() {
  : "${DOMAIN:?set DOMAIN}"
  mkdir -p "$MON_DIR/grafana/provisioning/datasources" \
           "$MON_DIR/grafana/provisioning/dashboards" \
           "$MON_DIR/grafana/dashboards" \
           "$TEXTFILE_DIR"
  chmod 1777 "$TEXTFILE_DIR"

  local pg_pw; pg_pw="$(grep ^POSTGRES_PASSWORD /opt/supabase/docker/.env | cut -d= -f2-)"
  local graf_pw; graf_pw="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  vault_put GRAFANA_ADMIN_PASSWORD "$graf_pw" 2>/dev/null || true

  cat > "$MON_DIR/prometheus.yml" <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 30s
scrape_configs:
  - job_name: prometheus
    static_configs: [{ targets: ['127.0.0.1:9090'] }]
  - job_name: node
    static_configs: [{ targets: ['node_exporter:9100'] }]
  - job_name: cadvisor
    static_configs: [{ targets: ['cadvisor:8080'] }]
  - job_name: postgres
    static_configs: [{ targets: ['postgres_exporter:9187'] }]
EOF

  cat > "$MON_DIR/docker-compose.yml" <<EOF
name: monitoring
services:
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prom-data:/prometheus
    ports: ["127.0.0.1:9090:9090"]

  grafana:
    image: grafana/grafana-oss:latest
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: "${graf_pw}"
      GF_SERVER_ROOT_URL: "https://grafana.${DOMAIN}"
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
      - graf-data:/var/lib/grafana
    ports: ["127.0.0.1:3030:3000"]

  node_exporter:
    image: prom/node-exporter:latest
    restart: unless-stopped
    pid: host
    command:
      - --path.rootfs=/host
      - --collector.textfile.directory=/textfile
    volumes:
      - /:/host:ro,rslave
      - ${TEXTFILE_DIR}:/textfile:ro
    ports: ["127.0.0.1:9100:9100"]

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    restart: unless-stopped
    privileged: true
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    ports: ["127.0.0.1:9101:8080"]

  postgres_exporter:
    image: prometheuscommunity/postgres-exporter:latest
    restart: unless-stopped
    environment:
      DATA_SOURCE_NAME: "postgresql://postgres:${pg_pw}@host.docker.internal:5432/postgres?sslmode=disable"
    extra_hosts: ["host.docker.internal:host-gateway"]
    ports: ["127.0.0.1:9187:9187"]

volumes:
  prom-data:
  graf-data:
EOF

  cat > "$MON_DIR/grafana/provisioning/datasources/prom.yml" <<'EOF'
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

  cat > "$MON_DIR/grafana/provisioning/dashboards/dash.yml" <<'EOF'
apiVersion: 1
providers:
  - name: default
    folder: ''
    type: file
    options: { path: /var/lib/grafana/dashboards }
EOF

  # Minimal hand-rolled dashboard covering host, containers, postgres, healthcheck.
  cat > "$MON_DIR/grafana/dashboards/supabase-vps.json" <<'EOF'
{
  "title": "Supabase VPS Overview",
  "schemaVersion": 38, "version": 1, "refresh": "30s",
  "panels": [
    { "type": "stat",     "title": "Healthcheck failed", "gridPos": {"x":0,"y":0,"w":6,"h":4},
      "targets": [{"expr":"supabase_healthcheck_failed"}] },
    { "type": "stat",     "title": "Healthcheck passed", "gridPos": {"x":6,"y":0,"w":6,"h":4},
      "targets": [{"expr":"supabase_healthcheck_passed"}] },
    { "type": "stat",     "title": "Backups on disk",    "gridPos": {"x":12,"y":0,"w":6,"h":4},
      "targets": [{"expr":"supabase_backups_kept"}] },
    { "type": "stat",     "title": "Backup bytes",       "gridPos": {"x":18,"y":0,"w":6,"h":4},
      "targets": [{"expr":"supabase_backups_bytes"}] },
    { "type": "timeseries","title":"Host CPU %",         "gridPos":{"x":0,"y":4,"w":12,"h":8},
      "targets":[{"expr":"100 - (avg by (instance)(rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)"}]},
    { "type": "timeseries","title":"Host memory used",   "gridPos":{"x":12,"y":4,"w":12,"h":8},
      "targets":[{"expr":"node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes"}]},
    { "type": "timeseries","title":"Container CPU",      "gridPos":{"x":0,"y":12,"w":12,"h":8},
      "targets":[{"expr":"sum by (name)(rate(container_cpu_usage_seconds_total{name!=\"\"}[5m]))"}]},
    { "type": "timeseries","title":"Container RSS",      "gridPos":{"x":12,"y":12,"w":12,"h":8},
      "targets":[{"expr":"sum by (name)(container_memory_rss{name!=\"\"})"}]},
    { "type": "timeseries","title":"Postgres connections","gridPos":{"x":0,"y":20,"w":12,"h":8},
      "targets":[{"expr":"pg_stat_activity_count"}]},
    { "type": "timeseries","title":"Postgres rows fetched","gridPos":{"x":12,"y":20,"w":12,"h":8},
      "targets":[{"expr":"rate(pg_stat_database_tup_fetched[5m])"}]}
  ]
}
EOF

  cd "$MON_DIR" && docker compose up -d
  echo
  echo "==> monitoring stack up"
  echo "    Prometheus : http://127.0.0.1:9090"
  echo "    Grafana    : http://127.0.0.1:3030   (admin / ${graf_pw})"
  echo "    Add a CloudPanel reverse-proxy site for grafana.${DOMAIN} -> http://127.0.0.1:3030"
  echo "    Then run: clpctl lets-encrypt:install:certificate --domainName=grafana.${DOMAIN}"
}

cmd_down()    { cd "$MON_DIR" && docker compose down -v; }
cmd_status()  { cd "$MON_DIR" && docker compose ps; }

case "${1:-}" in
  up)     cmd_up ;;
  down)   cmd_down ;;
  status) cmd_status ;;
  *) echo "usage: $0 {up|down|status}"; exit 2 ;;
esac
