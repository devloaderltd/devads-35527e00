#!/usr/bin/env bash
# Step 3 — Create the three CloudPanel sites via the `clpctl` CLI.
# CloudPanel ships clpctl out of the box — no API key needed.
# Docs: https://www.cloudpanel.io/docs/v2/cloudpanel-cli/
#
# Usage:
#   DOMAIN=example.com APP_USER=callescort bash scripts/vps/20-cloudpanel-sites.sh
set -euo pipefail
: "${DOMAIN:?set DOMAIN=yourdomain.com}"
APP_USER="${APP_USER:-callescort}"

# Random site-user password (CloudPanel requires one; we never need to log in as them)
gen_pw() { openssl rand -base64 18 | tr -d '/+=' | cut -c1-20; }

ensure_node_site() {
  local domain="$1" port="$2" user="$3"
  if clpctl site:list 2>/dev/null | grep -q " $domain "; then
    echo "    site $domain already exists, skipping create"
    return
  fi
  clpctl site:add:nodejs \
    --domainName="$domain" \
    --nodejsVersion=20 \
    --appPort="$port" \
    --siteUser="$user" \
    --siteUserPassword="$(gen_pw)"
}

ensure_proxy_site() {
  local domain="$1" target="$2" user="$3"
  if clpctl site:list 2>/dev/null | grep -q " $domain "; then
    echo "    site $domain already exists, skipping create"
    return
  fi
  clpctl site:add:reverse-proxy \
    --domainName="$domain" \
    --reverseProxyUrl="$target" \
    --siteUser="$user" \
    --siteUserPassword="$(gen_pw)"
}

echo "==> app site (Node)   ${DOMAIN}            -> 127.0.0.1:3000"
ensure_node_site "${DOMAIN}" 3000 "${APP_USER}"

echo "==> api site (proxy)  api.${DOMAIN}        -> 127.0.0.1:8000"
ensure_proxy_site "api.${DOMAIN}"    "http://127.0.0.1:8000" "${APP_USER}-api"

echo "==> studio site (proxy) studio.${DOMAIN}   -> 127.0.0.1:3000  (Supabase Studio container)"
ensure_proxy_site "studio.${DOMAIN}" "http://127.0.0.1:3000" "${APP_USER}-studio"

echo "done. issue SSL with 30-ssl.sh next."
