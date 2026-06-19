#!/usr/bin/env bash
# Step 1 — Base packages on a fresh Ubuntu 22.04/24.04 LTS VPS.
# Run as root. Idempotent: safe to re-run.
set -euo pipefail

echo "==> apt update + base tools"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y install \
  curl git ca-certificates ufw jq openssl python3-pip \
  postgresql-client-common postgresql-client cron rsync unzip

echo "==> Node 20 + PM2"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get -y install nodejs
fi
npm i -g pm2

echo "==> Docker + compose plugin"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
apt-get -y install docker-compose-plugin

echo "==> Bun (system-wide)"
if ! command -v bun >/dev/null; then
  curl -fsSL https://bun.sh/install | bash
  install -m 0755 /root/.bun/bin/bun /usr/local/bin/bun
fi

echo "==> certbot (for Let's Encrypt automation)"
apt-get -y install certbot

echo "==> firewall"
ufw allow 22,80,443,8443/tcp || true
ufw deny 5432/tcp || true
ufw deny 8000/tcp || true
yes | ufw enable || true

echo "done."
