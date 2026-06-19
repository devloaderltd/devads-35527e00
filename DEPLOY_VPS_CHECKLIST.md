# callescort24 — One-Page VPS Deploy Checklist

Run top-to-bottom. Every command is copy-pasteable.

---

## A. Preflight (do once, BEFORE you SSH the VPS)

- [ ] Ubuntu 22.04 or 24.04 LTS VPS, root SSH access.
- [ ] **CloudPanel installed** on it (so `clpctl` exists).
- [ ] DNS A records pointing at the VPS:
      `callescort24.org`, `api.callescort24.org`, `studio.callescort24.org`,
      and (optional) `grafana.callescort24.org`.
- [ ] Deploy key / PAT for the git repo added to the VPS user (`callescort` by default).
- [ ] You have the Lovable Cloud `SUPABASE_DB_URL` available locally for the
      one-time dump (see step B).
- [ ] Off-server location ready to receive `/etc/supabase-vault/master.key`
      after deploy (1Password, Bitwarden, encrypted USB — anywhere but the VPS).

### Required environment variables for `deploy.sh`

| Var          | Required | Example                                       |
|--------------|----------|-----------------------------------------------|
| `DOMAIN`     | yes      | `callescort24.org`                            |
| `EMAIL`      | yes      | `you@callescort24.org` (Let's Encrypt)        |
| `REPO`       | yes      | `git@github.com:you/callescort24.git`         |
| `APP_USER`   | no       | `callescort` (default)                        |
| `DUMP_FILE`  | no       | `/root/callescort24-cloud-20260619-120000.dump` |

The stack itself self-generates: JWT secret, anon/service keys, DB password,
Grafana admin password — all sealed into `/etc/supabase-vault/`.

---

## B. Dump the Lovable Cloud DB (on your laptop)

```bash
# Install pg client once (must match cloud server version, currently 17.x):
sudo apt install -y postgresql-client-17     # or: brew install libpq

# Run the dumper (the URL is in your Cloud backend panel → DB connection string):
SUPABASE_DB_URL='postgres://postgres:PASS@db.<ref>.supabase.co:5432/postgres' \
  bash scripts/cloud-db-dump.sh
# → ./backups/callescort24-cloud-YYYYMMDD-HHMMSS.dump
```

Ship it to the VPS:
```bash
scp ./backups/callescort24-cloud-*.dump root@<vps>:/root/
ssh root@<vps> 'chmod 600 /root/callescort24-cloud-*.dump'
```

---

## C. Dry-run the deploy (on the VPS, no changes made)

```bash
ssh root@<vps>
git clone <REPO> /opt/callescort24 && cd /opt/callescort24

sudo DOMAIN=callescort24.org \
     EMAIL=you@callescort24.org \
     REPO=git@github.com:you/callescort24.git \
     APP_USER=callescort \
     DUMP_FILE=/root/callescort24-cloud-20260619-120000.dump \
     bash scripts/vps/cli.sh deploy --dry-run
```

Read the `[dry-run]` lines — they list every `clpctl`, `certbot`, `docker`,
`pm2`, `pg_restore` action that the real run will perform. If any look wrong,
stop and fix env vars before continuing.

---

## D. Real deploy (one command)

```bash
sudo DOMAIN=callescort24.org \
     EMAIL=you@callescort24.org \
     REPO=git@github.com:you/callescort24.git \
     APP_USER=callescort \
     DUMP_FILE=/root/callescort24-cloud-20260619-120000.dump \
     bash scripts/vps/cli.sh deploy
```

This runs, in order:
`00-install → 10-supabase-stack → 05-secrets → 20-cloudpanel-sites →
30-ssl → app build/PM2 → 40-restore-db → 50-backup-cron → 80-monitoring →
81-alerts → 60-healthcheck → 65-smoke-test`

Rollback is automatic if any step fails (see `ROLLBACK.md`).

---

## E. Post-deploy verification

```bash
# Off-server: back up the vault master key NOW
scp root@<vps>:/etc/supabase-vault/master.key ~/secure/callescort24-master.key

# Healthcheck + smoke test
sudo DOMAIN=callescort24.org bash scripts/vps/cli.sh verify
sudo DOMAIN=callescort24.org bash scripts/vps/65-smoke-test.sh

# Visit
open https://callescort24.org
open https://api.callescort24.org/auth/v1/health
open https://studio.callescort24.org           # should ask for basic auth

# Grafana (after you add the reverse-proxy site)
sudo bash scripts/vps/cli.sh secrets get GRAFANA_ADMIN_PASSWORD
```

---

## F. Day-2 ops cheat sheet

| Need                                  | Command |
|---------------------------------------|---------|
| Pull latest code & rebuild            | `sudo bash scripts/vps/cli.sh redeploy` |
| Take an ad-hoc DB snapshot            | `sudo bash scripts/vps/cli.sh snapshot` |
| List + verify a backup, optionally apply | `sudo bash scripts/vps/cli.sh restore` / `... restore --apply` |
| Re-run healthcheck                    | `sudo DOMAIN=... bash scripts/vps/cli.sh verify` |
| Re-run smoke test                     | `sudo DOMAIN=... bash scripts/vps/65-smoke-test.sh` |
| Trigger last rollback manually        | see `ROLLBACK.md` |
| Read a secret                         | `sudo bash scripts/vps/cli.sh secrets get ANON_KEY` |
