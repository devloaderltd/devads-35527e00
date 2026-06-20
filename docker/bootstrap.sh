#!/usr/bin/env bash
# =============================================================================
# bootstrap.sh — one-click Docker stack: Caddy + auto-SSL + Supabase + app.
#
# Requires: fresh Ubuntu 22.04/24.04 LTS, root or sudo, ports 80/443 free.
#
# Usage:
#   sudo APP_DOMAIN=callescort24.org ACME_EMAIL=you@example.com \
#        bash docker/bootstrap.sh
#
# Optional env:
#   STUDIO_PASSWORD=<plain text>   # auto-generated if unset
#   SKIP_INSTALL=1                 # don't apt-install docker (already present)
# =============================================================================
set -euo pipefail
: "${APP_DOMAIN:?set APP_DOMAIN=yourdomain.com}"
: "${ACME_EMAIL:?set ACME_EMAIL=you@yourdomain.com}"

HERE="$(cd "$(dirname "$0")" && pwd)"
SUPA_DIR="/opt/supabase/docker"

# ── 1. Host packages ─────────────────────────────────────────────────────────
if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo "==> installing docker + compose plugin"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg git ufw apache2-utils
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# ── 2. Firewall ──────────────────────────────────────────────────────────────
echo "==> ufw: open 22, 80, 443"
ufw allow 22/tcp || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

# ── 3. Clone Supabase self-host repo ─────────────────────────────────────────
if [ ! -d "$SUPA_DIR" ]; then
  echo "==> cloning supabase self-host"
  mkdir -p /opt
  git clone --depth 1 https://github.com/supabase/supabase /opt/supabase
fi
cd "$SUPA_DIR"

