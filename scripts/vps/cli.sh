#!/usr/bin/env bash
# Quick-run CLI wrapper for the VPS deployment toolkit.
#
# Commands:
#   deploy [--dry-run]            Full first-time install + ship the app
#   redeploy                      Rebuild app from latest git, no infra changes
#   restore [--apply]             Interactive restore picker (verify-only by default)
#   verify                        Run the post-deploy healthcheck once
#   rollback [--dry-run]          Replay the latest rollback log in reverse
#   snapshot                      Take an on-demand DB snapshot
#   prune                         Apply GFS retention (7 daily/4 weekly/12 monthly)
#   monitoring up|down            Start/stop the Prometheus+Grafana stack
#   staging up|down|verify-latest Manage the isolated staging stack
#   secrets dump|get KEY|put K V  Operate on the encrypted vault
#
# Required env for `deploy`:  DOMAIN, EMAIL, REPO
# Optional:                    APP_USER, DUMP_FILE, DRY_RUN=1
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

# ─── dry-run shim: stub out destructive CLIs into a tmp bin dir ─────────────
maybe_dry_shim() {
  [ "${DRY_RUN:-0}" = "1" ] || return 0
  local shim; shim="$(mktemp -d -t dryrun.XXXXXX)"
  for cmd in clpctl certbot pm2 systemctl docker docker-compose pg_restore pg_dump psql pg_isready pg_isready; do
    cat > "$shim/$cmd" <<EOF
#!/usr/bin/env bash
echo "[dry-run] $cmd \$*"
# pretend success and fake output for the few commands that scripts parse
case "$cmd \$1 \${2:-}" in
  "pg_isready"*)       exit 0 ;;
  "docker ps"*)        echo "supabase-kong   Up 1 hour" ;;
  "pm2 jlist"*)        echo '[{"name":"app","pm2_env":{"status":"online"}}]' ;;
  "pm2 startup"*)      echo "echo pm2-startup-stub" ;;
  "clpctl site:list"*) echo "" ;;
esac
exit 0
EOF
    chmod +x "$shim/$cmd"
  done
  export PATH="$shim:$PATH"
  export DRY_RUN=1
  echo "==> DRY-RUN active — destructive commands stubbed in $shim"
}

require_env() {
  for v in "$@"; do
    [ -n "${!v:-}" ] || { echo "missing required env: $v"; exit 2; }
  done
}

cmd_deploy() {
  [ "${1:-}" = "--dry-run" ] && { export DRY_RUN=1; shift; }
  maybe_dry_shim
  require_env DOMAIN EMAIL REPO
  bash "$HERE/deploy.sh"
}

cmd_redeploy() {
  require_env DOMAIN
  : "${APP_USER:=callescort}"
  local app_dir="/home/${APP_USER}/htdocs/${DOMAIN}"
  sudo -u "$APP_USER" bash -lc "cd '$app_dir' && git pull && bun install && BUILD_TARGET=node bun run build && pm2 reload all"
}

cmd_restore() {
  bash "$HERE/restore.sh" "$@"
}

cmd_verify() {
  require_env DOMAIN
  bash "$HERE/60-healthcheck.sh"
  bash "$HERE/65-smoke-test.sh"
}

cmd_smoke() {
  require_env DOMAIN
  bash "$HERE/65-smoke-test.sh"
}

cmd_rollback() {
  [ "${1:-}" = "--dry-run" ] && { export DRY_RUN=1; shift; }
  maybe_dry_shim
  local log="/var/log/supabase-rollback.log"
  [ -f "$log" ] || { echo "no rollback log at $log"; exit 1; }
  echo "==> replaying last rollback log (this just prints — actual rollback runs only on a failed deploy)"
  tail -200 "$log"
}

cmd_snapshot() {
  # shellcheck disable=SC1091
  source "$HERE/lib.sh"
  disable_rollback
  db_snapshot manual
}

cmd_prune() {
  bash "$HERE/45-snapshot-retention.sh"
}

cmd_monitoring() {
  bash "$HERE/80-monitoring.sh" "$@"
}

cmd_staging() {
  require_env DOMAIN
  bash "$HERE/70-staging.sh" "$@"
}

cmd_secrets() {
  # shellcheck disable=SC1091
  source "$HERE/lib.sh"; disable_rollback
  case "${1:-}" in
    dump) vault_dump ;;
    get)  vault_get "$2" ;;
    put)  vault_put "$2" "$3" ;;
    *)    echo "usage: secrets {dump|get KEY|put KEY VALUE}"; exit 2 ;;
  esac
}

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  deploy)     cmd_deploy "$@" ;;
  redeploy)   cmd_redeploy "$@" ;;
  restore)    cmd_restore "$@" ;;
  verify)     cmd_verify "$@" ;;
  smoke)      cmd_smoke "$@" ;;
  rollback)   cmd_rollback "$@" ;;
  snapshot)   cmd_snapshot ;;
  prune)      cmd_prune ;;
  monitoring) cmd_monitoring "$@" ;;
  staging)    cmd_staging "$@" ;;
  secrets)    cmd_secrets "$@" ;;
  ""|-h|--help|help) usage 0 ;;
  *) echo "unknown command: $cmd"; usage 2 ;;
esac
