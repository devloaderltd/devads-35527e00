# Rollback Runbook

The deploy uses a stack-based rollback (`scripts/vps/lib.sh`). Every
destructive step pushes an undo command. If `deploy.sh` exits non-zero,
the trap runs the stack in reverse automatically and emits
`supabase_deploy_rolled_back 1` to Prometheus.

You only need this guide when:
- The auto-rollback was skipped (e.g. you killed the deploy with `Ctrl-C`).
- You want to re-trigger the last rollback log against a half-deployed box.
- You want to manually restore the pre-deploy DB snapshot.

---

## 1. Did the auto-rollback fire?

```bash
# look at the deploy log for "rollback complete"
tail -100 /var/log/supabase-deploy.log

# Prometheus metric set on rollback
cat /var/lib/node_exporter/textfile_collector/supabase_deploy_rolled_back.prom
# supabase_deploy_rolled_back 1
```

If `supabase_deploy_rolled_back 1` is present and Grafana's "Active alerts"
panel is clean, the rollback already ran — nothing else to do.

---

## 2. Replay the last rollback log

```bash
# Preview (no changes):
sudo bash scripts/vps/cli.sh rollback --dry-run

# Execute the latest plan (PM2 stop, CloudPanel sites removed, DB snapshot restored):
sudo bash scripts/vps/cli.sh rollback
```

The log lives at `/var/log/supabase-rollback.log`. It contains the exact
commands that were pushed during the failed deploy, in reverse order.

---

## 3. Manually restore the pre-deploy DB snapshot

`deploy.sh` always takes a snapshot before touching the DB:

```bash
ls -lt /var/backups/supabase/pre-deploy-*.dump | head
sudo DUMP_FILE=/var/backups/supabase/pre-deploy-<timestamp>.dump \
     bash scripts/vps/40-restore-db.sh
```

Or use the interactive picker:

```bash
sudo bash scripts/vps/cli.sh restore --apply
```

---

## 4. Confirm the rollback worked

```bash
# 1. Healthcheck passes
sudo DOMAIN=devads.example.com bash scripts/vps/cli.sh verify

# 2. Smoke test passes
sudo DOMAIN=devads.example.com bash scripts/vps/65-smoke-test.sh

# 3. App returns 200
curl -I https://devads.example.com/

# 4. Studio still gated (expect 401/403)
curl -I https://studio.devads.example.com/

# 5. No firing alerts
curl -s http://127.0.0.1:9090/api/v1/alerts | jq '.data.alerts[] | select(.state=="firing")'
```

If all four pass, the rollback is complete. Re-run `cli.sh deploy` once you
have fixed the root cause.
