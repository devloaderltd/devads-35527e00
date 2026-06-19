# callescort24 — Step-by-Step Install Guide

End-to-end install of **callescort24.org** on a fresh Ubuntu 22.04 / 24.04 LTS VPS,
running self-hosted Supabase + the TanStack Start app behind CloudPanel + Let's Encrypt,
seeded from a Lovable Cloud database dump.

Estimated time: **30–45 minutes** (most of it waiting on `docker pull` and DNS).

---

## 0. What you need before you start

| Requirement               | Notes                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| VPS                       | Ubuntu 22.04 or 24.04 LTS, 4 GB RAM min (8 GB recommended), root SSH                                                       |
| CloudPanel                | Installed on the VPS so `clpctl` exists. Install: `curl -sS https://installer.cloudpanel.io/ce/v2/install.sh \| sudo bash` |
| Domain                    | `callescort24.org` with DNS you control                                                                                    |
| Git repo                  | SSH deploy key or PAT for the project repo                                                                                 |
| Lovable Cloud DB URL      | From the backend panel → DB connection string                                                                              |
| Off-server vault location | 1Password / Bitwarden / encrypted USB — for the master key backup                                                          |

### DNS A records (point all to the VPS IP)

| Host                                    | Type | Value      |
| --------------------------------------- | ---- | ---------- |
| `callescort24.org`                      | A    | `<VPS_IP>` |
| `api.callescort24.org`                  | A    | `<VPS_IP>` |
| `studio.callescort24.org`               | A    | `<VPS_IP>` |
| `grafana.callescort24.org` _(optional)_ | A    | `<VPS_IP>` |

Verify before continuing:

```bash
dig +short callescort24.org api.callescort24.org studio.callescort24.org
```

---

## 1. Dump the Lovable Cloud database (on your laptop)

The cloud DB runs PostgreSQL 17.x — your `pg_dump` **must** match.

```bash
# Ubuntu 24.04: add pgdg and install the v17 client
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo tee /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc >/dev/null
echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  | sudo tee /etc/apt/sources.list.d/pgdg.list
sudo apt update && sudo apt install -y postgresql-client-17

# macOS
brew install libpq && brew link --force libpq

pg_dump --version    # must print 17.x
```

Run the dumper (use the **session pooler on port 5432**, or the direct host — _not_ the
transaction pooler on 6543, which breaks `pg_dump` mid-stream):

```bash
SUPABASE_DB_URL='postgresql://postgres.<ref>:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require' \
  bash scripts/cloud-db-dump.sh
# → ./backups/callescort24-cloud-YYYYMMDD-HHMMSS.dump
```

Copy it to the VPS:

```bash
scp ./backups/callescort24-cloud-*.dump root@<VPS_IP>:/root/
ssh root@<VPS_IP> 'chmod 600 /root/callescort24-cloud-*.dump'
```

---

## 2. SSH into the VPS and clone the repo

```bash
ssh root@<VPS_IP>
git clone https://github.com/devloaderltd/devads-35527e00.git /opt/callescort24
cd /opt/callescort24
```

---

## 3. Dry-run the deploy (no changes made)

This prints every `clpctl`, `certbot`, `docker`, `pm2`, `pg_restore` action the real
run would perform — read it before running for real.

```bash
sudo DOMAIN=callescort24.org \
     EMAIL=support@callescort24.org \
     REPO=https://github.com/devloaderltd/devads-35527e00.git \
     APP_USER=callescort \
     DUMP_FILE=/root/callescort24-cloud-20260619-131523.dump \
     bash scripts/vps/cli.sh deploy --dry-run
```

If any `[dry-run]` line looks wrong, fix the env vars and re-run.

---

## 4. Real deploy (one command)

```bash
sudo DOMAIN=callescort24.org \
     EMAIL=you@callescort24.org \
     REPO=<YOUR_REPO_URL> \
     APP_USER=callescort \
     DUMP_FILE=/root/callescort24-cloud-YYYYMMDD-HHMMSS.dump \
     bash scripts/vps/cli.sh deploy
```

What runs, in order:

