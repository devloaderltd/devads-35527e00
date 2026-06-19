#!/usr/bin/env bash
# Interactive restore. Lists available dumps, lets you pick one, restores
# into a TEMP database first, verifies, then (with --apply) swaps into
# production with an automatic pre-restore snapshot for rollback.
#
# Usage:
#   sudo bash scripts/vps/restore.sh              # interactive picker, verify-only
#   sudo bash scripts/vps/restore.sh --apply      # picker + apply to live DB
#   sudo DUMP_FILE=/path/to.dump bash scripts/vps/restore.sh --apply
set -euo pipefail
source "$(dirname "$0")/lib.sh"
disable_rollback   # we manage our own snapshot/rollback below

APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1

BACKUP_DIR="${BACKUP_DIR:-/var/backups/supabase}"
PG_PW="$(vault_get POSTGRES_PASSWORD 2>/dev/null \
  || grep ^POSTGRES_PASSWORD /opt/supabase/docker/.env | cut -d= -f2-)"
export PGPASSWORD="$PG_PW"
LIVE_URL="postgres://postgres:${PG_PW}@127.0.0.1:5432/postgres"

# ─── pick a dump ────────────────────────────────────────────────────────────
DUMP="${DUMP_FILE:-}"
if [ -z "$DUMP" ]; then
  mapfile -t FILES < <(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null)
  [ "${#FILES[@]}" -gt 0 ] || { echo "no dumps in $BACKUP_DIR"; exit 1; }

  echo "Available backups (newest first):"
  for i in "${!FILES[@]}"; do
    sz=$(du -h "${FILES[$i]}" | cut -f1)
    dt=$(date -r "${FILES[$i]}" '+%Y-%m-%d %H:%M')
    printf "  [%2d] %s  %5s  %s\n" "$i" "$dt" "$sz" "$(basename "${FILES[$i]}")"
  done
  read -rp "Pick number (or 'q' to quit): " idx
  [ "$idx" = "q" ] && exit 0
  DUMP="${FILES[$idx]}"
fi
[ -f "$DUMP" ] || { echo "dump not found: $DUMP"; exit 1; }
echo "==> selected: $DUMP"

# ─── 1. verify into a throwaway DB ──────────────────────────────────────────
TMPDB="verify_$(date +%s)"
echo "==> creating temp DB $TMPDB and restoring"
psql "$LIVE_URL" -c "CREATE DATABASE $TMPDB;" >/dev/null
trap 'psql "$LIVE_URL" -c "DROP DATABASE IF EXISTS $TMPDB;" >/dev/null || true' EXIT

TMP_URL="postgres://postgres:${PG_PW}@127.0.0.1:5432/${TMPDB}"
if ! pg_restore --clean --if-exists --no-owner --no-privileges -d "$TMP_URL" "$DUMP"; then
  echo "!! restore into temp DB failed"
  alert_send "❌ Restore VERIFY failed for $DUMP on $(hostname)"
  exit 2
fi

# end-to-end checks
TABLES=$(psql "$TMP_URL" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
ROWS=$(  psql "$TMP_URL" -tAc "SELECT COALESCE(sum(n_live_tup),0) FROM pg_stat_user_tables WHERE schemaname='public';")
USERS=$( psql "$TMP_URL" -tAc "SELECT count(*) FROM auth.users;" 2>/dev/null || echo "n/a")
echo "    public tables : $TABLES"
echo "    live rows est : $ROWS"
echo "    auth.users    : $USERS"

if [ "$TABLES" -lt 1 ]; then
  echo "!! verify failed: no public tables"
  alert_send "❌ Restore VERIFY produced 0 tables for $DUMP on $(hostname)"
  exit 3
fi
echo "==> verify OK"
alert_send "✅ Restore verify OK: $TABLES tables, $ROWS rows, $USERS auth users ($DUMP)"

# ─── 2. apply to live (only with --apply) ───────────────────────────────────
if [ "$APPLY" -ne 1 ]; then
  echo
  echo "Verify-only mode. Re-run with --apply to write into the live DB."
  exit 0
fi

read -rp "About to OVERWRITE the live database. Type 'APPLY' to confirm: " yn
[ "$yn" = "APPLY" ] || { echo "aborted."; exit 0; }

echo "==> snapshotting live DB for rollback"
SNAP="$(db_snapshot pre-restore)"
echo "    snapshot: $SNAP"

if ! pg_restore --clean --if-exists --no-owner --no-privileges -d "$LIVE_URL" "$DUMP"; then
  echo "!! live restore failed — rolling back from $SNAP"
  db_restore_snapshot "$SNAP" || true
  alert_send "❌ Live restore FAILED and was rolled back on $(hostname)"
  exit 4
fi

psql "$LIVE_URL" <<'SQL'
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
SQL

echo "==> applied. rollback snapshot kept at $SNAP"
alert_send "✅ Live restore APPLIED on $(hostname) from $(basename "$DUMP"). Snapshot: $SNAP"
