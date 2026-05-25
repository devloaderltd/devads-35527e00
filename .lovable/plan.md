
# Admin Control Panel Overhaul

Convert the current single-page tabbed admin into a multi-route admin app with a collapsible sidebar, richer dashboard, and deeper control panels for every area.

## 1. Navigation & layout

Replace the horizontal `Tabs` in `admin.index.tsx` with a shadcn sidebar (`SidebarProvider`, `Sidebar`, `SidebarInset`) inside `AdminShell.tsx`.

Sidebar groups:
- **Overview** — Dashboard
- **People** — Users, Roles, Reports
- **Content** — Listings, Categories, Cities
- **Finance** — Payments, Crypto Top-ups, Wallets
- **System** — Site Settings, Audit Log

Each item becomes its own route file:

```
src/routes/admin.index.tsx          → Dashboard (default)
src/routes/admin.tsx                → Layout (sidebar + Outlet + role gate)
src/routes/admin.users.tsx
src/routes/admin.reports.tsx
src/routes/admin.listings.tsx
src/routes/admin.categories.tsx
src/routes/admin.cities.tsx
src/routes/admin.payments.tsx
src/routes/admin.topups.tsx
src/routes/admin.wallets.tsx
src/routes/admin.settings.tsx
src/routes/admin.audit.tsx
```

`admin.tsx` becomes the parent route — moves the role check + `AdminShell` wrapping out of `admin.index.tsx` so it runs once for the whole subtree. Mobile keeps a `SidebarTrigger` in the header; sidebar collapses to icon-only on desktop.

## 2. Dashboard (admin.index.tsx)

- **KPI cards** (existing four) + new: Wallet balance total, Pending top-ups, New users (7d), Revenue this month
- **Charts** (keep current) + add: Wallet top-ups per day, Featured vs Bump split
- **Recent activity feed** — unified stream of last 20 events (signups, listings, payments, top-ups, reports) via a single query that fans out and merges by `created_at`
- **Quick actions panel** — buttons linking to: Pending reports, Listings awaiting moderation, Pending crypto top-ups, Low-balance wallets

## 3. Users & roles (admin.users.tsx)

Adds to the existing table:
- Search by name **and** email (requires server fn since `auth.users.email` isn't in `profiles` — new `listUsersAdmin` serverFn using `supabaseAdmin.auth.admin.listUsers()` joined with `profiles` + `user_roles` + wallet balance)
- **Ban / unban** user (sets `banned_until` via `supabaseAdmin.auth.admin.updateUserById`)
- **Send password reset email**
- **Delete user** (admin only, confirmation dialog)
- **View user detail drawer** — listings, payments, wallet tx, messages count
- Filter chips: All / Admins / Moderators / Banned

## 4. Listings moderation (admin.listings.tsx)

- Filter by status, category, city, search title
- Multi-select with bulk actions: **Mark sold**, **Hide**, **Delete**, **Restore**, **Force-expire**
- Per-row: **Edit** (opens dialog with title/desc/price/category/city/status), **Grant Featured (free)**, **Grant Bump (free)** — admin gift promotions that insert into `listing_promotions` without a payment
- Quick stat header: total, active, hidden, sold, expired

## 5. Wallet & Payments

**admin.payments.tsx** — all `payments` rows with filters (provider, status, date range), CSV export.

**admin.topups.tsx** — all `crypto_topups` with status filter, "Retry credit" button for stuck `finished` rows that didn't credit, link to NOWPayments invoice URL.

**admin.wallets.tsx** — list all wallets sorted by balance, per-row:
- **Credit** — manual top-up (calls `credit_wallet` RPC via new `adminCreditWallet` serverFn, type `adjustment`)
- **Debit** — manual deduction (calls `debit_wallet`, type `adjustment`)
- **View transactions** — drawer with `wallet_transactions` history

Requires: extend `wallet_transaction_type` enum to include `adjustment` (migration), and a new `admin_adjust_wallet(_user_id, _amount, _description)` SECURITY DEFINER RPC that supports signed amounts.

## 6. Site settings (admin.settings.tsx)

New `site_settings` table (single-row key/value JSONB) with RLS: admins manage, public read.

Sections:
- **Categories** — add/edit/delete/reorder (existing table, no new schema)
- **Cities** — add/edit/delete/reorder
- **Promotion pricing** — featured price USD, bump price USD, featured duration days, bump duration days (stored in `site_settings`, consumed by `wallet.functions.ts` instead of hardcoded $9.99 / $2.99)
- **Maintenance mode** — boolean + message, read by `__root.tsx` to show banner / block posting
- **Branding** — site name, support email

## 7. Audit log (admin.audit.tsx)

New `audit_log` table: `id, actor_id, action, target_type, target_id, metadata jsonb, created_at`. RLS admin-only read; inserts via SECURITY DEFINER helper `log_admin_action()` called from every mutating admin serverFn (role changes, bans, deletions, wallet adjustments, settings changes, free promotions).

## Technical details

**New server functions** (`src/lib/admin.functions.ts` extended):
- `listUsersAdmin({ q, filter })` — uses `supabaseAdmin` for email + ban status
- `banUser({ userId, until })`, `unbanUser`, `deleteUser`, `sendPasswordReset`
- `adminCreditWallet({ userId, amount, description })`
- `adminDebitWallet({ userId, amount, description })`
- `retryTopupCredit({ topupId })`
- `grantPromotion({ listingId, type, days })`
- `bulkUpdateListings({ ids, action })`
- `getSiteSettings`, `updateSiteSettings`
- `getAuditLog({ limit, cursor })`
- `getRecentActivity()` — for dashboard feed

All gated by `requireSupabaseAuth` + internal `has_role(userId, 'admin')` check; mutating ones call `log_admin_action`.

**Migrations**:
1. `ALTER TYPE wallet_transaction_type ADD VALUE 'adjustment'`
2. `CREATE TABLE site_settings` + seed default row
3. `CREATE TABLE audit_log` + RLS + `log_admin_action()` function
4. `admin_adjust_wallet()` RPC

**Files removed from `admin.index.tsx`**: each `*Tab` component moves into its own route file; the file becomes only the Dashboard.

## Out of scope

- Email broadcast to users
- User impersonation (security-sensitive, separate ticket)
- Real-time admin notifications
- Server-side CSV streaming (client-side CSV is fine for current data sizes)
