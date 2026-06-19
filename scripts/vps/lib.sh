#!/usr/bin/env bash
# Shared library — rollback stack, secret vault, dry-run shim, metric emit.
# Source from any vps/*.sh: `source "$(dirname "$0")/lib.sh"`
set -uo pipefail

# ─── paths ──────────────────────────────────────────────────────────────────
VAULT_DIR="${VAULT_DIR:-/etc/supabase-vault}"
VAULT_FILE="${VAULT_DIR}/secrets.env.enc"
VAULT_KEY="${VAULT_DIR}/master.key"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/var/backups/supabase/snapshots}"
ROLLBACK_LOG="${ROLLBACK_LOG:-/var/log/supabase-rollback.log}"
METRICS_DIR="${METRICS_DIR:-/var/lib/node_exporter/textfile_collector}"

mkdir -p "$VAULT_DIR" "$SNAPSHOT_DIR" "$METRICS_DIR" 2>/dev/null || true
chmod 700 "$VAULT_DIR" 2>/dev/null || true

# ─── dry-run mode ───────────────────────────────────────────────────────────
# When DRY_RUN=1 the CLI wrapper prepends a stub-bin dir to PATH so that
# clpctl / certbot / docker / pm2 / pg_restore just echo their args.
DRY_RUN="${DRY_RUN:-0}"
is_dry() { [ "$DRY_RUN" = "1" ]; }

# ─── rollback stack ─────────────────────────────────────────────────────────
ROLLBACK_STACK_FILE="$(mktemp -t rollback.XXXXXX)"
trap 'on_exit_rollback $?' EXIT

push_rollback() {
  printf '%s\t%s\n' "$1" "$2" >> "$ROLLBACK_STACK_FILE"
}

run_rollback() {
  echo "==> ROLLBACK starting" | tee -a "$ROLLBACK_LOG"
  if [ ! -s "$ROLLBACK_STACK_FILE" ]; then
    echo "    nothing on the stack." | tee -a "$ROLLBACK_LOG"; return
  fi
  tac "$ROLLBACK_STACK_FILE" | while IFS=$'\t' read -r desc cmd; do
    echo "    undo: $desc" | tee -a "$ROLLBACK_LOG"
    if is_dry; then
      echo "      [dry-run] would run: $cmd" | tee -a "$ROLLBACK_LOG"
    else
      bash -c "$cmd" >>"$ROLLBACK_LOG" 2>&1 \
        || echo "      (undo failed, continuing)" | tee -a "$ROLLBACK_LOG"
    fi
  done
  metric_emit supabase_deploy_rolled_back 1
}

on_exit_rollback() {
  local code="$1"
  if [ "$code" -ne 0 ] && [ "${ROLLBACK_ENABLED:-1}" = "1" ]; then
    run_rollback
  fi
  rm -f "$ROLLBACK_STACK_FILE" 2>/dev/null || true
}

disable_rollback() { ROLLBACK_ENABLED=0; }

# ─── encrypted secret vault ─────────────────────────────────────────────────
vault_init() {
  if [ ! -f "$VAULT_KEY" ]; then
    openssl rand -hex 32 > "$VAULT_KEY"
    chmod 400 "$VAULT_KEY"
    echo "    new vault key -> $VAULT_KEY (BACK THIS UP OFF-SERVER)"
  fi
}

vault_put() {
  local key="$1" val="$2" tmp
  vault_init
  tmp="$(mktemp)"
  vault_dump > "$tmp" 2>/dev/null || true
  grep -v "^${key}=" "$tmp" > "${tmp}.new" 2>/dev/null || true
  printf '%s=%q\n' "$key" "$val" >> "${tmp}.new"
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "${tmp}.new" -out "$VAULT_FILE" \
    -pass "file:${VAULT_KEY}"
  chmod 600 "$VAULT_FILE"
  shred -u "$tmp" "${tmp}.new" 2>/dev/null || rm -f "$tmp" "${tmp}.new"
}

vault_get() {
  [ -f "$VAULT_FILE" ] || return 1
  openssl enc -aes-256-cbc -pbkdf2 -d -in "$VAULT_FILE" -pass "file:${VAULT_KEY}" 2>/dev/null \
    | grep "^$1=" | head -1 | cut -d= -f2- | xargs -0 printf '%s'
}

vault_dump() {
  [ -f "$VAULT_FILE" ] || { echo ""; return; }
  openssl enc -aes-256-cbc -pbkdf2 -d -in "$VAULT_FILE" -pass "file:${VAULT_KEY}"
}

# ─── Prometheus textfile metrics (replaces telegram/email alerts) ───────────
metric_emit() {
  # metric_emit NAME VALUE [LABELS]
  # LABELS example:  'check="kong",severity="critical"'
  local name="$1" val="$2" labels="${3:-}"
  mkdir -p "$METRICS_DIR" 2>/dev/null || return 0
  local file="${METRICS_DIR}/${name}.prom"
  local tmp="${file}.$$"
  if [ -n "$labels" ]; then
    printf '# TYPE %s gauge\n%s{%s} %s\n' "$name" "$name" "$labels" "$val" > "$tmp"
  else
    printf '# TYPE %s gauge\n%s %s\n' "$name" "$name" "$val" > "$tmp"
  fi
  mv "$tmp" "$file"
}

# Back-compat shim — older scripts may still call alert_send. No-op now;
# Prometheus / Grafana own observability. Keep so sourced scripts don't fail.
alert_send() { :; }

# ─── snapshot helpers ───────────────────────────────────────────────────────
db_snapshot() {
  local tag="${1:-auto}" ts out pg_pw
  ts="$(date +%Y%m%d-%H%M%S)"
  out="${SNAPSHOT_DIR}/snap-${tag}-${ts}.dump"
  pg_pw="$(grep ^POSTGRES_PASSWORD /opt/supabase/docker/.env 2>/dev/null | cut -d= -f2-)"
  [ -n "$pg_pw" ] || { echo "no postgres password — skipping snapshot"; return 0; }
  if is_dry; then echo "[dry-run] would pg_dump -> $out"; echo "$out"; return; fi
  PGPASSWORD="$pg_pw" pg_dump -h 127.0.0.1 -U postgres -d postgres -Fc -f "$out"
  echo "$out"
}

db_restore_snapshot() {
  local file="$1" pg_pw
  [ -f "$file" ] || { echo "snapshot missing: $file"; return 1; }
  pg_pw="$(grep ^POSTGRES_PASSWORD /opt/supabase/docker/.env | cut -d= -f2-)"
  PGPASSWORD="$pg_pw" pg_restore --clean --if-exists --no-owner --no-privileges \
    -d "postgres://postgres:${pg_pw}@127.0.0.1:5432/postgres" "$file"
}
