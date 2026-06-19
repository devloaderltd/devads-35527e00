# Full VPS Deployment — Ubuntu LTS + CloudPanel + Self-Hosted Supabase

End-to-end, scripted deployment. Every step is automated by a script in
`scripts/vps/`. You can run them one at a time (recommended the first time so
you understand each phase) or in one shot via `deploy.sh`.

---

## 0. What you need before starting

1. **VPS**: Ubuntu **22.04 LTS** or **24.04 LTS**, 4 vCPU / 8 GB RAM / 80 GB SSD, root SSH.
2. **CloudPanel already installed** on it (one-liner from cloudpanel.io). The
   scripts use the bundled `clpctl` CLI — no API key needed.
3. **DNS A records pointing to the VPS public IP** for all three:
   - `yourdomain.com`
   - `api.yourdomain.com`
   - `studio.yourdomain.com`
   Wait until `dig +short yourdomain.com` returns the VPS IP before issuing SSL.
4. **Git URL** of this project (SSH key on the VPS or HTTPS+token).
5. **Optional**: an existing `pg_dump` file you want to restore (`.dump`, `.sql`, or `.sql.gz`).

---

## 1. Copy the scripts to the VPS

```bash
ssh root@your-vps-ip
git clone <this repo> /root/app-src
cd /root/app-src
chmod +x scripts/vps/*.sh
```

---

## 2. One-command deploy (the easy path)

```bash
sudo DOMAIN=yourdomain.com \
     EMAIL=you@yourdomain.com \
     REPO=git@github.com:you/your-app.git \
     APP_USER=callescort \
     DUMP_FILE=/root/backups/old-prod.dump \   # optional
     bash scripts/vps/deploy.sh
```

That single command runs everything below. Skip to §10 to see what was set up.
If you'd rather run each phase yourself (recommended first time) keep reading.

---

## 3. Step 1 — base packages, firewall, Docker, Node, Bun, PM2, certbot

```bash
sudo bash scripts/vps/00-install.sh
```

Installs Docker + compose, Node 20, Bun, PM2, certbot, ufw. Opens
22/80/443/8443 and blocks the raw Postgres (5432) and Kong (8000) ports —
the public must reach those only through CloudPanel + HTTPS.

---

## 4. Step 2 — bring up the self-hosted Supabase stack

```bash
sudo DOMAIN=yourdomain.com bash scripts/vps/10-supabase-stack.sh
```

What it does:

- Clones `supabase/supabase` into `/opt/supabase`.
- Generates a 32-byte `JWT_SECRET` and signs **HS256** `ANON_KEY` /
  `SERVICE_ROLE_KEY` from it (these must come from one secret — that's why we
  can't use Lovable Cloud's `sb_*` keys here).
- Generates a random Postgres password and a Studio dashboard password.
- Writes everything into `/opt/supabase/docker/.env` AND saves the
  human-readable copy to **`/root/supabase-credentials.txt`** (chmod 600).
- `docker compose pull && up -d`, then waits for Kong on `:8000`.

Verify: `docker ps | grep supabase` — you should see ~10 containers all `Up`.

---

## 5. Step 3 — create the three CloudPanel sites

```bash
sudo DOMAIN=yourdomain.com APP_USER=callescort bash scripts/vps/20-cloudpanel-sites.sh
```

Uses CloudPanel's `clpctl` CLI (no UI clicks, no API key):

| Site | Type | Backend |
|---|---|---|
| `yourdomain.com` | Node.js (port 3000) | the app |
| `api.yourdomain.com` | Reverse proxy | `http://127.0.0.1:8000` (Kong) |
| `studio.yourdomain.com` | Reverse proxy | `http://127.0.0.1:3000` (Studio container) |

The script is **idempotent** — it skips any site that already exists, so it's
safe to re-run.

> **Studio hardening (manual, 30 seconds):** open the `studio.*` site in
> CloudPanel → *Security* → enable **Basic Auth** (user `supabase`, password
> from `/root/supabase-credentials.txt`) and **IP allowlist** your office IP.
> The health-check in §9 will flag Studio as FAIL if you skip this.

---

## 6. Step 4 — Let's Encrypt SSL for all three subdomains

```bash
sudo DOMAIN=yourdomain.com EMAIL=you@yourdomain.com bash scripts/vps/30-ssl.sh
```

Uses `clpctl lets-encrypt:install:certificate` for each subdomain; if that
fails (older CloudPanel), it falls back to `certbot --nginx`. Both renew
automatically via systemd timers — no cron entry needed.

> If a cert call fails with a DNS error, your A record hasn't propagated yet.
> Re-run the script in 5–10 minutes.

---

## 7. Step 5 — restore an existing pg_dump (optional)

```bash
sudo DUMP_FILE=/root/backups/prod-2026-06-19.dump bash scripts/vps/40-restore-db.sh
```

What it does (in order):

1. Waits for Postgres to be ready.
2. **Snapshots the current DB first** to `/root/backups/pre-restore-*.sql.gz`
   so you can roll back.