# ── 4. Generate Supabase secrets on first run ────────────────────────────────
if [ ! -f .env ]; then
  echo "==> generating Supabase secrets"
  cp .env.example .env
  PG_PW=$(openssl rand -hex 24)
  DASH_PW=$(openssl rand -hex 12)
  JWT_SECRET=$(openssl rand -hex 32)
  IAT=$(date +%s); EXP=$((IAT + 60*60*24*365*10))
  b64() { python3 -c "import base64,sys;sys.stdout.write(base64.urlsafe_b64encode(sys.stdin.buffer.read()).rstrip(b'=').decode())"; }
  mkjwt() {
    local role="$1"
    local hdr; hdr=$(printf '{"alg":"HS256","typ":"JWT"}' | b64)
    local pl;  pl=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$IAT" "$EXP" | b64)
    local sig; sig=$(printf '%s.%s' "$hdr" "$pl" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64)
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
    -e "s|^SITE_URL=.*|SITE_URL=https://${APP_DOMAIN}|" \
    -e "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://api.${APP_DOMAIN}|" \
    -e "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://api.${APP_DOMAIN}|" \
    .env

  # Don't bind Kong/Studio to the host — Caddy reaches them via the docker network.
  for k in KONG_HTTP_PORT KONG_HTTPS_PORT STUDIO_PORT; do
    sed -i "/^${k}=/d" .env
  done

  umask 077
  cat > /root/supabase-credentials.txt <<EOF
== Supabase self-host credentials for ${APP_DOMAIN} ==
Postgres password : ${PG_PW}
JWT secret        : ${JWT_SECRET}
ANON_KEY          : ${ANON_KEY}
SERVICE_ROLE_KEY  : ${SERVICE_KEY}
Studio user       : supabase
Studio password   : ${DASH_PW}
DATABASE_URL      : postgres://postgres:${PG_PW}@localhost:5432/postgres
EOF
  chmod 600 /root/supabase-credentials.txt
  echo "    credentials -> /root/supabase-credentials.txt"
fi

# ── 5. Patch Supabase compose to NOT publish backend ports to host ───────────
# (Caddy is the only public entrypoint. Kong/Studio/DB/Pooler stay reachable
#  only on the internal docker network.)
COMPOSE_FILE="${SUPA_DIR}/docker-compose.yml"
if [ -f "$COMPOSE_FILE" ]; then
  echo "==> removing Supabase host port publishing"
  # PyYAML ships with Ubuntu's python3; install on the off-chance it doesn't.
  python3 -c "import yaml" 2>/dev/null || apt-get install -y python3-yaml >/dev/null
  python3 - "$COMPOSE_FILE" <<'PY'
import sys, yaml

p = sys.argv[1]
with open(p) as f:
    doc = yaml.safe_load(f) or {}

# Caddy is the only public entrypoint. Docker service discovery still works
# without host-published ports, and this also repairs earlier failed patches
# that left entries such as `ports:` / `ports: null` behind.
for svc in (doc.get('services') or {}).values():
    if isinstance(svc, dict):
        svc.pop('ports', None)

with open(p, 'w') as f:
    yaml.safe_dump(doc, f, sort_keys=False)
PY
fi

# ── 6. Pull Supabase images + bring up DB ────────────────────────────────────
echo "==> pulling Supabase images"
docker compose pull
echo "==> starting Supabase stack"
docker compose up -d

# Wait for kong on internal network (via docker inspect)
echo "==> waiting for kong to be reachable on docker network..."
for i in {1..30}; do
  if docker compose exec -T kong sh -c 'wget -qO- http://127.0.0.1:8000/ >/dev/null 2>&1'; then
    echo "    kong up"; break
  fi
  sleep 2
done

# ── 7. Wire app stack env ────────────────────────────────────────────────────
ANON_KEY=$(grep ^ANON_KEY        "$SUPA_DIR/.env" | cut -d= -f2-)
SRV_KEY=$( grep ^SERVICE_ROLE_KEY "$SUPA_DIR/.env" | cut -d= -f2-)

STUDIO_USER="${STUDIO_BASIC_AUTH_USER:-admin}"
STUDIO_PW="${STUDIO_PASSWORD:-$(openssl rand -hex 12)}"
# Caddy expects bcrypt; htpasswd from apache2-utils generates it.
STUDIO_HASH=$(htpasswd -nbB "$STUDIO_USER" "$STUDIO_PW" | cut -d: -f2)
# Docker Compose interpolates $VAR patterns in .env values, while bcrypt hashes
# contain $ separators. Escape them so hashes like $2y$... stay intact.
STUDIO_HASH_ESCAPED=$(printf '%s' "$STUDIO_HASH" | sed 's/\$/$$/g')

cat > "$HERE/.env" <<EOF
APP_DOMAIN=${APP_DOMAIN}
ACME_EMAIL=${ACME_EMAIL}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SRV_KEY}
STUDIO_BASIC_AUTH_USER=${STUDIO_USER}
STUDIO_BASIC_AUTH_HASH=${STUDIO_HASH_ESCAPED}
EOF
chmod 600 "$HERE/.env"

cat >> /root/supabase-credentials.txt <<EOF

== Studio basic-auth (Caddy) ==
URL      : https://studio.${APP_DOMAIN}
Username : ${STUDIO_USER}
Password : ${STUDIO_PW}
EOF

# ── 8. Build + run the app stack ────────────────────────────────────────────
echo "==> building and starting app + Caddy"
cd "$HERE"
docker compose --env-file .env build app
docker compose --env-file .env up -d

# ── 9. Done ─────────────────────────────────────────────────────────────────
cat <<EOF

============================ STACK UP ============================
App        : https://${APP_DOMAIN}
API (Kong) : https://api.${APP_DOMAIN}
Studio     : https://studio.${APP_DOMAIN}   (user: ${STUDIO_USER})

All credentials saved to: /root/supabase-credentials.txt
                          chmod 600 — back it up off-server!

DNS A records required (point at this VPS public IP):
  ${APP_DOMAIN}
  api.${APP_DOMAIN}
  studio.${APP_DOMAIN}

Caddy will obtain Let's Encrypt certs automatically on first request.
==================================================================
EOF
