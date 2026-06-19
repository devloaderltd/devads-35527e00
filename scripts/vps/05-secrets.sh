#!/usr/bin/env bash
# Initialize the encrypted vault and seed it from the (legacy) plain-text
# credentials file if present. Also accepts new alerting secrets via env.
#
# Usage:
#   sudo TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=123 ALERT_EMAIL=you@x.com \
#        bash scripts/vps/05-secrets.sh
set -euo pipefail
source "$(dirname "$0")/lib.sh"
disable_rollback   # this script has nothing destructive to undo

vault_init
echo "==> seeding vault"

# 1. import from /opt/supabase/docker/.env (canonical source)
ENV_FILE="/opt/supabase/docker/.env"
if [ -f "$ENV_FILE" ]; then
  for k in POSTGRES_PASSWORD JWT_SECRET ANON_KEY SERVICE_ROLE_KEY DASHBOARD_PASSWORD; do
    v="$(grep "^$k=" "$ENV_FILE" | cut -d= -f2- || true)"
    [ -n "$v" ] && vault_put "$k" "$v" && echo "    + $k"
  done
fi

# 2. import legacy plaintext credentials, then shred it
LEGACY="/root/supabase-credentials.txt"
if [ -f "$LEGACY" ]; then
  echo "==> migrating $LEGACY into vault, then shredding"
  shred -u "$LEGACY" || rm -f "$LEGACY"
fi

# 3. alerting + optional API keys via env
for k in TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID ALERT_EMAIL \
         PLISIO_API_KEY LOVABLE_API_KEY DB_BACKUP_TOKEN CRON_TRIGGER_SECRET; do
  v="${!k:-}"
  [ -n "$v" ] && vault_put "$k" "$v" && echo "    + $k (from env)"
done

cat <<EOF

vault file : $VAULT_FILE         (chmod 600)
master key : $VAULT_KEY          (chmod 400) — BACK THIS UP OFF-SERVER NOW
read one   : sudo bash -c 'source $(pwd)/scripts/vps/lib.sh && vault_get ANON_KEY'
dump all   : sudo bash -c 'source $(pwd)/scripts/vps/lib.sh && vault_dump'
add/update : sudo bash -c 'source $(pwd)/scripts/vps/lib.sh && vault_put KEY value'
EOF
