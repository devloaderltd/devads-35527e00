# Full VPS Deployment Guide — CallEscort24

**Stack:** Ubuntu 22.04/24.04 LTS + **CloudPanel** + Node 20 + Bun + PM2 + Nginx (managed by CloudPanel) + Let's Encrypt + self-hosted **Supabase** (Docker).

> **Why CloudPanel?** Free, lightweight (works on 1 vCPU / 2 GB RAM), has native **Node.js site** + **Reverse Proxy** templates, built-in Let's Encrypt, firewall, and a clean UI. Better fit for a Node + Supabase project than cPanel (PHP-focused, paid) or Plesk (heavier, paid). Alternatives if you don't want CloudPanel: **Coolify** (full PaaS, Docker-native, also great) or **aaPanel** (free, more PHP-leaning).

---

## 0. Server requirements

| Component | Minimum | Recommended |
|---|---|---|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| RAM | 4 GB | 8 GB (Supabase + app) |
| CPU | 2 vCPU | 4 vCPU |
| Disk | 40 GB SSD | 80 GB SSD |
| Ports open | 22, 80, 443 | + 8000 (Supabase Studio, firewalled) |

Point your domain's **A record** to the VPS IP **before** issuing SSL.

---

## 1. Install CloudPanel

SSH in as root:

```bash
apt update && apt -y upgrade
curl -sSL https://installer.cloudpanel.io/ce/v2/install.sh -o install.sh
echo "<official checksum from cloudpanel.io>" install.sh | sha256sum -c -
bash install.sh
```

Access: `https://YOUR_SERVER_IP:8443` → create admin user.

---

## 2. Install Node 20, Bun, PM2, Docker

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt -y install nodejs

# Bun (per-user)
su - clp -c 'curl -fsSL https://bun.sh/install | bash'

# PM2 (global)
npm i -g pm2

# Docker + compose (for self-hosted Supabase)
curl -fsSL https://get.docker.com | sh
apt -y install docker-compose-plugin
```

---

## 3. Self-host Supabase

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

Edit `/opt/supabase/docker/.env` — **change every secret**:

```env
POSTGRES_PASSWORD=<strong-random>
JWT_SECRET=<>=32 chars>
ANON_KEY=<generate via https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys>
SERVICE_ROLE_KEY=<generate same way>
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<strong>
SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=https://api.yourdomain.com
```

Start:

```bash
docker compose pull
docker compose up -d
```

Verify: `docker compose ps` — all services healthy.

### 3a. Restore your backup

You already have `restore-pg-v2.mjs` and the JSON backup. Apply migrations + data:

```bash
export DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"
export SUPABASE_URL="http://localhost:8000"
export SUPABASE_SERVICE_ROLE_KEY="<from .env>"

# 1. Schema
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# 2. Data
node restore-pg-v2.mjs ./db-backup-*.json

# 3. Grants (the file you already have)
psql "$DATABASE_URL" -f fix-grants.sql
```

---

## 4. Create the app site in CloudPanel

CloudPanel UI → **Sites → Add Site → Node.js Site**:

- Domain: `yourdomain.com`
- Node version: 20
- App Port: `3000`
- App User: `callescort` (auto-created)

This gives you `/home/callescort/htdocs/yourdomain.com/`.

---

## 5. Deploy the code

SSH as the site user:

```bash
sudo su - callescort
cd ~/htdocs/yourdomain.com
git clone <YOUR_REPO_URL> .
export PATH="$HOME/.bun/bin:$PATH"
bun install
bun run build         # Cloudflare default
# OR for Node SSR bundle (recommended for VPS):
BUILD_TARGET=node bun run build
```

### Create `.env` (same folder)

```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

SUPABASE_URL=https://api.yourdomain.com
SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from supabase/.env>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from supabase/.env>
VITE_SUPABASE_URL=https://api.yourdomain.com
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
VITE_SUPABASE_PROJECT_ID=local

PLISIO_API_KEY=<your key>
DB_BACKUP_TOKEN=<random>
CRON_TRIGGER_SECRET=<random>
LOVABLE_API_KEY=<if used>
VITE_PAYMENTS_CLIENT_TOKEN=<your publishable token>
```

> **Important:** `VITE_*` vars are baked at build time. If you change them, **rebuild**.

---

## 6. Start with PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
exit                    # back to root
env PATH=$PATH:/usr/bin pm2 startup systemd -u callescort --hp /home/callescort
# run the sudo line it prints
```

Check: `pm2 logs callescort` and `curl http://localhost:3000`.

---

## 7. SSL & reverse proxy

CloudPanel does this automatically for Node sites:
- **SSL/TLS tab → New Let's Encrypt Certificate** → tick `www` too.
- Reverse proxy to `127.0.0.1:3000` is already configured.

For the Supabase API, add a **second site** in CloudPanel:
- **Add Site → Reverse Proxy**, Domain: `api.yourdomain.com`, Target: `http://127.0.0.1:8000`
- Issue Let's Encrypt cert.

For Supabase Studio (`studio.yourdomain.com` → `127.0.0.1:3001`), **restrict by IP** in CloudPanel's Basic Auth / IP allowlist.

---

## 8. Firewall

CloudPanel uses `ufw`:

```bash
ufw allow 22,80,443/tcp
ufw deny 5432/tcp        # Postgres not public
ufw deny 8000/tcp        # only via Nginx
ufw enable
```

---

## 9. Backups

CloudPanel → **Backups** tab: enable daily snapshot to remote (S3 / Backblaze).
Additionally, daily DB dump:

```bash
# /etc/cron.daily/supabase-dump
docker exec supabase-db pg_dump -U postgres postgres | gzip > /var/backups/db-$(date +\%F).sql.gz
find /var/backups -name 'db-*.sql.gz' -mtime +14 -delete
```

---

## 10. Updating

```bash
sudo su - callescort
cd ~/htdocs/yourdomain.com
git pull
bun install
BUILD_TARGET=node bun run build
pm2 restart callescort
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| 502 from Nginx | `pm2 logs callescort` — app likely crashed on boot; check `.env` |
| `permission denied for table X` | re-run `psql -f fix-grants.sql` and `NOTIFY pgrst, 'reload schema';` |
| `Unauthorized` on serverFn | wrong `SUPABASE_PUBLISHABLE_KEY` — must match Supabase `.env` `ANON_KEY` |
| SSL fails | DNS A record not propagated yet; `dig yourdomain.com` first |
| Out of memory | add swap: `fallocate -l 4G /swap && mkswap /swap && swapon /swap` |

---

**You're live.** Visit `https://yourdomain.com`, log in with the admin user you restored from backup.
