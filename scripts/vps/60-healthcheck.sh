#!/usr/bin/env bash
# Step 7 — Post-deploy health check. Exits non-zero if any check fails.
#
# Verifies:
#   1. Docker stack containers all running
#   2. Kong gateway answers on :8000
#   3. PostgREST reachable through Kong with the anon key
#   4. GoTrue (/auth/v1/health) reachable through Kong
#   5. Studio container is up and IP-restricted (expect 401/403 from public)
#   6. App PM2 process is "online"
#   7. App HTTP responds 200 on :3000
#   8. Public HTTPS endpoints return < 500 on https://${DOMAIN}, api.${DOMAIN}
#
# Usage: DOMAIN=example.com bash scripts/vps/60-healthcheck.sh
set -uo pipefail
: "${DOMAIN:?set DOMAIN=yourdomain.com}"
source "$(dirname "$0")/lib.sh" 2>/dev/null || true
disable_rollback 2>/dev/null || true
ENV_FILE="/opt/supabase/docker/.env"
PASS=0; FAIL=0
FAIL_LINES=()
bad()  { echo "  [FAIL] $*"; FAIL=$((FAIL+1)); FAIL_LINES+=("$*"); }
ok()   { echo "  [ OK ] $*"; PASS=$((PASS+1)); }


ANON=$(grep ^ANON_KEY "$ENV_FILE" | cut -d= -f2-)

echo "== 1. docker containers"
BAD=$(docker ps --filter "name=supabase" --format '{{.Names}} {{.Status}}' | grep -v 'Up ' || true)
[ -z "$BAD" ] && ok "all supabase containers up" || bad "down: $BAD"

echo "== 2. kong :8000"
curl -fsS -o /dev/null -w "    http=%{http_code}\n" http://127.0.0.1:8000/ \
  && ok "kong responds" || bad "kong unreachable"

echo "== 3. PostgREST via kong"
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  http://127.0.0.1:8000/rest/v1/)
[ "$code" = "200" ] && ok "rest/v1 -> $code" || bad "rest/v1 -> $code"

echo "== 4. GoTrue health"
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $ANON" http://127.0.0.1:8000/auth/v1/health)
[ "$code" = "200" ] && ok "auth/v1/health -> $code" || bad "auth/v1/health -> $code"

echo "== 5. studio container up"
docker ps --format '{{.Names}}' | grep -q supabase-studio \
  && ok "studio container running" || bad "studio container missing"

echo "== 6. PM2 process"
if pm2 jlist 2>/dev/null | jq -e '.[] | select(.pm2_env.status=="online")' >/dev/null; then
  ok "at least one PM2 process online"
  pm2 jlist | jq -r '.[] | "    - " + .name + " (" + .pm2_env.status + ")"'
else
  bad "no PM2 process online"
fi

echo "== 7. app :3000"
code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/)
[ "$code" = "200" ] && ok "app -> $code" || bad "app -> $code"

echo "== 8. public HTTPS"
for host in "${DOMAIN}" "api.${DOMAIN}"; do
  code=$(curl -ks -o /dev/null -w "%{http_code}" "https://${host}/")
  [ "$code" -lt 500 ] 2>/dev/null && ok "https://${host} -> $code" || bad "https://${host} -> $code"
done

echo "== 9. studio access rule"
code=$(curl -ks -o /dev/null -w "%{http_code}" "https://studio.${DOMAIN}/")
case "$code" in
  401|403) ok "studio is gated (basic-auth/IP allowlist) -> $code" ;;
  200)     bad "studio is PUBLIC ($code) — add basic auth/IP allowlist in CloudPanel" ;;
  *)       bad "studio -> $code" ;;
esac

echo
echo "passed=$PASS  failed=$FAIL"

if [ "$FAIL" -gt 0 ] && command -v alert_send >/dev/null; then
  alert_send "🚨 healthcheck on $(hostname) — $FAIL failed:
- $(printf '%s\n- ' "${FAIL_LINES[@]}" | sed '$ d')"
fi
[ "$FAIL" -eq 0 ]
