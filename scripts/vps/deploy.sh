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

bash "$HERE/00-install.sh"
DOMAIN="$DOMAIN" bash "$HERE/10-supabase-stack.sh"

# CloudPanel sites + SSL (requires CloudPanel already installed on this VPS)
if command -v clpctl >/dev/null; then
  DOMAIN="$DOMAIN" APP_USER="$APP_USER" bash "$HERE/20-cloudpanel-sites.sh"
  DOMAIN="$DOMAIN" EMAIL="$EMAIL"        bash "$HERE/30-ssl.sh"
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

sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && bun install && BUILD_TARGET=node bun run build"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && pm2 start ecosystem.config.cjs && pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/${APP_USER}" | tail -1 | bash || true

# Optional: restore an existing dump
if [ -n "${DUMP_FILE:-}" ]; then
  DUMP_FILE="$DUMP_FILE" bash "$HERE/40-restore-db.sh"
fi

# Backups + health
bash "$HERE/50-backup-cron.sh"
DOMAIN="$DOMAIN" bash "$HERE/60-healthcheck.sh" || true

echo
echo "================ DEPLOY COMPLETE ================"
echo "Credentials : /root/supabase-credentials.txt"
echo "Backups dir : /var/backups/supabase   (nightly 03:15, 14-day retention)"
echo "Restore now : sudo DUMP_FILE=/path/to.dump bash $HERE/40-restore-db.sh"
echo "Healthcheck : sudo DOMAIN=${DOMAIN} bash $HERE/60-healthcheck.sh"
echo "================================================="