| Step | Script                                   | What it does                                                                          |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | `00-install.sh`                          | apt base, Node 20, PM2, Docker, Bun, certbot, UFW                                     |
| 2    | `10-supabase-stack.sh`                   | Clones supabase/supabase, generates JWT/anon/service keys, brings up the docker stack |
| 3    | `05-secrets.sh`                          | Seals all secrets into `/etc/supabase-vault/secrets.env.enc`                          |
| 4    | `20-cloudpanel-sites.sh`                 | Creates 3 CloudPanel sites (app / api / studio)                                       |
| 5    | `30-ssl.sh`                              | Let's Encrypt certs for all 3 hosts                                                   |
| 6    | App build                                | `git clone`, `bun install`, `bun run build`, PM2 start + save                         |
| 7    | `40-restore-db.sh`                       | `pg_restore` your Lovable Cloud dump                                                  |
| 8    | `50-backup-cron.sh`                      | Nightly `pg_dump` at 03:15, GFS retention 7d/4w/12m                                   |
| 9    | `80-monitoring.sh`                       | Prometheus + Grafana + node-exporter + cAdvisor                                       |
| 10   | `81-alerts.sh`                           | Telegram / email alert rules                                                          |
| 11   | `60-healthcheck.sh` + `65-smoke-test.sh` | Final gate — rolls back if anything fails                                             |

If any step fails, the orchestrator **automatically rolls back** prior steps using its
internal rollback log. See `ROLLBACK.md` for manual replay.

---

## 5. Critical: back up the vault master key OFF-SERVER

The vault key (`/etc/supabase-vault/master.key`) is the only way to decrypt your
secrets. If the VPS is lost and you don't have this key off-server, the secrets are
gone forever.

```bash
# from your laptop
scp root@<VPS_IP>:/etc/supabase-vault/master.key \
    ~/secure/callescort24-master.key
# then upload ~/secure/callescort24-master.key to 1Password / Bitwarden / encrypted USB
```

---

## 6. Verify the install

```bash
# on the VPS
sudo DOMAIN=callescort24.org bash scripts/vps/cli.sh verify
sudo DOMAIN=callescort24.org bash scripts/vps/65-smoke-test.sh
```

Open in a browser:

- `https://callescort24.org` — the app
- `https://api.callescort24.org/auth/v1/health` — should return `{"name":"GoTrue",...}`
- `https://studio.callescort24.org` — Supabase Studio (HTTP basic auth: user `supabase`, password from the vault)

Get the Studio password:

```bash
sudo bash scripts/vps/cli.sh secrets get DASHBOARD_PASSWORD
```

---

## 7. Optional: enable Grafana

The monitoring stack listens on `127.0.0.1:3030`. Add a CloudPanel reverse-proxy site
for `grafana.callescort24.org` → `http://127.0.0.1:3030`, issue an SSL cert, then:

```bash
sudo bash scripts/vps/cli.sh secrets get GRAFANA_ADMIN_PASSWORD
```

---

## 8. Day-2 operations

| Need                            | Command                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| Pull latest code & rebuild      | `sudo bash scripts/vps/cli.sh redeploy`                           |
| On-demand DB snapshot           | `sudo bash scripts/vps/cli.sh snapshot`                           |
| List backups / verify / restore | `sudo bash scripts/vps/cli.sh restore [--apply]`                  |
| Re-run healthcheck              | `sudo DOMAIN=callescort24.org bash scripts/vps/cli.sh verify`     |
| Apply GFS retention now         | `sudo bash scripts/vps/cli.sh prune`                              |
| Read a secret                   | `sudo bash scripts/vps/cli.sh secrets get ANON_KEY`               |
| Write / update a secret         | `sudo bash scripts/vps/cli.sh secrets put KEY value`              |
| Monitoring stack up / down      | `sudo bash scripts/vps/cli.sh monitoring up\|down`                |
| Spin up isolated staging        | `sudo DOMAIN=callescort24.org bash scripts/vps/cli.sh staging up` |
| Manual rollback replay          | see `ROLLBACK.md`                                                 |

---

## 9. Troubleshooting quick hits

- **`pg_dump: server version mismatch`** → your client is too old. Re-install the v17 client (see step 1).
- **`pg_dump` hangs / mid-stream error** → you used the transaction pooler (`:6543`). Switch to the session pooler (`:5432`) or direct host.
- **`clpctl: command not found`** → CloudPanel isn't installed. Install it first, then re-run `scripts/vps/cli.sh deploy`.
- **Let's Encrypt fails** → DNS hasn't propagated. Wait, re-check with `dig`, then `sudo DOMAIN=... bash scripts/vps/30-ssl.sh`.
- **PM2 app not online** → `sudo -u callescort pm2 logs` to see the error.
- **Healthcheck fails after deploy** → the orchestrator auto-rolled back. Read `/var/log/supabase-rollback.log` and the script output above the failure.

---

## 10. Security reminders

- **Rotate any password you pasted into a chat or terminal history** in the backend panel.
- Master key lives only at `/etc/supabase-vault/master.key` (mode `400`) and your off-server backup. Never commit it.
- UFW allows only `22, 80, 443, 8443` — DB port `5432` and Kong `8000` are blocked from the public internet.
- Studio is behind HTTP basic auth + HTTPS. Change `DASHBOARD_PASSWORD` via the vault if you ever share access.
