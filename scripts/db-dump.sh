#!/usr/bin/env bash
# Dumps the SOURCE Supabase database (Lovable Cloud) into 3 SQL files:
#   - schema.sql    → public schema structure (tables, functions, triggers, RLS)
#   - data.sql      → all rows in public schema
#   - auth.sql      → auth.users rows (so logins still work after restore)
#
# Usage:
#   export SOURCE_DB_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
#   bash scripts/db-dump.sh
#
# Where to get SOURCE_DB_URL:
#   The Lovable Cloud project's DB URL is the SUPABASE_DB_URL secret in this
#   project (Project Settings → Secrets). Use the "Session" mode connection
#   string (port 5432), NOT the transaction pooler (port 6543) — pg_dump
#   needs session-mode for prepared statements.

set -euo pipefail

if [ -z "${SOURCE_DB_URL:-}" ]; then
  echo "ERROR: SOURCE_DB_URL is not set."
  exit 1
fi

OUT_DIR="${OUT_DIR:-./db-backup}"
mkdir -p "$OUT_DIR"

echo "→ Dumping public schema structure..."
pg_dump "$SOURCE_DB_URL" \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-publications \
  --no-subscriptions \
  --if-exists --clean \
  -f "$OUT_DIR/schema.sql"

echo "→ Dumping public schema data..."
pg_dump "$SOURCE_DB_URL" \
  --schema=public \
  --data-only \
  --no-owner \
  --no-privileges \
  --disable-triggers \
  --column-inserts \
  -f "$OUT_DIR/data.sql"

echo "→ Dumping auth.users (minimal columns for login)..."
psql "$SOURCE_DB_URL" -At -c "
  COPY (
    SELECT
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at, confirmed_at,
      email_change_token_current, email_change_confirm_status, banned_until,
      reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at
    FROM auth.users
  ) TO STDOUT WITH CSV HEADER
" > "$OUT_DIR/auth_users.csv"

echo "✅ Dump complete in $OUT_DIR/"
ls -lh "$OUT_DIR"
