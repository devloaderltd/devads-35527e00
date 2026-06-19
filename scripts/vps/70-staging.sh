#!/usr/bin/env bash
# Spin up a STAGING copy of the stack on the same VPS, isolated by:
#   - separate compose project name      ($STAGE_NS, default "staging")
#   - separate ports (kong 8001, app 3001, db 5433)
#   - separate subdomains                (staging.${DOMAIN}, api-staging, studio-staging)
#   - separate /opt/supabase-staging  and  /var/backups/supabase/staging
#
# Use it for nightly restore-verify so production never gets touched.
#
# Usage:
#   sudo DOMAIN=example.com bash scripts/vps/70-staging.sh up
#   sudo DOMAIN=example.com bash scripts/vps/70-staging.sh restore /var/backups/supabase/supabase-XYZ.dump
#   sudo DOMAIN=example.com bash scripts/vps/70-staging.sh down
set -euo pipefail
source "$(dirname "$0")/lib.sh"
disable_rollback
: "${DOMAIN:?}"
STAGE_NS="${STAGE_NS:-staging}"
STAGE_DIR="/opt/supabase-${STAGE_NS}"
KONG_PORT=8001
APP_PORT=3001
DB_PORT=5433

cmd_up() {
  if [ ! -d "$STAGE_DIR" ]; then
    cp -r /opt/supabase "$STAGE_DIR"
    cd "$STAGE_DIR/docker"

    PG_PW=$(openssl rand -hex 24)
    JWT=$(openssl rand -hex 32)
    sed -i \
      -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PW}|" \
      -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|" \
      -e "s|^SITE_URL=.*|SITE_URL=https://staging.${DOMAIN}|" \
      -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://api-staging.${DOMAIN}|" \
      -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://api-staging.${DOMAIN}|" \
      -e "s|^KONG_HTTP_PORT=.*|KONG_HTTP_PORT=${KONG_PORT}|" \
      -e "s|^POSTGRES_PORT=.*|POSTGRES_PORT=${DB_PORT}|" \
      .env
    vault_put "STAGING_POSTGRES_PASSWORD" "$PG_PW"
    vault_put "STAGING_JWT_SECRET"        "$JWT"
  fi
  cd "$STAGE_DIR/docker"
  docker compose -p "supabase-${STAGE_NS}" up -d
  echo "==> staging up: kong=:${KONG_PORT}  db=:${DB_PORT}"

  # CloudPanel staging sites (skip if clpctl missing)
  if command -v clpctl >/dev/null; then
    for sub in "staging.${DOMAIN}:${APP_PORT}" "api-staging.${DOMAIN}:${KONG_PORT}" "studio-staging.${DOMAIN}:${KONG_PORT}"; do
      d="${sub%%:*}"; p="${sub##*:}"
      clpctl site:list 2>/dev/null | grep -q " $d " && continue
      clpctl site:add:reverse-proxy --domainName="$d" \
        --reverseProxyUrl="http://127.0.0.1:${p}" \
        --siteUser="stg-${d//./-}" \
        --siteUserPassword="$(openssl rand -base64 16 | tr -d /+= | cut -c1-20)" || true
    done
  fi
}

cmd_down() {
  cd "$STAGE_DIR/docker" 2>/dev/null && docker compose -p "supabase-${STAGE_NS}" down -v || true
  echo "==> staging down"
}

cmd_restore() {
  local dump="${1:?usage: restore <dumpfile>}"
  local PG_PW; PG_PW="$(vault_get STAGING_POSTGRES_PASSWORD)"
  PGPASSWORD="$PG_PW" pg_restore --clean --if-exists --no-owner --no-privileges \
    -d "postgres://postgres:${PG_PW}@127.0.0.1:${DB_PORT}/postgres" "$dump"
  echo "==> restored $dump into staging"
}

cmd_verify_latest() {
  local latest; latest=$(ls -1t /var/backups/supabase/*.dump | head -1)
  [ -n "$latest" ] || { echo "no dumps"; exit 1; }
  cmd_up
  if cmd_restore "$latest"; then
    metric_emit supabase_staging_verify_ok 1 2>/dev/null || true
  else
    metric_emit supabase_staging_verify_ok 0 2>/dev/null || true
    exit 2
  fi
}

case "${1:-}" in
  up)             cmd_up ;;
  down)           cmd_down ;;
  restore)        shift; cmd_restore "$@" ;;
  verify-latest)  cmd_verify_latest ;;
  *) echo "usage: $0 {up|down|restore <dump>|verify-latest}"; exit 1 ;;
esac
