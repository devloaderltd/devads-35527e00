
# Migrate CallEscort24 → Next.js 15 + MongoDB

## Honest size check (read first)

This project is **large**: ~75 routes, 46 Postgres tables, Supabase Auth + Storage + Realtime + RLS, 11 server-function modules, an admin panel, KYC, wallet, messaging, Plisio crypto payments, email queue, cron jobs.

No single AI prompt will spit out a 100% working clone in one shot. Claude (or any AI) will need to build it **in phases**. The prompt below is structured so Claude knows the full scope and works through it phase by phase. You will still need to:
- Run the project on your VPS (Node 20+, MongoDB, Nginx, PM2/Docker)
- Paste API keys (Plisio, SMTP, Google OAuth) into `.env`
- Re-upload the storage files from `backup-storage.zip`
- Tell users to reset passwords (Supabase password hashes can't move)

## What I'll deliver in this plan

1. A **target architecture** for the Next.js + MongoDB version
2. A **data migration strategy** (Postgres backup → MongoDB)
3. A **master Claude AI prompt** you can paste into Claude to generate the project
4. A **VPS deployment checklist**

---

## 1. Target architecture

```text
nextjs-callescort24/
├── app/                          # Next.js 15 App Router
│   ├── (public)/                 # home, search, listings, sellers, legal
│   ├── (auth)/                   # login, signup, forgot/reset password
│   ├── (dashboard)/              # user dashboard, messages, wallet, etc.
│   ├── admin/                    # admin panel (44 admin pages)
│   └── api/                      # REST endpoints + webhooks + cron
├── lib/
│   ├── db.ts                     # MongoDB connection (mongoose)
│   ├── auth.ts                   # NextAuth v5 (Auth.js) config
│   ├── storage.ts                # local disk OR S3-compatible (MinIO)
│   ├── email.ts                  # Nodemailer
│   └── plisio.ts                 # crypto payments
├── models/                       # Mongoose schemas (one per collection)
├── components/                   # ported from src/components
├── hooks/                        # ported from src/hooks
├── public/                       # static assets
├── scripts/migrate-data.ts       # one-off Postgres → MongoDB importer
├── docker-compose.yml            # MongoDB + app + nginx
└── .env.example
```

**Stack choices (locked in, beginner-friendly):**
- Next.js 15 (App Router) + React 19 + TypeScript
- MongoDB 7 via **Mongoose** (easier than raw driver for beginners)
- **NextAuth v5** for auth (email/password + Google OAuth)
- **MinIO** (S3-compatible, runs in Docker) for file storage — replaces Supabase Storage
- **Nodemailer** + your SMTP creds — replaces Supabase email
- **node-cron** inside the Next.js process — replaces pg_cron
- **Socket.IO** — replaces Supabase Realtime (for messages/notifications)
- **Tailwind v4 + shadcn/ui + Radix** — copied as-is from current project
- **PM2** + **Nginx** on the VPS

## 2. Data migration strategy

You already have `/mnt/documents/backup-db.sql` (46 tables) and `backup-storage.zip` (211 files). The plan:

1. Spin up a temporary local Postgres, `psql < backup-db.sql` to restore it
2. Run `scripts/migrate-data.ts` which:
   - Connects to Postgres (read) and MongoDB (write)
   - For each table → collection: maps UUIDs to ObjectIds (keeps a UUID→ObjectId lookup table for FK rewriting), converts `jsonb` → embedded docs, `timestamptz` → `Date`
   - Imports `auth-users.json` into `users` collection (no passwords; sets `mustResetPassword: true`)
3. Unzip `backup-storage.zip` into `./storage/` (mounted into MinIO) — keeps original bucket/folder paths

## 3. MASTER CLAUDE AI PROMPT (copy-paste this)

Open Claude (claude.ai or Claude Code), upload these 5 files from `/mnt/documents/`:
- `backup-db.sql` (so Claude knows your full schema)
- `auth-users.json`
- `backup-config.json`

Then paste this prompt verbatim:

````text
You are migrating an existing TanStack Start + Supabase (Postgres) project called
"CallEscort24" into a brand-new Next.js 15 + MongoDB project that I will deploy
on a Linux VPS. I am a beginner — do everything for me. Do not ask me to write
code. Generate complete, runnable files.

=========================
SOURCE PROJECT SUMMARY
=========================
- Framework: TanStack Start (file routes in src/routes/), React 19, Vite, TS
- Backend: Supabase (Postgres + Auth + Storage + Realtime + RLS)
- ~75 page routes including a full /admin panel (44 admin pages)
- 46 Postgres tables (see attached backup-db.sql for full schema + data)
- 4 storage buckets: listing-images (public), kyc-documents (private),
  review-photos (public), branding (public)
- Auth: email+password and Google OAuth, with email verification + password reset
- Features: classified listings marketplace with categories, cities, search/filters,
  favorites, compare, saved searches, seller profiles + reviews + ratings,
  in-app messaging with realtime + typing indicators + read receipts,
  notifications bell, wallet with top-ups, paid bumps/promotions of listings,
  KYC submissions, reports, admin moderation, audit log, broadcasts, banners,
  homepage editor, SMTP settings, error tracking, cron jobs
- Payments: Plisio (crypto) IPN webhook at /api/public/payments/plisio-ipn
- Cron jobs: auto-promote, match-saved-searches, reconcile-bumps
- Emails: React Email templates for signup, magic link, recovery, listing
  approved/rejected, KYC status, new message, review received, topup, etc.

=========================
TARGET STACK (REQUIRED — DO NOT SUBSTITUTE)
=========================
- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- MongoDB 7 + Mongoose
- NextAuth v5 (Auth.js) — Credentials provider + Google provider
- MinIO (S3-compatible, in docker-compose) + AWS SDK v3 for file storage
- Nodemailer for transactional email; keep React Email templates as-is
- Socket.IO for realtime messaging + typing + notifications
- node-cron for scheduled jobs
- Tailwind CSS v4 + shadcn/ui + Radix UI + lucide-react (copy components 1:1)
- TanStack Query v5 for client data fetching
- react-hook-form + zod for forms
- Deploy with PM2 + Nginx behind a Linux VPS; everything dockerized

=========================
WHAT TO PRODUCE
=========================
Work in PHASES. After each phase, print "PHASE X COMPLETE — say 'next' to
continue." Wait for me to type "next" before continuing.

PHASE 1 — Skeleton & infra
  - Full project tree with package.json, tsconfig, next.config.ts,
    tailwind.config, postcss, .env.example with EVERY variable I need
  - docker-compose.yml with: app, mongo, minio, mongo-express, nginx
  - Dockerfile (multi-stage, Node 20-alpine, standalone output)
  - nginx.conf reverse-proxying to Next.js on :3000 with SSL placeholders
  - PM2 ecosystem.config.js as an alternative to Docker
  - README.md with step-by-step VPS install (Ubuntu 22.04): install Node 20,
    MongoDB, copy files, run docker compose up -d, point DNS, run certbot

PHASE 2 — Database models
  - Read backup-db.sql carefully. Convert all 46 tables into Mongoose schemas
    under /models. Use ObjectId for primary keys, embed small 1-to-1 data,
    reference (ref:) for large relations. Add indexes matching the SQL ones.
  - Translate every RLS policy into an authorization helper in lib/authz.ts
    (e.g. canEditListing(user, listing)) and document where it must be called.

PHASE 3 — Auth (NextAuth v5)
  - Credentials + Google providers, MongoDB adapter, JWT sessions
  - Sign up / login / forgot password / reset password / verify email pages
    that match the look of the existing project (glassmorphism, gradient
    accent, same copy)
  - Middleware protecting (dashboard) and /admin routes; admin gate uses a
    `roles` collection (never store role on user doc — privilege escalation)

PHASE 4 — Storage + Email + Realtime + Cron
  - lib/storage.ts wrapping MinIO with the same 4 bucket names
  - lib/email.ts using Nodemailer; port all React Email templates as-is
  - lib/socket.ts Socket.IO server attached to a custom server.ts; client
    hook useSocket()
  - lib/cron.ts registering auto-promote, match-saved-searches,
    reconcile-bumps with the same logic as the originals

PHASE 5 — Public pages
  - Port: /, /search, /listings/[id], /sellers/[id], /compare, /about,
    /contact, /privacy, /terms, /cookies, /dmca, /sitemap.xml, /robots.txt
  - Copy components/, hooks/, styles.css verbatim from the source project I
    will paste in the next message. Adapt imports from
    @tanstack/react-router → next/link + next/navigation.

PHASE 6 — User dashboard
  - /dashboard, /messages, /messages/[threadId], /my-listings, /favorites,
    /saved-searches, /notifications, /profile, /post (create listing),
    /wallet, /verify (KYC)

PHASE 7 — Admin panel (all 44 pages)
  - List them all, port each one with the same table/filter/action UX

PHASE 8 — APIs & webhooks
  - REST API routes mirroring every src/lib/*.functions.ts server function
  - /api/public/payments/plisio-ipn webhook with HMAC verification
  - /api/public/cron/* endpoints callable by an external scheduler too

PHASE 9 — Data migration script
  - scripts/migrate-data.ts: reads a local Postgres restored from
    backup-db.sql, walks all 46 tables in FK-safe order, writes to MongoDB,
    keeps a UUID→ObjectId map for foreign-key rewriting
  - scripts/import-users.ts: imports auth-users.json into users collection
    with mustResetPassword=true (Supabase password hashes cannot be moved)
  - scripts/import-storage.ts: uploads backup-storage.zip contents into
    MinIO preserving bucket+path

PHASE 10 — Final checklist
  - .env.example fully filled with comments explaining each variable
  - "First boot" runbook (5 commands max)
  - List of things I MUST do manually: buy domain, point DNS, create Google
    OAuth credentials, get Plisio API key, configure SMTP, run certbot

=========================
RULES
=========================
1. Always output COMPLETE files, never "// ... rest unchanged".
2. Use TypeScript strict mode. No `any` unless unavoidable, comment why.
3. Use semantic Tailwind tokens identical to the source project's styles.css.
4. Never store role on user doc; use a separate roles collection.
5. Never expose service-side secrets to the client; mark server-only files.
6. After every phase, STOP and wait for me to say "next".
7. If a file would exceed your output limit, split it across messages and
   say "continued in next message".

Start with PHASE 1 now.
````

After Claude finishes Phase 1, **also paste** (in a follow-up message during Phase 5):
- The contents of your `src/styles.css`
- The contents of `src/components/` (zip and upload, or paste in chunks) — so the UI matches exactly

## 4. VPS deployment checklist (what you do manually, once Claude is done)

1. Buy a VPS (Hetzner CX22 ~€4/mo is plenty to start) — Ubuntu 22.04
2. Point `callescort24.org` A record to the VPS IP
3. SSH in, install Docker + docker-compose
4. `git clone` the project Claude generated, `cp .env.example .env`, fill values
5. `docker compose up -d`
6. `sudo certbot --nginx -d callescort24.org -d www.callescort24.org`
7. Run the 3 migration scripts in order (data, users, storage)
8. Email your existing users: "We migrated — please reset your password here"

## Deliverables you already have

These are ready in `/mnt/documents/` and feed directly into Claude:
- `backup-db.sql` — schema + data for all 46 tables
- `auth-users.json` — 5 user accounts
- `backup-storage.zip` — 211 files across 4 buckets
- `backup-config.json` — bucket + secret name inventory

## Approve this plan

If you click Implement, I will switch to build mode and create one extra file in this project: `/mnt/documents/CLAUDE_MIGRATION_PROMPT.md` containing the master prompt above plus the VPS checklist, so you can download it as a single file to use with Claude. No changes to the running app.
