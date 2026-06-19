#!/usr/bin/env bash
# GFS retention for /var/backups/supabase/*.dump
# Keeps the latest:
#   - 7  daily
#   - 4  weekly  (one per ISO week, Sunday-anchored)
#   - 12 monthly (one per calendar month, the latest in that month)
# Everything else is deleted.
#
# Idempotent. Safe to run from cron or on demand.
#
# Usage:
#   bash scripts/vps/45-snapshot-retention.sh
#   BACKUP_DIR=/some/dir KEEP_DAILY=7 KEEP_WEEKLY=4 KEEP_MONTHLY=12 bash ...
set -euo pipefail
source "$(dirname "$0")/lib.sh" 2>/dev/null || true
disable_rollback 2>/dev/null || true

BACKUP_DIR="${BACKUP_DIR:-/var/backups/supabase}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
KEEP_MONTHLY="${KEEP_MONTHLY:-12}"

[ -d "$BACKUP_DIR" ] || { echo "no backup dir: $BACKUP_DIR"; exit 0; }

# Build "<epoch>\t<path>" lines, newest first.
mapfile -t ALL < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name '*.dump' -o -name '*.sql.gz' \) -printf '%T@\t%p\n' \
  | sort -rn
)

[ "${#ALL[@]}" -gt 0 ] || { echo "no backups to prune"; exit 0; }

declare -A KEEP
day_seen=0; week_seen=0; month_seen=0
declare -A SEEN_DAY SEEN_WEEK SEEN_MONTH

for line in "${ALL[@]}"; do
  ts="${line%%	*}"; path="${line#*	}"
  ts_i="${ts%.*}"
  day="$(  date -d "@$ts_i" +%Y-%m-%d)"
  week="$( date -d "@$ts_i" +%G-%V)"
  month="$(date -d "@$ts_i" +%Y-%m)"

  if [ -z "${SEEN_DAY[$day]:-}"     ] && [ "$day_seen"   -lt "$KEEP_DAILY"   ]; then
    KEEP[$path]=1; SEEN_DAY[$day]=1;     day_seen=$((day_seen+1))
  fi
  if [ -z "${SEEN_WEEK[$week]:-}"   ] && [ "$week_seen"  -lt "$KEEP_WEEKLY"  ]; then
    KEEP[$path]=1; SEEN_WEEK[$week]=1;   week_seen=$((week_seen+1))
  fi
  if [ -z "${SEEN_MONTH[$month]:-}" ] && [ "$month_seen" -lt "$KEEP_MONTHLY" ]; then
    KEEP[$path]=1; SEEN_MONTH[$month]=1; month_seen=$((month_seen+1))
  fi
done

kept=0; deleted=0; freed=0
for line in "${ALL[@]}"; do
  path="${line#*	}"
  if [ -n "${KEEP[$path]:-}" ]; then
    kept=$((kept+1))
    echo "  keep   $(basename "$path")"
  else
    size=$(stat -c%s "$path" 2>/dev/null || echo 0)
    freed=$((freed+size))
    deleted=$((deleted+1))
    echo "  prune  $(basename "$path")"
    rm -f -- "$path"
  fi
done

echo "==> kept=$kept  pruned=$deleted  freed=$((freed/1024/1024)) MiB"
metric_emit supabase_backups_kept    "$kept"    2>/dev/null || true
metric_emit supabase_backups_pruned  "$deleted" 2>/dev/null || true
metric_emit supabase_backups_bytes   "$(du -sb "$BACKUP_DIR" | cut -f1)" 2>/dev/null || true
