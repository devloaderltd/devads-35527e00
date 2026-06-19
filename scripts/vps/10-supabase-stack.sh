#!/usr/bin/env bash
# Step 2 — Bring up the self-hosted Supabase docker stack and generate keys.
# Usage:
#   DOMAIN=example.com bash scripts/vps/10-supabase-stack.sh
set -euo pipefail
: "${DOMAIN:?set DOMAIN=yourdomain.com}"
SUPA_DIR="/opt/supabase/docker"
CRED_FILE="/root/supabase-credentials.txt"

mkdir -p /opt && cd /opt
[ -d supabase ] || git clone --depth 1 https://github.com/supabase/supabase
cd "$SUPA_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  PG_PW=$(openssl rand -hex 24)
  DASH_PW=$(openssl rand -hex 12)
  JWT_SECRET=$(openssl rand -hex 32)
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

  umask 077
  cat > "$CRED_FILE" <<EOF
== Supabase self-host credentials for ${DOMAIN} ==
Postgres password : ${PG_PW}
JWT secret        : ${JWT_SECRET}
ANON_KEY          : ${ANON_KEY}
SERVICE_ROLE_KEY  : ${SERVICE_KEY}
Studio user       : supabase
Studio password   : ${DASH_PW}
DATABASE_URL      : postgres://postgres:${PG_PW}@localhost:5432/postgres
EOF
  echo "    credentials -> $CRED_FILE"
fi

docker compose pull
docker compose up -d
echo "    waiting for kong:8000 ..."
for i in {1..60}; do curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1 && break; sleep 3; done
echo "done."
