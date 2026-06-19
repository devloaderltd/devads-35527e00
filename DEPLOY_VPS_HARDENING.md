# Hardening Add-ons — rollback, vault, restore, alerts, staging

These add to the base flow in `DEPLOY_VPS_FULL.md`. New files:

| Script | What it adds |
|---|---|
| `scripts/vps/lib.sh` | Shared library: rollback stack, encrypted secret vault (AES-256-CBC via openssl), alerting (Telegram + email), DB snapshot/restore helpers |
| `scripts/vps/05-secrets.sh` | Migrates `/root/supabase-credentials.txt` into the encrypted vault and shreds the plaintext file |
| `scripts/vps/restore.sh` | Interactive restore: lists dated backups, picks one, **verifies in a temp DB**, optionally `--apply` writes to live with auto pre-restore snapshot + rollback |
| `scripts/vps/70-staging.sh` | Spins up an isolated staging stack on the same VPS (separate compose project, ports, subdomains, vault keys) for nightly verify |
| `scripts/vps/60-healthcheck.sh` | Now sends alerts via `lib.sh` on any FAIL |
| `scripts/vps/deploy.sh` | Now wraps each phase in rollback hooks and installs an hourly health-check cron |

---

## 1. Rollback mechanism

`lib.sh` exposes `push_rollback "desc" "undo cmd"`. The deploy script registers an undo for every destructive step:

- DB pre-deploy snapshot → restored on failure
- Each CloudPanel site → `clpctl site:delete --force`
- PM2 app → `pm2 delete all`

The bash `EXIT` trap watches `$?`. If any step exits non-zero, it walks the stack in reverse, runs every undo, and fires an alert. On success the final line in `deploy.sh` calls `disable_rollback` to keep the changes.

The healthcheck is the deploy's final gate — if it fails, the whole deploy unwinds.

---

## 2. Encrypted secret vault (replaces plaintext file)

`/root/supabase-credentials.txt` is gone. Secrets now live in:

- `/etc/supabase-vault/secrets.env.enc` — AES-256-CBC, PBKDF2, salted
- `/etc/supabase-vault/master.key` — 64-hex master key, `chmod 400 root:root`

**Back up `master.key` off-server immediately** — it's the only thing that can decrypt the vault.

Helpers (source `lib.sh` first):
```bash
source scripts/vps/lib.sh
vault_put ANON_KEY 'eyJhbGci...'
vault_get ANON_KEY
vault_dump            # full plaintext to stdout — pipe to less, never to a file
```

`05-secrets.sh` runs automatically inside `deploy.sh` to import existing keys from `/opt/supabase/docker/.env` and the legacy plaintext file (which it then `shred`s).

---

## 3. Dated restore tool

```bash
# Interactive picker (verify only)
sudo bash scripts/vps/restore.sh

# Interactive picker, then write to live DB (asks for typed "APPLY" confirmation)
sudo bash scripts/vps/restore.sh --apply

# Or pick a specific dump
sudo DUMP_FILE=/var/backups/supabase/supabase-20260619-031500.dump \
     bash scripts/vps/restore.sh --apply
```

Pipeline every time:
1. List dumps newest-first with date+size, pick by number
2. Create `verify_<ts>` DB, `pg_restore` into it
3. Count public tables, live rows, `auth.users`
4. Drop temp DB
5. Send alert with the verify result
6. *(only with `--apply`)* snapshot live DB → restore → reapply PostgREST GRANTs → `NOTIFY pgrst, 'reload schema'`. If the live restore errors, automatically roll back from the snapshot.

---

## 4. Alerts on health-check failures

Configure once:
```bash
sudo TELEGRAM_BOT_TOKEN=123:abc TELEGRAM_CHAT_ID=42 ALERT_EMAIL=ops@you.com \
     bash scripts/vps/05-secrets.sh
```

`60-healthcheck.sh` now sends a Telegram message + email listing every failed check, e.g.:

```
🚨 healthcheck on vps-1 — 2 failed:
- rest/v1 -> 401
- https://api.example.com -> 502
```

An hourly cron is installed by `deploy.sh`:
```
17 * * * * root DOMAIN=... bash .../60-healthcheck.sh >> /var/log/supabase-healthcheck.log
```

Rollback errors and successful deploys also fire alerts.

---

## 5. Staging stack (isolated, same VPS)

Brought up on different ports + subdomains so prod is never touched:

| | Prod | Staging |
|---|---|---|
| Kong | 8000 | 8001 |
| Postgres | 5432 | 5433 |
| App | 3000 | 3001 |
| Subdomains | `yourdomain.com`, `api.*`, `studio.*` | `staging.*`, `api-staging.*`, `studio-staging.*` |
| Compose project | `supabase` | `supabase-staging` |
| Data dir | `/opt/supabase` | `/opt/supabase-staging` |
| Secrets | `POSTGRES_PASSWORD`, ... | `STAGING_POSTGRES_PASSWORD`, ... (in vault) |

Commands:
```bash
sudo DOMAIN=example.com bash scripts/vps/70-staging.sh up
sudo DOMAIN=example.com bash scripts/vps/70-staging.sh restore /var/backups/supabase/supabase-XYZ.dump
sudo DOMAIN=example.com bash scripts/vps/70-staging.sh verify-latest   # restores newest prod dump into staging + alerts
sudo DOMAIN=example.com bash scripts/vps/70-staging.sh down
```

Point nightly restore-verify at staging instead of prod by replacing the cron entry in `50-backup-cron.sh`:
```cron
30 4 * * 0 root DOMAIN=example.com /dev-server/scripts/vps/70-staging.sh verify-latest
```

That way the weekly verification exercises a full apply path against a real Supabase stack — not just a `pg_restore` into a temp DB — without any risk to production.
