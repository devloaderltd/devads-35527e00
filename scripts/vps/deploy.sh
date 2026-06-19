#!/usr/bin/env bash
# One-command orchestrator. Runs every step in order on a fresh Ubuntu LTS box.
#
# Usage:
#   sudo DOMAIN=example.com EMAIL=you@example.com \
#        REPO=git@github.com:you/app.git APP_USER=callescort \
#        [DUMP_FILE=/root/backups/old-prod.dump] \
#        bash scripts/vps/deploy.sh
set -euo pipefail
: "${DOMAIN:?}"; : "${EMAIL:?}"; : "${REPO:?}"
APP_USER="${APP_USER:-callescort}"
APP_DIR="/home/${APP_USER}/htdocs/${DOMAIN}"
HERE="$(cd "$(dirname "$0")" && pwd)"
source "$HERE/lib.sh"

# Step 1: base packages
bash "$HERE/00-install.sh"

# Step 2: supabase stack — snapshot existing DB first if present so we can roll back
if [ -f /opt/supabase/docker/.env ]; then
  SNAP="$(db_snapshot pre-deploy || true)"
  [ -n "$SNAP" ] && push_rollback "restore pre-deploy DB snapshot" "bash $HERE/restore.sh --apply <<<'APPLY' DUMP_FILE=$SNAP || true"
fi
DOMAIN="$DOMAIN" bash "$HERE/10-supabase-stack.sh"

# Step 2b: migrate secrets into encrypted vault
bash "$HERE/05-secrets.sh"

# Step 3 + 4: CloudPanel sites + SSL (with rollback that removes the sites)
if command -v clpctl >/dev/null; then
  DOMAIN="$DOMAIN" APP_USER="$APP_USER" bash "$HERE/20-cloudpanel-sites.sh"
  for d in "${DOMAIN}" "api.${DOMAIN}" "studio.${DOMAIN}"; do
    push_rollback "remove CloudPanel site $d" "clpctl site:delete --domainName=$d --force || true"
  done
  DOMAIN="$DOMAIN" EMAIL="$EMAIL" bash "$HERE/30-ssl.sh"
else
  echo "!! clpctl not found — install CloudPanel first, then re-run 20-/30- scripts."
fi

# Clone + build the app
id -u "$APP_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR"
else
  sudo -u "$APP_USER" git -C "$APP_DIR" pull
fi

ANON=$(grep ^ANON_KEY        /opt/supabase/docker/.env | cut -d= -f2-)
SRV=$( grep ^SERVICE_ROLE_KEY /opt/supabase/docker/.env | cut -d= -f2-)
install -o "$APP_USER" -g "$APP_USER" -m 600 /dev/null "$APP_DIR/.env"
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
SUPABASE_URL=https://api.${DOMAIN}
SUPABASE_PUBLISHABLE_KEY=${ANON}
SUPABASE_SERVICE_ROLE_KEY=${SRV}
VITE_SUPABASE_URL=https://api.${DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON}
VITE_SUPABASE_PROJECT_ID=local
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "[dry-run] skipping: bun install / build / pm2 start / pm2 startup"
else
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && bun install && BUILD_TARGET=node bun run build"
  sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && pm2 start ecosystem.config.cjs && pm2 save"
  push_rollback "stop PM2 app" "sudo -u $APP_USER pm2 delete all || true"
  STARTUP_CMD=$(env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/${APP_USER}" | tail -1)
  case "$STARTUP_CMD" in
    sudo*|env*|/*) bash -c "$STARTUP_CMD" || true ;;
    *) echo "!! could not parse pm2 startup command: $STARTUP_CMD" ;;
  esac
fi

# Optional: restore an existing dump
if [ -n "${DUMP_FILE:-}" ]; then
  DUMP_FILE="$DUMP_FILE" bash "$HERE/40-restore-db.sh"
fi

# Backups + health
bash "$HERE/50-backup-cron.sh"

# Monitoring stack (Prometheus + Grafana + exporters) + alert rules
DOMAIN="$DOMAIN" bash "$HERE/80-monitoring.sh" up || echo "!! monitoring stack failed, continuing"
bash "$HERE/81-alerts.sh" || echo "!! alerts install failed, continuing"

# Hourly health-check cron — writes Prometheus textfile metrics
cat > /etc/cron.d/supabase-healthcheck <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 * * * * root DOMAIN=${DOMAIN} bash ${HERE}/60-healthcheck.sh >> /var/log/supabase-healthcheck.log 2>&1
EOF

# Final gate: if healthcheck or smoke test fails, the whole deploy rolls back
DOMAIN="$DOMAIN" bash "$HERE/60-healthcheck.sh"
DOMAIN="$DOMAIN" bash "$HERE/65-smoke-test.sh"
disable_rollback   # success — keep the changes
metric_emit supabase_deploy_succeeded 1 2>/dev/null || true
metric_emit supabase_deploy_last_run "$(date +%s)" 2>/dev/null || true

cat <<EOF

================ DEPLOY COMPLETE ================
Secrets vault : /etc/supabase-vault/secrets.env.enc
Master key    : /etc/supabase-vault/master.key   <-- BACK UP OFF-SERVER
Backups dir   : /var/backups/supabase            (nightly 03:15, GFS retention 7d/4w/12m)
CLI wrapper   : sudo bash ${HERE}/cli.sh {deploy|restore|verify|rollback|prune|snapshot|monitoring|staging|secrets}
Healthcheck   : sudo DOMAIN=${DOMAIN} bash ${HERE}/cli.sh verify   (hourly cron installed)
Grafana       : http://127.0.0.1:3030  → proxy to grafana.${DOMAIN} via CloudPanel
Staging stack : sudo DOMAIN=${DOMAIN} bash ${HERE}/cli.sh staging up
=================================================
EOF