3. Restores `.dump` (`pg_restore`), `.sql.gz` (`gunzip | psql`), or `.sql` (`psql`)
   into `public` only — `auth`, `storage`, `realtime` are left to Supabase.
4. **Re-applies the public-schema `GRANT`s** Supabase's PostgREST needs (this
   is the single most common reason a freshly-restored DB returns 401/permission
   errors).
5. Sends `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the new tables
   without a container restart.
6. Lists `\dt public.*` so you can eyeball the result.

---

## 8. Step 6 — nightly backups + weekly restore-verify

```bash
sudo bash scripts/vps/50-backup-cron.sh
```

Installs:

- **`/usr/local/bin/supabase-dump.sh`** — `pg_dump -Fc` into `/var/backups/supabase`.
- **`/etc/cron.d/supabase-backup`** — runs nightly at **03:15**, plus a weekly
  restore-verify every **Sunday 04:30**.
- **Retention**: dumps older than **14 days** are deleted automatically.
- **`/usr/local/bin/supabase-restore-verify.sh`** — restores the latest dump
  into a throwaway `verify_*` database and counts public tables; the temp DB
  is dropped at the end. This is your "did the backup actually work" check.

Force a dump immediately: `sudo /usr/local/bin/supabase-dump.sh`.
Force a verify:           `sudo /usr/local/bin/supabase-restore-verify.sh`.
Log:                      `tail -f /var/log/supabase-backup.log`.

Off-site copy: hook CloudPanel's *Remote Backup* feature at the directory
`/var/backups/supabase` or add a `rclone copy` line to the dump script.

---

## 9. Step 7 — post-deploy health check

```bash
sudo DOMAIN=yourdomain.com bash scripts/vps/60-healthcheck.sh
```

Nine checks, exits non-zero if any fail. Run it from CI/CD or right after
every deploy:

1. All `supabase-*` containers `Up`.
2. Kong answers on `127.0.0.1:8000`.
3. **PostgREST** reachable through Kong with the anon key → expects HTTP 200.
4. **GoTrue** `/auth/v1/health` reachable through Kong → expects HTTP 200.
5. Studio container is running.
6. At least one **PM2 process** is `online`.
7. App responds 200 on `127.0.0.1:3000`.
8. Public HTTPS for `${DOMAIN}` and `api.${DOMAIN}` returns < 500.
9. **Studio access rule**: `https://studio.${DOMAIN}` returns **401/403**
   (gated). If it returns 200, the script flags it as a FAIL — meaning Studio
   is publicly readable and you need to enable Basic Auth / IP allowlist (see §5).

---

## 10. What you have when it's done

| Thing | Where |
|---|---|
| Supabase credentials | `/root/supabase-credentials.txt` (chmod 600) |
| Supabase stack | `/opt/supabase/docker` (docker compose) |
| App source | `/home/<user>/htdocs/<DOMAIN>` |
| App process | PM2 (`pm2 ls`, `pm2 logs`) |
| Nightly backups | `/var/backups/supabase/*.dump`, 14-day retention |
| Backup log | `/var/log/supabase-backup.log` |
| Public app | `https://yourdomain.com` |
| Public API | `https://api.yourdomain.com` |
| Studio (gated) | `https://studio.yourdomain.com` |

---

## 11. Day-2 cheat sheet

```bash
# redeploy the app after a code change
sudo -u callescort bash -lc 'cd ~/htdocs/yourdomain.com && git pull && bun install && BUILD_TARGET=node bun run build && pm2 reload all'

# tail Supabase logs
docker compose -f /opt/supabase/docker/docker-compose.yml logs -f --tail=200

# rotate Studio password
clpctl basic-auth:edit:user --domainName=studio.yourdomain.com --userName=supabase --password='<new>'

# restore from a specific backup
sudo DUMP_FILE=/var/backups/supabase/supabase-20260619-031500.dump \
     bash scripts/vps/40-restore-db.sh

# full health-check (good as a post-deploy CI gate)
sudo DOMAIN=yourdomain.com bash scripts/vps/60-healthcheck.sh
```

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Unauthorized: No authorization header` from the app | `attachSupabaseAuth` not in `src/start.ts` global middleware | Add it (see project docs). |
| `Expected 3 parts in JWT; got 1` | App is using a Lovable-Cloud `sb_*` key against self-hosted Supabase | Use the `ANON_KEY` from `/root/supabase-credentials.txt`. |
| Tables exist but app gets `permission denied` | GRANTs missing after a restore | Re-run step 5 — the GRANT block at the end fixes it. |
| `studio.*` returns 200 in health-check | No Basic-Auth / IP allowlist configured | CloudPanel → studio site → Security. |
| Cert issuance fails | DNS A record not propagated | `dig +short api.yourdomain.com`, wait, re-run `30-ssl.sh`. |
| Health-check #3 returns 401 | Wrong anon key in container/Kong | `docker compose restart` after editing `/opt/supabase/docker/.env`. |
