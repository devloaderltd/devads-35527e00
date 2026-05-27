## Goal
A listing's `bumped_at` must only ever be set as a direct result of a successful Wallet debit + bump selection. No free bumps, no automatic bumps from renew/auto-promote without payment. Add a reconciliation job to detect/heal drift, audit unauthorized bump attempts, surface a clear Bump status to users, and prove the behavior with E2E tests.

## Root-cause audit (what currently sets `bumped_at` without payment)
1. `src/components/dashboard/ListingRowActions.tsx` — "Bump to top" button calls `update({ bumped_at: now })` with NO debit. Free bump.
2. `src/routes/_authenticated.my-listings.tsx` (lines 123, 173, 207) — renew/extend flows set `bumped_at` while updating `expires_at`. Renew ≠ bump.
3. `src/routes/api/public/cron/auto-promote.ts` — auto-renew cron sets `bumped_at` for every renewed listing with no payment.
4. `src/lib/wallet.functions.ts::promoteWithWallet` — the only legitimate path (debit then set `bumped_at`). Keep, but harden.

## Changes

### 1. Server-side: bump only via paid path
- **`src/lib/wallet.functions.ts`**: leave `promoteWithWallet` as the single writer of `bumped_at`. Wrap debit + payment row + `bumped_at` update so a failure rolls back via a new `apply_paid_bump` SECURITY DEFINER SQL function (debit_wallet → insert payment → update listings.bumped_at in one transaction). If any step fails, raise and surface to client.
- **`src/components/dashboard/ListingRowActions.tsx`**: remove the free "Bump" button. Replace with the existing `PromoteDialog` entry (already paid). Keep pause/edit/delete.
- **`src/routes/_authenticated.my-listings.tsx`**: remove `bumped_at` from the three renew/extend mutations. Renew only touches `expires_at` (and `status` where applicable).
- **`src/routes/api/public/cron/auto-promote.ts`**: remove `bumped_at` from the auto-renew update. Auto-renew extends expiry only; bumping requires payment.
- **DB hardening (migration)**: revoke direct UPDATE on `listings.bumped_at` from `authenticated` via a column-level trigger that blocks any UPDATE of `bumped_at` unless the session role is `service_role`. This guarantees no client-side write path can set it, even by mistake.

### 2. Audit + admin visibility for unauthorized bump attempts
- **Migration**: new table `public.bump_audit_log` (`id, user_id, listing_id, wallet_transaction_id nullable, attempted_at, outcome text` — `unauthorized | insufficient_funds | paid | reconciled`, `details jsonb`). RLS: admins read; service_role writes.
- **Server**: the bump-block trigger logs an `unauthorized` row (with `auth.uid()` and listing id) when a non-service role attempts to write `bumped_at`. `promoteWithWallet` logs a `paid` row with the wallet transaction id.
- **Admin UI**: new route `src/routes/admin.bump-audit.tsx` listing recent entries (filterable by outcome) with user, listing, transaction id, time. Add a sidebar link.

### 3. Scheduled reconciliation job
- **Route**: `src/routes/api/public/cron/reconcile-bumps.ts` (POST). For every listing where `bumped_at IS NOT NULL`, confirm a matching `payments` row exists with `promotion_type='bump'`, `status='completed'`, and `created_at <= bumped_at + interval`. If missing → clear `bumped_at` and write a `reconciled` row to `bump_audit_log`. Notify the user.
- **pg_cron**: schedule hourly via `supabase--insert` (calls the stable `project--*.lovable.app/api/public/cron/reconcile-bumps` URL).

### 4. Per-listing Bump status section
- **Component**: `src/components/listing/BumpStatusCard.tsx` rendering one of:
  - **Not bumped** — neutral, with "Bump this listing" CTA opening `PromoteDialog`.
  - **Pending** — when a `crypto_topups`/payment for this listing is in `waiting`/`pending`.
  - **Bumped** — green, with expiry timestamp (`bumped_at + 24h` per `bump_days`).
- Render on `src/routes/listings.$id.tsx` (owner view) and inside `_authenticated.my-listings.tsx` rows. Source of truth: `bumped_at` + latest `payments` row for that listing.

### 5. E2E tests (Playwright)
New `tests/e2e/bump.spec.ts` (separate project in `playwright.config.ts`):
1. Sign in as a seeded test user with a funded wallet.
2. Create a listing via the post flow.
3. Open the listing detail; assert BumpStatusCard shows **Not bumped** and no `BUMPED` badge on `ListingCard` (home/search).
4. Open `PromoteDialog`, choose Bump, confirm payment from wallet.
5. Re-assert: BumpStatusCard shows **Bumped**, badge visible, `payments` row exists (verified via a thin `/api/public/test/...` read-only endpoint gated by a test header, or directly via authenticated server fn).
6. Negative test: attempt a direct `supabase.from('listings').update({ bumped_at })` from the browser session and assert it fails / no badge appears / audit row is `unauthorized`.

### 6. Verification checklist
- New listings: no badge until paid bump.
- Renew / auto-renew: extends expiry only, never bumps.
- Reconciliation cron clears orphan `bumped_at` and logs it.
- Admin → Bump Audit shows paid + unauthorized + reconciled entries with user/listing/tx ids.
- E2E suite passes locally.

## Out of scope
- Featured promotion logic (already paid-only).
- Refunds for the user who was previously auto-bumped; reconciliation only heals state going forward (mention to user separately if they want backfill credits).
