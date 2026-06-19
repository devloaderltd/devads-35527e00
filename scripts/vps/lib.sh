#!/usr/bin/env bash
# Shared library — rollback stack, secret vault, alerting.
# Source from any vps/*.sh: `source "$(dirname "$0")/lib.sh"`
set -uo pipefail

# ─── paths ──────────────────────────────────────────────────────────────────
VAULT_DIR="${VAULT_DIR:-/etc/supabase-vault}"
VAULT_FILE="${VAULT_DIR}/secrets.env.enc"
VAULT_KEY="${VAULT_DIR}/master.key"   # 0400 root:root
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/var/backups/supabase/snapshots}"
ROLLBACK_LOG="${ROLLBACK_LOG:-/var/log/supabase-rollback.log}"

mkdir -p "$VAULT_DIR" "$SNAPSHOT_DIR" 2>/dev/null || true
chmod 700 "$VAULT_DIR" 2>/dev/null || true

# ─── rollback stack ─────────────────────────────────────────────────────────
# Push undo commands onto a stack; popped in reverse order on failure.
ROLLBACK_STACK_FILE="$(mktemp -t rollback.XXXXXX)"
trap 'on_exit_rollback $?' EXIT

push_rollback() {
  # usage: push_rollback "description" "shell command to undo"
  printf '%s\t%s\n' "$1" "$2" >> "$ROLLBACK_STACK_FILE"
}

run_rollback() {
  echo "==> ROLLBACK starting" | tee -a "$ROLLBACK_LOG"
  if [ ! -s "$ROLLBACK_STACK_FILE" ]; then
    echo "    nothing on the stack." | tee -a "$ROLLBACK_LOG"; return
  fi
  # reverse order
  tac "$ROLLBACK_STACK_FILE" | while IFS=$'\t' read -r desc cmd; do
    echo "    undo: $desc" | tee -a "$ROLLBACK_LOG"
    bash -c "$cmd" >>"$ROLLBACK_LOG" 2>&1 || echo "      (undo failed, continuing)" | tee -a "$ROLLBACK_LOG"
  done
  alert_send "❌ Deploy ROLLED BACK on $(hostname). See $ROLLBACK_LOG"
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
# AES-256-CBC via openssl, master key in /etc/supabase-vault/master.key (chmod 400).
vault_init() {
  if [ ! -f "$VAULT_KEY" ]; then
    openssl rand -hex 32 > "$VAULT_KEY"
    chmod 400 "$VAULT_KEY"
    echo "    new vault key -> $VAULT_KEY (BACK THIS UP OFF-SERVER)"
  fi
}

vault_put() {
  # vault_put KEY VALUE — appends/replaces a KEY=VALUE line in the encrypted store
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

# ─── alerting (Telegram + Email) ────────────────────────────────────────────
alert_send() {
  local msg="$1"
  local tg_token tg_chat email_to
  tg_token="$(vault_get TELEGRAM_BOT_TOKEN 2>/dev/null || true)"
  tg_chat="$( vault_get TELEGRAM_CHAT_ID   2>/dev/null || true)"
  email_to="$(vault_get ALERT_EMAIL        2>/dev/null || true)"

  if [ -n "$tg_token" ] && [ -n "$tg_chat" ]; then
    curl -fsS -X POST "https://api.telegram.org/bot${tg_token}/sendMessage" \
      --data-urlencode "chat_id=${tg_chat}" \
      --data-urlencode "text=${msg}" >/dev/null || true
  fi
  if [ -n "$email_to" ] && command -v mail >/dev/null; then
    echo "$msg" | mail -s "[supabase-vps] $(hostname)" "$email_to" || true
  fi
}

# ─── snapshot helpers (used by rollback + restore) ──────────────────────────
db_snapshot() {
  local tag="${1:-auto}" ts out pg_pw
  ts="$(date +%Y%m%d-%H%M%S)"
  out="${SNAPSHOT_DIR}/snap-${tag}-${ts}.dump"
  pg_pw="$(grep ^POSTGRES_PASSWORD /opt/supabase/docker/.env 2>/dev/null | cut -d= -f2-)"
  [ -n "$pg_pw" ] || { echo "no postgres password — skipping snapshot"; return 0; }
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
