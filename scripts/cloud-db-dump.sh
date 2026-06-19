#!/usr/bin/env bash
# Dump the LOVABLE-CLOUD Supabase database into a portable pg_dump file
# that scripts/vps/40-restore-db.sh can load into your self-hosted stack.
#
# This runs ON YOUR LAPTOP / CI, not on the VPS. It needs the cloud
# project's direct Postgres connection string (SUPABASE_DB_URL is already
# stored as a Lovable Cloud secret — fetch the URL from the backend panel).
#
# Usage:
#   SUPABASE_DB_URL='postgres://postgres:PASS@db.<ref>.supabase.co:5432/postgres' \
#     bash scripts/cloud-db-dump.sh
#
#   # custom output dir
#   OUT_DIR=./backups bash scripts/cloud-db-dump.sh
#
# Output:
#   ./backups/devads-cloud-YYYYMMDD-HHMMSS.dump
#   ./backups/devads-cloud-YYYYMMDD-HHMMSS.sql.gz   (plain text, for diff/inspect)
#
# Then copy to the VPS:
#   scp ./backups/devads-cloud-*.dump root@<vps>:/root/
#   ssh root@<vps> 'DUMP_FILE=/root/devads-cloud-*.dump bash /path/to/scripts/vps/40-restore-db.sh'
#
# Or pass directly when running deploy.sh the first time:
#   sudo DOMAIN=... EMAIL=... REPO=... \
#        DUMP_FILE=/root/devads-cloud-20260619-120000.dump \
#        bash scripts/vps/cli.sh deploy
set -euo pipefail
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL to the cloud postgres connection string}"
OUT_DIR="${OUT_DIR:-./backups}"
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT_DIR"

command -v pg_dump >/dev/null || { echo "install postgresql-client first (apt install postgresql-client)"; exit 1; }

DUMP="${OUT_DIR}/devads-cloud-${TS}.dump"
SQL="${OUT_DIR}/devads-cloud-${TS}.sql.gz"

echo "==> dumping cloud DB → ${DUMP} (custom format, for pg_restore)"
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner --no-privileges \
  --exclude-schema='supabase_functions' \
  --exclude-schema='_realtime' \
  --exclude-schema='realtime' \
  --exclude-schema='cron' \
  --exclude-schema='net' \
  --exclude-schema='vault' \
  --exclude-schema='pgsodium*' \
  --file "$DUMP"

echo "==> dumping cloud DB → ${SQL} (plain SQL, for inspection)"
pg_dump "$SUPABASE_DB_URL" \
  --format=plain \
  --no-owner --no-privileges \
  --exclude-schema='supabase_functions' \
  --exclude-schema='_realtime' \
  --exclude-schema='realtime' \
  --exclude-schema='cron' \
  --exclude-schema='net' \
  --exclude-schema='vault' \
  --exclude-schema='pgsodium*' \
  | gzip > "$SQL"

ls -lh "$DUMP" "$SQL"

cat <<EOF

==> NEXT STEPS

Where to put this file on the VPS:
  • Copy to /root/ (root-only, 0600):
      scp ${DUMP} root@<vps>:/root/
      ssh root@<vps> "chmod 600 /root/$(basename "$DUMP")"

  • OR drop it into the backups dir so it's part of the GFS rotation:
      scp ${DUMP} root@<vps>:/var/backups/supabase/

Then load it into the self-hosted stack:
  • During the very first deploy (recommended):
      sudo DOMAIN=... EMAIL=... REPO=... \\
           DUMP_FILE=/root/$(basename "$DUMP") \\
           bash scripts/vps/cli.sh deploy

  • Into an already-running stack:
      sudo DUMP_FILE=/root/$(basename "$DUMP") \\
           bash scripts/vps/40-restore-db.sh

  • Or interactively pick + verify, then apply:
      sudo bash scripts/vps/cli.sh restore           # verify-only
      sudo bash scripts/vps/cli.sh restore --apply   # write to live
EOF
