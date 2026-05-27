# Finish Bump Payment Hardening — Remaining 4 Items

Continuing from the migrations and code changes already merged (apply_paid_bump, guard trigger, audit table, reconcile_bumps function, removal of free bump paths).

## 1. Scheduled reconciliation cron

- New route: `src/routes/api/public/cron/reconcile-bumps.ts`
  - POST handler validates `apikey` header against `SUPABASE_PUBLISHABLE_KEY` (matches existing cron pattern).
  - Calls `supabaseAdmin.rpc('reconcile_bumps')`.
  - Returns `{ cleared: <count>, listings: [...] }`.
- Schedule via `supabase--insert` (not migration): `cron.schedule('reconcile-bumps-hourly', '0 * * * *', ...)` hitting the stable preview URL.

## 2. Bump status section on listings

- New component: `src/components/listings/BumpStatusCard.tsx`
  - Props: `listing` (id, bumped_at, status).
  - Computes state from `bumped_at`:
    - `null` → **Not bumped** (muted card + "Bump this listing" CTA opening existing PromoteDialog).
    - `bumped_at` within last 24h → **Bumped** (green card, shows "Bumped <relative time>", expiry countdown).
    - Older than 24h → **Not bumped** (expired) with CTA.
  - No "Pending" state needed (bump is atomic; payment + bumped_at happen in same txn). Will note this in code comment and skip the Pending visual.
- Render on:
  - Listing detail page (`src/routes/listings.$slug.tsx` or equivalent) — under main content, above contact card.
  - `_authenticated.my-listings.tsx` — inline per-row compact variant.

## 3. Admin bump audit visibility

- New route: `src/routes/_authenticated.admin.bump-audit.tsx`
  - Guarded by existing admin role check pattern used in other admin routes.
  - Server fn `getBumpAuditLog` in `src/lib/admin.functions.ts` (uses `requireSupabaseAuth` + role check) returning recent `bump_audit_log` rows joined with profiles (display_name) and listings (title).
  - Table columns: time, outcome (badge colored by outcome), user, listing, wallet tx id, payment id, details JSON.
  - Filter by outcome (paid / unauthorized / insufficient_funds / reconciled / error).
- Add sidebar link in admin nav (`AppSidebar` or admin layout).

## 4. End-to-end tests

- New spec: `tests/e2e/bump.spec.ts` (Playwright, matches existing test setup if present; else add minimal config).
  - **Positive**: log in as seeded user → create listing → assert no BUMPED badge / BumpStatusCard shows "Not bumped" → open PromoteDialog → select bump package → confirm → assert wallet debited, BumpStatusCard shows "Bumped", BUMPED badge appears on listing card.
  - **Negative (DB-level)**: via service-role client, attempt direct `update listings set bumped_at = now()` → assert it throws "bumped_at can only be set via paid bump flow" and an `unauthorized` row exists in `bump_audit_log`.
- If no Playwright setup exists yet, scaffold `playwright.config.ts` + `tests/e2e/` dir + add `bun add -D @playwright/test` to dev deps.

## Out of scope

- The separate "Preview Post before publish" feature you mentioned in your other message — that's a new flow; I'll handle it in a follow-up plan after these 4 are done.
- Backfill for previously auto-bumped listings (reconcile cron will clean any orphans on its first run).

## Technical notes

- Audit row for `unauthorized` writes via the guard trigger uses `auth.uid()` which is null for service-role calls — details JSON captures `attempted_by_role` so admins can still see who/what tried.
- `reconcile_bumps` already notifies the user; cron route just invokes it.
- All new server fns use `requireSupabaseAuth` + admin role check; admin client only used inside the cron route (auth via apikey header).
