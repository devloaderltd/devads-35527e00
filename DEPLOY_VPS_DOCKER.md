# Full VPS Deployment — Docker + CloudPanel + Self-Hosted Supabase

End-to-end guide to run **this project** (TanStack Start + PM2) with
**self-hosted Supabase (Docker)** behind **CloudPanel + Nginx + Let's Encrypt**.

Tested on Ubuntu 22.04 / 24.04 LTS. ~30–45 minutes if DNS is ready.

> A scripted version of steps 2–6 lives in `scripts/vps-bootstrap.sh`.
> Read it before running — it is opinionated and assumes a fresh server.

---

## 0. Before you start

| Need | Value |
|---|---|
| VPS | 4 vCPU / 8 GB RAM / 80 GB SSD (Ubuntu 22.04+) |
| Domains | `yourdomain.com`, `api.yourdomain.com`, `studio.yourdomain.com` — A records → VPS IP, propagated (`dig yourdomain.com`) |
| Repo | Git URL of this project (SSH or HTTPS) |
| Secrets | Plisio API key, SMTP creds, Google OAuth client id/secret (if using Google sign-in) |
| Open ports | 22, 80, 443, 8443 (CloudPanel UI) |

---

## 1. Install CloudPanel

SSH as `root`:

```bash
apt update && apt -y upgrade
curl -sSL https://installer.cloudpanel.io/ce/v2/install.sh -o install.sh
bash install.sh
```

Open `https://YOUR_SERVER_IP:8443` → create admin user.

---

## 2. Install Docker, Node 20, Bun, PM2

```bash
curl -fsSL https://get.docker.com | sh
apt -y install docker-compose-plugin
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs
npm i -g pm2
su - clp -c 'curl -fsSL https://bun.sh/install | bash'
```

---

## 3. Self-host Supabase (Docker)

```bash
mkdir -p /opt && cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

### Generate keys

Generate `JWT_SECRET` (≥32 chars random) and matching `ANON_KEY` + `SERVICE_ROLE_KEY`:
https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

Edit `/opt/supabase/docker/.env` — set **every** secret:

```env
POSTGRES_PASSWORD=<random-32>
JWT_SECRET=<random-≥32>
ANON_KEY=<from generator>
SERVICE_ROLE_KEY=<from generator>

DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<strong>

SITE_URL=https://yourdomain.com
ADDITIONAL_REDIRECT_URLS=https://yourdomain.com/auth/callback
API_EXTERNAL_URL=https://api.yourdomain.com
SUPABASE_PUBLIC_URL=https://api.yourdomain.com

# SMTP (your project sends mail via SMTP)
SMTP_ADMIN_EMAIL=noreply@yourdomain.com
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_SENDER_NAME="CallEscort24"

# Optional but recommended
DISABLE_SIGNUP=false
ENABLE_EMAIL_AUTOCONFIRM=false
```

### Start the stack

```bash
docker compose pull
docker compose up -d
docker compose ps      # all services must be "healthy"
```

Internal ports now listening on `127.0.0.1`:
- **8000** → Kong (REST + Auth + Storage + Realtime gateway)
- **3000** → Supabase Studio (admin UI)
- **5432** → Postgres (do **not** expose publicly)

### Restore your schema + data

Dump from the existing Lovable Cloud DB on your laptop:

```bash
SOURCE_DB_URL='postgres://...' ./scripts/db-dump.sh
scp -r ./db-backup root@VPS:/tmp/
```

On the VPS:

```bash
export DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

# 1. Apply project migrations (creates extensions + grants)
cd /opt && git clone <YOUR_REPO_URL> app-src
cd app-src
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# 2. Load data
node restore-pg-v2.mjs /tmp/db-backup/

# 3. Re-apply grants and tell PostgREST to reload
psql "$DATABASE_URL" -f fix-grants.sql
psql "$DATABASE_URL" -c "NOTIFY pgrst, 'reload schema';"
```

For `auth.users`, import `/tmp/db-backup/auth_users.csv` directly — GoTrue
accepts the existing `encrypted_password` hashes, so users log in with their
old passwords. Google-OAuth users only need the Google provider enabled on
the new Supabase.

---

## 4. CloudPanel — three sites

In the CloudPanel UI:

### 4a. Main app — `yourdomain.com`
**Sites → Add Site → Node.js Site**
- Domain: `yourdomain.com` (add `www` too)
- Node version: **20**
- App Port: **3000**
- App User: `callescort` (auto-created → `/home/callescort/htdocs/yourdomain.com/`)
- SSL/TLS tab → **New Let's Encrypt Certificate**

### 4b. Supabase API — `api.yourdomain.com`
**Sites → Add Site → Reverse Proxy**
- Domain: `api.yourdomain.com`
- Target: `http://127.0.0.1:8000`
- SSL → Let's Encrypt

