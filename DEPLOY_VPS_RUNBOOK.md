# VPS Runbook — Quick-Run CLI

One wrapper, one set of commands. Every script under `scripts/vps/` is
reachable through `scripts/vps/cli.sh`. Telegram/email alerting is gone —
**all health & deploy signals flow into Prometheus + Grafana**.

## Install order on a fresh Ubuntu 22.04/24.04 LTS

```bash
sudo DOMAIN=example.com EMAIL=you@example.com \
     REPO=git@github.com:you/app.git APP_USER=callescort \
     bash scripts/vps/cli.sh deploy
```

That single command runs `00-install → 10-supabase-stack → 05-secrets →
20-cloudpanel-sites → 30-ssl → app build/PM2 → 50-backup-cron →
80-monitoring → 60-healthcheck` with automatic rollback on any failure.

## Commands

| Command                                | What it does |
|----------------------------------------|--------------|
| `cli.sh deploy [--dry-run]`            | First-time install. `--dry-run` simulates CloudPanel/SSL/docker/PM2 and prints every action without executing. |
| `cli.sh redeploy`                      | `git pull && bun install && build && pm2 reload` (no infra changes). |
| `cli.sh restore [--apply]`             | Interactive backup picker → restore to temp DB → verify → optionally swap into live with a pre-restore snapshot. |
| `cli.sh verify`                        | Run the full 9-step healthcheck. Writes Prometheus textfile metrics. |
| `cli.sh rollback [--dry-run]`          | Replay the last rollback log. `--dry-run` prints what *would* run. |
| `cli.sh snapshot`                      | On-demand `pg_dump -Fc` into the snapshots dir. |
| `cli.sh prune`                         | Apply GFS retention (7 daily / 4 weekly / 12 monthly). |
| `cli.sh monitoring {up\|down\|status}` | Bring the Prometheus + Grafana + exporters stack up/down. |
| `cli.sh staging {up\|down\|verify-latest}` | Isolated staging copy (kong :8001, db :5433, app :3001). |
| `cli.sh secrets {dump\|get K\|put K V}` | Encrypted vault at `/etc/supabase-vault/`. |

## --dry-run mode

Sets `DRY_RUN=1` and prepends a stub-bin directory to `PATH`. While active,
`clpctl`, `certbot`, `docker`, `pm2`, `pg_restore`, `pg_dump`, and `psql`
echo their arguments instead of running. `db_snapshot` also short-circuits.
Use this to preview a deploy or a rollback without touching the host:

```bash
sudo DOMAIN=example.com EMAIL=you@example.com REPO=... \
     bash scripts/vps/cli.sh deploy --dry-run
```

## Backup retention (GFS)

`scripts/vps/45-snapshot-retention.sh` keeps:
- 7 daily (one per calendar day)
- 4 weekly (one per ISO week)
- 12 monthly (one per calendar month)

Everything else under `/var/backups/supabase/*.dump` and `*.sql.gz` is
removed. Disk usage is bounded by your dump size × ~23 retained files.
Runs nightly at 03:45 via `/etc/cron.d/supabase-backup` and after every
manual `cli.sh prune`. Bytes-on-disk and kept/pruned counters are emitted
as Prometheus textfile metrics.

## Monitoring (replaces Telegram/Email)

`cli.sh monitoring up` starts a docker compose stack at `/opt/monitoring/`:

| Service             | Bind             | Purpose |
|---------------------|------------------|---------|
| Prometheus          | `127.0.0.1:9090` | TSDB + scrape orchestrator |
| Grafana             | `127.0.0.1:3030` | Dashboards (admin password in vault under `GRAFANA_ADMIN_PASSWORD`) |
| node_exporter       | `127.0.0.1:9100` | Host CPU/RAM/disk + textfile collector |
| cadvisor            | `127.0.0.1:9101` | Per-container metrics (supabase, pm2 if containerized) |
| postgres_exporter   | `127.0.0.1:9187` | Connections, locks, replication, WAL |

Expose Grafana publicly with one more CloudPanel reverse-proxy site:

```bash
clpctl site:add:reverse-proxy --domainName=grafana.example.com \
  --reverseProxyUrl=http://127.0.0.1:3030 \
  --siteUser=grafana --siteUserPassword="$(openssl rand -base64 16)"
clpctl lets-encrypt:install:certificate --domainName=grafana.example.com
```

### Metrics emitted by the toolkit itself

| Metric                             | Source                          |
|------------------------------------|---------------------------------|
| `supabase_healthcheck_passed`      | 60-healthcheck.sh               |
| `supabase_healthcheck_failed`      | 60-healthcheck.sh               |
| `supabase_healthcheck_up{check=…}` | per-check boolean               |
| `supabase_healthcheck_last_run`    | unix ts                         |
| `supabase_backups_kept`            | 45-snapshot-retention.sh        |
| `supabase_backups_pruned`          | 45-snapshot-retention.sh        |
| `supabase_backups_bytes`           | 45-snapshot-retention.sh        |
| `supabase_restore_verify_ok`       | weekly verify cron              |
| `supabase_staging_verify_ok`       | nightly staging verify          |
| `supabase_deploy_succeeded`        | deploy.sh                       |
| `supabase_deploy_last_run`         | deploy.sh                       |
| `supabase_deploy_rolled_back`      | lib.sh (on rollback)            |

All written via the node_exporter textfile collector
(`/var/lib/node_exporter/textfile_collector/*.prom`) so they show up in
Prometheus within 15 seconds without any push gateway.

### Grafana dashboard

A starter dashboard "Supabase VPS Overview" is auto-provisioned at
`/opt/monitoring/grafana/dashboards/supabase-vps.json` with panels for
healthcheck counters, backup bytes, host CPU/RAM, per-container CPU/RAM,
and postgres activity. Edit it in-place or import community dashboards
(Node Exporter Full = `1860`, cAdvisor = `14282`, PostgreSQL = `9628`).

## Typical workflows

### Test a new dump before applying it
```bash
sudo bash scripts/vps/cli.sh restore           # verify-only into temp DB
sudo bash scripts/vps/cli.sh restore --apply   # then write to live
```

### Validate a deploy without touching production
```bash
sudo DOMAIN=… EMAIL=… REPO=… bash scripts/vps/cli.sh deploy --dry-run
```

### Force a snapshot + prune now
```bash
sudo bash scripts/vps/cli.sh snapshot
sudo bash scripts/vps/cli.sh prune
```

### Nightly staging restore-verify (cron)
```cron
30 4 * * * root DOMAIN=example.com bash /path/scripts/vps/cli.sh staging verify-latest
```
