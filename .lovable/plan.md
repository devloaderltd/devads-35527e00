# Backup & Migration Export

Goal: produce downloadable artifacts containing everything needed to restore your backend on another Postgres + storage provider.

## What gets exported

### 1. Database (`backup-db.sql`)
A single Postgres dump containing:
- Full `public` schema (tables, types, functions, triggers, RLS policies, indexes)
- All row data for every table (profiles, listings, listing_images, categories, cities, payments, wallets, messages, notifications, kyc_submissions, etc. — ~40 tables)
- Sequences and defaults

Format: plain SQL, restorable with `psql < backup-db.sql` on any Postgres 15+ instance.

Note: `auth.users` (managed by Supabase Auth) cannot be exported via SQL dump from the Data API. You'll get a separate `auth-users.json` with id, email, created_at, metadata for each user — enough to recreate accounts on a new auth provider (passwords cannot be migrated; users will need a password reset on the new system).

### 2. Storage files (`backup-storage.zip`)
A zip containing all 4 buckets with original folder structure:
- `listing-images/` (public)
- `kyc-documents/` (private)
- `review-photos/` (public)
- `branding/` (public)

### 3. Config snapshot (`backup-config.json`)
- Bucket names + public/private flags
- List of secrets names (values NOT included — you must re-enter them on the new system)
- Edge function list (if any)

## How it runs

A one-off Node script executed via `code--exec`:
1. Connect to Postgres using `SUPABASE_DB_URL` and run `pg_dump --schema=public --no-owner --no-acl` → `backup-db.sql`
2. Query `auth.users` via service role → `auth-users.json`
3. For each bucket, list all objects recursively and download via service role → zip into `backup-storage.zip`
4. Write `backup-config.json`
5. All artifacts land in `/mnt/documents/` as downloadable files

Estimated runtime: 1–5 minutes depending on storage size.

## Deliverables
You'll get 4 download links:
- `backup-db.sql`
- `auth-users.json`
- `backup-storage.zip`
- `backup-config.json`

## Caveats to confirm
- Auth user passwords cannot be exported (Supabase limitation). Migration target will need password resets or a new sign-in flow.
- Realtime/pg_cron/pgmq runtime state is not exported — only schema.
- If storage is very large (>1 GB), I'll stream and may need to split the zip.

Approve and I'll run the export.