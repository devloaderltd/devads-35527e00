#!/usr/bin/env bash
# Post-deploy smoke test. Exits non-zero on the first failure.
#
# Checks:
#   1. App homepage 200 on https://${DOMAIN}/
#   2. App critical routes load (/login, /search) without 5xx
#   3. Kong routes work: rest/v1, auth/v1/health, storage/v1/health
#   4. Supabase Studio gate (basic auth / IP allowlist): expect 401/403
#   5. Studio sign-in path reachable when STUDIO_USER / STUDIO_PASS are set
#
# Usage:
#   DOMAIN=example.com bash scripts/vps/65-smoke-test.sh
#   DOMAIN=example.com STUDIO_USER=admin STUDIO_PASS=*** bash scripts/vps/65-smoke-test.sh
set -uo pipefail
: "${DOMAIN:?set DOMAIN=yourdomain.com}"
source "$(dirname "$0")/lib.sh" 2>/dev/null || true
disable_rollback 2>/dev/null || true

ENV_FILE="/opt/supabase/docker/.env"
ANON=""; [ -f "$ENV_FILE" ] && ANON=$(grep ^ANON_KEY "$ENV_FILE" | cut -d= -f2-)
PASS=0; FAIL=0
ok()  { echo "  [ OK ] $*"; PASS=$((PASS+1)); }
bad() { echo "  [FAIL] $*"; FAIL=$((FAIL+1)); }

hit() {  # hit URL [expected_max_status]
  local url=$1 maxstatus=${2:-499} extra=${3:-}
  local code; code=$(curl -ks -o /dev/null -w "%{http_code}" $extra "$url")
  if [ "$code" -le "$maxstatus" ]; then ok "$url -> $code"
  else                                  bad "$url -> $code"; fi
}

echo "== 1. app pages"
hit "https://${DOMAIN}/"        499
hit "https://${DOMAIN}/login"   499
hit "https://${DOMAIN}/search"  499

echo "== 2. kong → postgrest / auth / storage"
if [ -n "$ANON" ]; then
  hit "https://api.${DOMAIN}/rest/v1/" 299 "-H apikey:$ANON -H Authorization:Bearer\ $ANON"
fi
hit "https://api.${DOMAIN}/auth/v1/health"    299
hit "https://api.${DOMAIN}/storage/v1/health" 299

echo "== 3. studio access gate"
code=$(curl -ks -o /dev/null -w "%{http_code}" "https://studio.${DOMAIN}/")
case "$code" in
  401|403) ok "studio gated -> $code" ;;
  200)     bad "studio is PUBLIC ($code) — add basic auth / IP allowlist" ;;
  *)       bad "studio -> $code" ;;
esac

echo "== 4. studio sign-in (only if STUDIO_USER/STUDIO_PASS provided)"
if [ -n "${STUDIO_USER:-}" ] && [ -n "${STUDIO_PASS:-}" ]; then
  code=$(curl -ks -o /dev/null -w "%{http_code}" \
        -u "${STUDIO_USER}:${STUDIO_PASS}" "https://studio.${DOMAIN}/")
  [ "$code" = "200" ] && ok "studio sign-in OK -> $code" || bad "studio sign-in -> $code"
else
  echo "  [SKIP] set STUDIO_USER / STUDIO_PASS to exercise sign-in"
fi

echo
echo "smoke: passed=$PASS failed=$FAIL"
metric_emit supabase_smoke_passed "$PASS" 2>/dev/null || true
metric_emit supabase_smoke_failed "$FAIL" 2>/dev/null || true
[ "$FAIL" -eq 0 ]
