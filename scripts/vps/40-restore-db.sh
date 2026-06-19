#!/usr/bin/env bash
# Step 5 — Restore an existing pg_dump into the self-hosted Supabase Postgres.
# Accepts either a custom-format dump (.dump) or a plain SQL file (.sql / .sql.gz).
#
# Usage:
#   DUMP_FILE=/root/backups/prod-2026-06-19.dump bash scripts/vps/40-restore-db.sh
#
# Reads POSTGRES_PASSWORD from /opt/supabase/docker/.env.
set -euo pipefail
: "${DUMP_FILE:?set DUMP_FILE=/path/to/dump}"
[ -f "$DUMP_FILE" ] || { echo "DUMP_FILE not found: $DUMP_FILE"; exit 1; }

ENV_FILE="/opt/supabase/docker/.env"
PG_PW=$(grep ^POSTGRES_PASSWORD "$ENV_FILE" | cut -d= -f2-)
export PGPASSWORD="$PG_PW"
DB_URL="postgres://postgres:${PG_PW}@127.0.0.1:5432/postgres"

echo "==> sanity check: postgres up?"
until pg_isready -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1; do
  echo "    waiting for postgres..."; sleep 2;
done

echo "==> safety snapshot of current DB to /root/backups/pre-restore-$(date +%s).sql.gz"
mkdir -p /root/backups
pg_dump "$DB_URL" | gzip > "/root/backups/pre-restore-$(date +%s).sql.gz"

echo "==> restoring $DUMP_FILE"
case "$DUMP_FILE" in
  *.dump|*.custom)
    pg_restore --clean --if-exists --no-owner --no-privileges \
      --schema=public -d "$DB_URL" "$DUMP_FILE"
    ;;
  *.sql.gz)
    gunzip -c "$DUMP_FILE" | psql "$DB_URL"
    ;;
  *.sql)
    psql "$DB_URL" -f "$DUMP_FILE"
    ;;
  *)
    echo "Unknown dump format. Use .dump / .sql / .sql.gz"; exit 2 ;;
esac

echo "==> re-applying GRANTs (PostgREST needs them)"
psql "$DB_URL" <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
NOTIFY pgrst, 'reload schema';
SQL

echo "==> verification"
psql "$DB_URL" -c "\dt public.*" | tail -20
echo "done. PostgREST should hot-reload in ~1s."