### 4c. Supabase Studio — `studio.yourdomain.com`
**Sites → Add Site → Reverse Proxy**
- Domain: `studio.yourdomain.com`
- Target: `http://127.0.0.1:3000`
- SSL → Let's Encrypt
- **Security → Basic Auth** (use `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`)
- **Security → IP allowlist** (your office/home IP only)

---

## 5. Deploy this project

```bash
sudo su - callescort
cd ~/htdocs/yourdomain.com
git clone <YOUR_REPO_URL> .
export PATH="$HOME/.bun/bin:$PATH"
bun install
BUILD_TARGET=node bun run build
```

Create `.env` in the same folder:

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

SUPABASE_URL=https://api.yourdomain.com
SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from /opt/supabase/docker/.env>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
VITE_SUPABASE_URL=https://api.yourdomain.com
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
VITE_SUPABASE_PROJECT_ID=local

PLISIO_API_KEY=<your>
DB_BACKUP_TOKEN=<random>
CRON_TRIGGER_SECRET=<random>
LOVABLE_API_KEY=<if used for AI gateway>
VITE_PAYMENTS_CLIENT_TOKEN=<your publishable token>
```

> `VITE_*` vars are baked at build time — change them, then **rebuild**.

Start with PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
exit
env PATH=$PATH:/usr/bin pm2 startup systemd -u callescort --hp /home/callescort
# run the sudo line it prints
```

Verify: `pm2 logs callescort` and `curl -I http://127.0.0.1:3000` → `200`.

---

## 6. Firewall, backups, cron

```bash
ufw allow 22,80,443,8443/tcp
ufw deny 5432,8000/tcp
ufw enable
```

Daily DB dump — `/etc/cron.daily/supabase-dump`:

```bash
#!/usr/bin/env bash
set -e
docker exec supabase-db pg_dump -U postgres postgres | gzip > /var/backups/db-$(date +\%F).sql.gz
find /var/backups -name 'db-*.sql.gz' -mtime +14 -delete
```

`chmod +x /etc/cron.daily/supabase-dump`. Also enable CloudPanel's
**Backups → Remote** (S3/Backblaze) for `/opt/supabase/docker/volumes` and
`/home/callescort/htdocs`.

---

## 7. Updating

### App
```bash
sudo su - callescort
cd ~/htdocs/yourdomain.com
git pull && bun install && BUILD_TARGET=node bun run build
pm2 restart callescort
```

### Supabase
```bash
cd /opt/supabase/docker
docker compose pull && docker compose up -d
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` on yourdomain.com | `pm2 logs callescort` — app crashed on boot; usually wrong env var |
| `Unauthorized: No authorization header` on serverFn | `SUPABASE_PUBLISHABLE_KEY` in `.env` must equal Supabase `ANON_KEY` exactly |
| `permission denied for table X` | `psql -f fix-grants.sql && psql -c "NOTIFY pgrst, 'reload schema';"` |
| `Expected 3 parts in JWT; got 1` | Wrong key format — only use the JWT-shaped `ANON_KEY` / `SERVICE_ROLE_KEY` generated by the Supabase script, not Lovable Cloud's `sb_*` keys |
| Google sign-in `Unsupported provider` | Enable Google in Studio → Authentication → Providers, set client id/secret |
| SSL fails | DNS not propagated — `dig yourdomain.com +short` must return VPS IP |
| Out of memory | `fallocate -l 4G /swap && mkswap /swap && swapon /swap && echo '/swap none swap sw 0 0' >> /etc/fstab` |
| Realtime not delivering | `docker logs supabase-realtime` — needs `wal_level=logical` (already set in stock compose) |

---

## 9. What lives where

```
/opt/supabase/docker/        # Supabase compose + .env + volumes/
/opt/supabase/docker/volumes/db/data/    # Postgres data
/opt/supabase/docker/volumes/storage/    # uploaded files (listing-images, kyc, etc.)
/home/callescort/htdocs/yourdomain.com/  # this app
  ├── dist/server/server.js   # SSR bundle (BUILD_TARGET=node output)
  ├── dist/client/            # static assets
  ├── scripts/vps-server.mjs  # Node launcher PM2 boots
  └── ecosystem.config.cjs    # PM2 config
/var/backups/db-*.sql.gz      # nightly dumps
```

You're live: `https://yourdomain.com`. Studio: `https://studio.yourdomain.com`.
