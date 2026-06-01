#!/usr/bin/env bash
# Restores the dump from scripts/db-dump.sh into your TARGET Supabase.
# Run scripts/db-wipe.sh FIRST so the target is empty.
#
# Usage:
#   export TARGET_DB_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres"
#   bash scripts/db-restore.sh

set -euo pipefail

if [ -z "${TARGET_DB_URL:-}" ]; then
  echo "ERROR: TARGET_DB_URL is not set."
  exit 1
fi

IN_DIR="${IN_DIR:-./db-backup}"
[ -f "$IN_DIR/schema.sql" ] || { echo "Missing $IN_DIR/schema.sql"; exit 1; }
[ -f "$IN_DIR/data.sql" ]   || { echo "Missing $IN_DIR/data.sql"; exit 1; }

echo "→ Restoring auth.users FIRST (so FK references work)..."
if [ -f "$IN_DIR/auth_users.csv" ]; then
  psql "$TARGET_DB_URL" -c "
    CREATE TEMP TABLE _u (LIKE auth.users INCLUDING ALL);
    \\copy _u FROM '$IN_DIR/auth_users.csv' WITH CSV HEADER;
    INSERT INTO auth.users SELECT * FROM _u ON CONFLICT (id) DO NOTHING;
  "
fi

echo "→ Restoring public schema (tables, functions, triggers, policies)..."
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$IN_DIR/schema.sql"

echo "→ Restoring public data..."
psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f "$IN_DIR/data.sql"

echo "→ Ensuring at least one admin exists..."
psql "$TARGET_DB_URL" -c "
  SELECT user_id, role FROM public.user_roles WHERE role = 'admin' LIMIT 5;
"

echo "✅ Restore complete."
echo ""
echo "Next steps:"
echo "  1. If no admin row was shown above, promote a user:"
echo "     INSERT INTO public.user_roles(user_id, role)"
echo "     SELECT id, 'admin' FROM auth.users WHERE email='you@example.com';"
echo "  2. Recreate storage buckets in your self-hosted Supabase Studio."
echo "  3. Re-upload storage files (use scripts-tmp-backup.mjs output)."
