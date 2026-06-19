#!/usr/bin/env bash
# Step 6 — Install nightly pg_dump cron with 14-day retention + weekly verify.
# Idempotent; rewrites the cron files each run.
set -euo pipefail

BACKUP_DIR="/var/backups/supabase"
RETAIN_DAYS=14
ENV_FILE="/opt/supabase/docker/.env"

mkdir -p "$BACKUP_DIR"

# ---- nightly dump @ 03:15 ----
cat > /etc/cron.d/supabase-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root /usr/local/bin/supabase-dump.sh >> /var/log/supabase-backup.log 2>&1
30 4 * * 0 root /usr/local/bin/supabase-restore-verify.sh >> /var/log/supabase-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/supabase-backup

# ---- the dump script ----
cat > /usr/local/bin/supabase-dump.sh <<EOF
#!/usr/bin/env bash
set -euo pipefail
PG_PW=\$(grep ^POSTGRES_PASSWORD ${ENV_FILE} | cut -d= -f2-)
export PGPASSWORD="\$PG_PW"
TS=\$(date +%Y%m%d-%H%M%S)
OUT="${BACKUP_DIR}/supabase-\${TS}.dump"
echo "[\$(date -Is)] dumping to \$OUT"
pg_dump -h 127.0.0.1 -U postgres -d postgres -Fc -f "\$OUT"
gzip -f "${BACKUP_DIR}"/*.sql 2>/dev/null || true
# retention
find "${BACKUP_DIR}" -type f \\( -name '*.dump' -o -name '*.sql.gz' \\) -mtime +${RETAIN_DAYS} -delete
echo "[\$(date -Is)] done. files:"; ls -lh "${BACKUP_DIR}" | tail -10
EOF
chmod 755 /usr/local/bin/supabase-dump.sh

# ---- weekly restore-verify into a throwaway DB inside the postgres container ----
cat > /usr/local/bin/supabase-restore-verify.sh <<'EOF'
#!/usr/bin/env bash
# Verify that the latest dump actually restores cleanly into a temp DB.
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
else
  echo "[$(date -Is)] FAIL — restore errored, see log"; exit 2
fi
EOF
chmod 755 /usr/local/bin/supabase-restore-verify.sh

echo "==> installed:"
ls -l /etc/cron.d/supabase-backup /usr/local/bin/supabase-dump.sh /usr/local/bin/supabase-restore-verify.sh
echo "first dump will run at 03:15 server time; weekly verify Sundays 04:30."
echo "trigger now:   sudo /usr/local/bin/supabase-dump.sh"
