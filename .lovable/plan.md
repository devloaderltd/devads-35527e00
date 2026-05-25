# Dark Mode + User & Admin Dashboards + Demo Accounts

## 1. Dark mode toggle

- Add a `ThemeProvider` (`src/lib/theme-context.tsx`) that toggles `class="dark"` on `<html>`, persists to `localStorage`, respects system preference on first load.
- Add a `ThemeToggle` button (sun/moon icon from lucide) in the existing `Header.tsx` (next to city selector / auth area).
- Verify `src/styles.css` has `.dark` token overrides; if missing, add a complete dark palette mirroring the existing semantic tokens (background, foreground, card, primary, muted, border, etc.) in oklch.
- Wire the provider once in `src/routes/__root.tsx`.

## 2. User dashboard (`/dashboard`)

Route group: `src/routes/_authenticated/dashboard.*` (uses existing auth guard layout).

Pages/tabs:
- **Overview**: KPI cards — Total listings, Active listings, Total views, Total favorites received, Unread messages.
- **My Listings**: table with status, views, favorites, bumped_at, quick actions (edit/delete/mark sold).
- **Analytics**: 
  - Line chart: views over last 30 days (per-listing aggregated).
  - Bar chart: views per listing (top 10).
  - Pie chart: listings by category.
- **Messages**: list of threads with last message preview, unread count.
- **Favorites**: grid of saved listings.
- **Profile**: edit display_name, bio, phone, avatar, city.

Data via `createServerFn` with `requireSupabaseAuth`:
- `getUserDashboardStats` — aggregates from `listings`, `favorites`, `messages`.
- `getUserListings` — user's listings with image and category joins.
- `getUserViewsTimeseries` — views grouped by day (uses listings.view_count snapshot + bumped_at as proxy; see "Data caveats" below).

Charts: **recharts** (already common in shadcn templates; install if absent).

## 3. Admin dashboard (`/admin`)

Route group: `src/routes/_authenticated/admin.*` with an additional admin-role check in `beforeLoad` (calls a `requireAdmin` server fn that uses `has_role(auth.uid(), 'admin')`); non-admins redirect to `/dashboard`.

Pages/tabs:
- **Overview KPIs**: Total users, Total listings (by status), Total payments revenue, Open reports, Active promotions, New signups (7d / 30d).
- **Analytics charts**:
  - Line: new users per day (30d) — from `profiles.created_at`.
  - Line: new listings per day (30d).
  - Bar: listings per category.
  - Bar: listings per city (top 10).
  - Stacked bar: payments revenue per day by promotion_type.
  - Donut: listing status distribution (active/sold/expired/draft).
- **Users**: paginated table of profiles + role, search by display_name/email, action to promote/demote admin/moderator.
- **Listings**: moderation table (filter by status, search), actions: delete, change status.
- **Reports**: open reports queue, mark resolved.
- **Payments**: recent payments, filter by status/provider.
- **Promotions**: active promotions list.

Server fns (admin-gated middleware `requireAdmin` that wraps `requireSupabaseAuth` + has_role check):
- `getAdminOverview`, `getAdminTimeseries`, `getAdminUsers`, `setUserRole`, `getAdminListings`, `moderateListing`, `getAdminReports`, `resolveReport`, `getAdminPayments`, `getAdminPromotions`.

## 4. Demo accounts

Seed via a one-off SQL migration that inserts into `auth.users` is NOT allowed; instead create a small **server route** `POST /api/public/seed-demo` (guarded by a `DEMO_SEED_TOKEN` secret) that:
- Creates `demo@dev.ads` (password `DemoUser123!`) and `admin@dev.ads` (password `AdminUser123!`) via `supabaseAdmin.auth.admin.createUser` (email confirmed).
- Inserts `user_roles` row with role `admin` for the admin account.
- Inserts ~5 sample listings + images + a couple favorites/messages for realistic dashboard data.
- Idempotent: skip if users already exist.

Run once after deploy by `curl`-ing with the token. Credentials documented in chat after seeding.

## 5. Navigation

- Header: when signed in, show avatar dropdown with "Dashboard", "Admin" (only if admin role), "Sign out".
- Dashboard pages use a left sidebar (shadcn `Sidebar`) with the tabs above.

## Data caveats

- Per-day view timeseries: the schema only has `listings.view_count` (cumulative). True daily timeseries would need a new `listing_view_events` table. For this plan we'll add that table (listing_id, viewed_at, optional viewer_id) and write to it from `increment_listing_view` so charts are real, not faked.
- New migration adds `listing_view_events` + index on `(listing_id, viewed_at)` + RLS (admins read all; users read events for their own listings; insert via SECURITY DEFINER function only).

## Files

New:
- `src/lib/theme-context.tsx`, `src/components/ThemeToggle.tsx`
- `src/lib/dashboard.functions.ts`, `src/lib/admin.functions.ts`
- `src/integrations/supabase/admin-middleware.ts` (`requireAdmin`)
- `src/routes/_authenticated/dashboard.tsx` (layout) + `dashboard.index.tsx`, `dashboard.listings.tsx`, `dashboard.analytics.tsx`, `dashboard.messages.tsx`, `dashboard.favorites.tsx`, `dashboard.profile.tsx`
- `src/routes/_authenticated/admin.tsx` (layout, role-gated) + `admin.index.tsx`, `admin.users.tsx`, `admin.listings.tsx`, `admin.reports.tsx`, `admin.payments.tsx`, `admin.promotions.tsx`
- `src/components/dashboard/*` (KPI cards, charts, sidebars)
- `src/routes/api/public/seed-demo.ts`
- One migration: `listing_view_events` table + updated `increment_listing_view` to also insert an event row.

Edited:
- `src/styles.css` (dark tokens if missing)
- `src/routes/__root.tsx` (ThemeProvider)
- `src/components/Header.tsx` (ThemeToggle + user menu)

## Out of scope

- Realtime push updates on dashboards (polling/refetch only).
- Email notifications.
- Export to CSV.
- Audit log of admin actions.
