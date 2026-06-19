#!/usr/bin/env bash
# Step 6 — Install nightly pg_dump cron + GFS retention + weekly verify.
# Retention: 7 daily / 4 weekly / 12 monthly (see 45-snapshot-retention.sh).
# Idempotent; safe to re-run.
set -euo pipefail

BACKUP_DIR="/var/backups/supabase"
ENV_FILE="/opt/supabase/docker/.env"
HERE="$(cd "$(dirname "$0")" && pwd)"
RETENTION_SCRIPT="${HERE}/45-snapshot-retention.sh"

mkdir -p "$BACKUP_DIR"
install -m 755 "$RETENTION_SCRIPT" /usr/local/bin/supabase-prune.sh

cat > /etc/cron.d/supabase-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root /usr/local/bin/supabase-dump.sh    >> /var/log/supabase-backup.log 2>&1
45 3 * * * root /usr/local/bin/supabase-prune.sh   >> /var/log/supabase-backup.log 2>&1
30 4 * * 0 root /usr/local/bin/supabase-restore-verify.sh >> /var/log/supabase-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/supabase-backup

cat > /usr/local/bin/supabase-dump.sh <<EOF
#!/usr/bin/env bash
set -euo pipefail
PG_PW=\$(grep ^POSTGRES_PASSWORD ${ENV_FILE} | cut -d= -f2-)
export PGPASSWORD="\$PG_PW"
TS=\$(date +%Y%m%d-%H%M%S)
OUT="${BACKUP_DIR}/supabase-\${TS}.dump"
echo "[\$(date -Is)] dumping to \$OUT"
pg_dump -h 127.0.0.1 -U postgres -d postgres -Fc -f "\$OUT"
echo "[\$(date -Is)] done. files:"; ls -lh "${BACKUP_DIR}" | tail -10
EOF
chmod 755 /usr/local/bin/supabase-dump.sh

cat > /usr/local/bin/supabase-restore-verify.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="/var/backups/supabase"
ENV_FILE="/opt/supabase/docker/.env"
PG_PW=$(grep ^POSTGRES_PASSWORD "$ENV_FILE" | cut -d= -f2-)
export PGPASSWORD="$PG_PW"

LATEST=$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | head -1)
[ -n "$LATEST" ] || { echo "no dumps found"; exit 1; }

TMPDB="verify_$(date +%s)"
echo "[$(date -Is)] verifying $LATEST into $TMPDB"
psql -h 127.0.0.1 -U postgres -d postgres -c "CREATE DATABASE $TMPDB;"
trap 'psql -h 127.0.0.1 -U postgres -d postgres -c "DROP DATABASE IF EXISTS '"$TMPDB"';" || true' EXIT

if pg_restore --clean --if-exists --no-owner --no-privileges \
    -d "postgres://postgres:${PG_PW}@127.0.0.1:5432/${TMPDB}" "$LATEST"; then
  ROWS=$(psql -h 127.0.0.1 -U postgres -d "$TMPDB" -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
  echo "[$(date -Is)] OK — restored, public tables=$ROWS"
  echo "supabase_restore_verify_ok 1" > /var/lib/node_exporter/textfile_collector/supabase_restore_verify.prom 2>/dev/null || true
else
  echo "[$(date -Is)] FAIL — restore errored, see log"
  echo "supabase_restore_verify_ok 0" > /var/lib/node_exporter/textfile_collector/supabase_restore_verify.prom 2>/dev/null || true
  exit 2
fi
EOF
chmod 755 /usr/local/bin/supabase-restore-verify.sh

echo "==> installed nightly dump (03:15), GFS prune (03:45), weekly verify (Sun 04:30)"
echo "trigger now:   sudo /usr/local/bin/supabase-dump.sh && sudo /usr/local/bin/supabase-prune.sh"
