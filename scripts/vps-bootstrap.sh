#!/usr/bin/env bash
# VPS bootstrap — Docker + Supabase self-host + Node/Bun/PM2 for this project.
# Run as root on a FRESH Ubuntu 22.04/24.04 server AFTER CloudPanel is installed.
# Companion guide: DEPLOY_VPS_DOCKER.md
#
# Usage:
#   sudo DOMAIN=yourdomain.com REPO=git@github.com:you/app.git \
#        bash scripts/vps-bootstrap.sh
#
# What it does:
#   1. installs Docker, Node 20, Bun, PM2
#   2. clones supabase/supabase, writes .env with generated secrets,
#      starts the docker compose stack
#   3. clones THIS repo into /home/callescort/htdocs/$DOMAIN, builds it
#   4. writes the project's .env wired to the local Supabase
#   5. starts the app under PM2
#
# What you STILL do by hand afterwards:
#   - create the 3 CloudPanel sites + Let's Encrypt (UI only)
#   - import your existing data (psql + restore-pg-v2.mjs)
#   - enable Google OAuth provider in Studio if you use it
set -euo pipefail

: "${DOMAIN:?set DOMAIN=yourdomain.com}"
: "${REPO:?set REPO=<git url of this project>}"
APP_USER="${APP_USER:-callescort}"
APP_DIR="/home/${APP_USER}/htdocs/${DOMAIN}"
SUPA_DIR="/opt/supabase/docker"

echo "==> 1/6 base packages"
apt update
DEBIAN_FRONTEND=noninteractive apt -y install curl git ca-certificates ufw jq openssl python3-pip
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
npm i -g pm2

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
apt -y install docker-compose-plugin

id -u "$APP_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$APP_USER"
sudo -u "$APP_USER" bash -lc 'command -v bun >/dev/null || curl -fsSL https://bun.sh/install | bash'

echo "==> 2/6 firewall"
ufw allow 22,80,443,8443/tcp || true
ufw deny 5432/tcp || true
ufw deny 8000/tcp || true
yes | ufw enable || true

echo "==> 3/6 supabase stack"
mkdir -p /opt && cd /opt
[ -d supabase ] || git clone --depth 1 https://github.com/supabase/supabase
cd "$SUPA_DIR"
if [ ! -f .env ]; then
  cp .env.example .env

  PG_PW=$(openssl rand -hex 24)
  DASH_PW=$(openssl rand -hex 12)
  JWT_SECRET=$(openssl rand -hex 32)

  # JWT keys (HS256). Roles must match Supabase defaults: anon + service_role.
  IAT=$(date +%s); EXP=$((IAT + 60*60*24*365*10))
  b64() { python3 -c "import base64,sys;sys.stdout.write(base64.urlsafe_b64encode(sys.stdin.buffer.read()).rstrip(b'=').decode())"; }
  mkjwt() {
    local role="$1"
    local hdr=$(printf '{"alg":"HS256","typ":"JWT"}' | b64)
    local pl=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$IAT" "$EXP" | b64)
    local sig=$(printf '%s.%s' "$hdr" "$pl" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64)
    printf '%s.%s.%s' "$hdr" "$pl" "$sig"
  }
  ANON_KEY=$(mkjwt anon)
  SERVICE_KEY=$(mkjwt service_role)

  sed -i \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PW}|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" \
    -e "s|^ANON_KEY=.*|ANON_KEY=${ANON_KEY}|" \
    -e "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_KEY}|" \
    -e "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=${DASH_PW}|" \
    -e "s|^SITE_URL=.*|SITE_URL=https://${DOMAIN}|" \
    -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://api.${DOMAIN}|" \
    -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://api.${DOMAIN}|" \
    .env

  cat > /root/supabase-credentials.txt <<EOF
== Supabase self-host credentials for ${DOMAIN} ==
Postgres password : ${PG_PW}
JWT secret        : ${JWT_SECRET}
ANON_KEY          : ${ANON_KEY}
SERVICE_ROLE_KEY  : ${SERVICE_KEY}
Studio user       : admin
Studio password   : ${DASH_PW}
EOF
  chmod 600 /root/supabase-credentials.txt
  echo "    saved -> /root/supabase-credentials.txt"
fi
docker compose pull
docker compose up -d
echo "    waiting for kong:8000 ..."
for i in {1..40}; do curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1 && break; sleep 3; done

echo "==> 4/6 clone + build app"
install -d -o "$APP_USER" -g "$APP_USER" "$(dirname "$APP_DIR")"
sudo -u "$APP_USER" bash -lc "
  export PATH=\"\$HOME/.bun/bin:\$PATH\"
  if [ ! -d '$APP_DIR/.git' ]; then
    git clone '$REPO' '$APP_DIR'
  else
    cd '$APP_DIR' && git pull
  fi
  cd '$APP_DIR' && bun install
"

echo "==> 5/6 write app .env"
ANON_KEY=$(grep ^ANON_KEY "$SUPA_DIR/.env" | cut -d= -f2-)
SERVICE_KEY=$(grep ^SERVICE_ROLE_KEY "$SUPA_DIR/.env" | cut -d= -f2-)
install -o "$APP_USER" -g "$APP_USER" -m 600 /dev/null "$APP_DIR/.env"
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

SUPABASE_URL=https://api.${DOMAIN}
SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
VITE_SUPABASE_URL=https://api.${DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=local

# Fill in before going live:
PLISIO_API_KEY=
DB_BACKUP_TOKEN=$(openssl rand -hex 16)
CRON_TRIGGER_SECRET=$(openssl rand -hex 16)
LOVABLE_API_KEY=
VITE_PAYMENTS_CLIENT_TOKEN=
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"

sudo -u "$APP_USER" bash -lc "
  export PATH=\"\$HOME/.bun/bin:\$PATH\"
  cd '$APP_DIR' && BUILD_TARGET=node bun run build
"

echo "==> 6/6 start under PM2"
sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && pm2 start ecosystem.config.cjs && pm2 save"
env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "/home/${APP_USER}" | tail -1 | bash || true

cat <<EOF

================================================================
DONE. Next, in the CloudPanel UI (https://SERVER_IP:8443):

  1) Sites > Add Site > Node.js Site
       Domain: ${DOMAIN}   App Port: 3000   User: ${APP_USER}
       SSL/TLS > New Let's Encrypt Certificate

  2) Sites > Add Site > Reverse Proxy
       Domain: api.${DOMAIN}   Target: http://127.0.0.1:8000
       SSL/TLS > New Let's Encrypt Certificate

  3) Sites > Add Site > Reverse Proxy
       Domain: studio.${DOMAIN}   Target: http://127.0.0.1:3000
       SSL/TLS > New Let's Encrypt Certificate
       Security > Basic Auth (admin / see /root/supabase-credentials.txt)
       Security > IP allowlist (your IP only)

Then restore your data:
  export DATABASE_URL='postgres://postgres:<pg-pw>@localhost:5432/postgres'
  for f in ${APP_DIR}/supabase/migrations/*.sql; do psql "\$DATABASE_URL" -f "\$f"; done
  node ${APP_DIR}/restore-pg-v2.mjs /tmp/db-backup/
  psql "\$DATABASE_URL" -f ${APP_DIR}/fix-grants.sql
  psql "\$DATABASE_URL" -c "NOTIFY pgrst, 'reload schema';"

Credentials -> /root/supabase-credentials.txt
================================================================
EOF
