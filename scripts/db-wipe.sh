#!/usr/bin/env bash
# Wipes the TARGET Supabase database clean so you can do a fresh restore.
# Drops everything in `public` + auth.users rows + storage.objects rows.
# Leaves the Supabase-managed schemas (auth, storage, realtime, ...) intact
# so the platform keeps working.
#
# Usage:
#   export TARGET_DB_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres"
#   bash scripts/db-wipe.sh
#
# Get TARGET_DB_URL from: your self-hosted Supabase Studio → Project Settings
# → Database → Connection string (URI). Use the "session" pooler or direct.

set -euo pipefail

if [ -z "${TARGET_DB_URL:-}" ]; then
  echo "ERROR: TARGET_DB_URL is not set."
  exit 1
fi

echo "⚠️  About to WIPE database at: ${TARGET_DB_URL%%@*}@***"
read -r -p "Type 'WIPE' to continue: " confirm
[ "$confirm" = "WIPE" ] || { echo "Aborted."; exit 1; }

psql "$TARGET_DB_URL" <<'SQL'
-- 1) Drop the entire public schema and recreate it empty
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2) Clear all auth users (cascades to identities, sessions, refresh_tokens)
DELETE FROM auth.users;

-- 3) Clear storage objects + buckets so the restore can recreate them cleanly
DELETE FROM storage.objects;
DELETE FROM storage.buckets;

-- 4) Drop any leftover custom types/enums in public (already gone via CASCADE,
--    but in case the dump put them elsewhere)
SELECT 'Database wiped.' AS status;
SQL

echo "✅ Wipe complete. You can now restore."
