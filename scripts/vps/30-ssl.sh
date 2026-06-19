#!/usr/bin/env bash
# Step 4 — Issue Let's Encrypt certificates for all 3 subdomains via clpctl.
# CloudPanel manages the cert + nginx reload itself; certbot is fallback only.
#
# Usage: DOMAIN=example.com EMAIL=you@example.com bash scripts/vps/30-ssl.sh
set -euo pipefail
: "${DOMAIN:?set DOMAIN=yourdomain.com}"
: "${EMAIL:?set EMAIL=you@example.com}"

issue() {
  local d="$1"
  echo "==> issuing cert for $d"
  if clpctl lets-encrypt:install:certificate --domainName="$d" 2>&1 | tee /tmp/le-$d.log; then
    echo "    ok"
  else
    echo "    clpctl failed, trying certbot --nginx fallback"
    certbot --nginx -d "$d" -m "$EMAIL" --agree-tos -n || \
      echo "    !! cert for $d failed — check DNS A record points at this server"
  fi
}

issue "${DOMAIN}"
issue "api.${DOMAIN}"
issue "studio.${DOMAIN}"

# Auto-renew: certbot installs its own systemd timer; clpctl renews from its cron.
# Verify timer present:
systemctl list-timers 2>/dev/null | grep -E 'certbot|cloudpanel' || true
echo "done."
