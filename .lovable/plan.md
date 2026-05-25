## Complete remaining admin wiring

Finish the three follow-ups so the admin controls actually drive the rest of the app.

### 1. Wire promotion prices from `site_settings`
- Update `src/lib/wallet.functions.ts` so `purchasePromotion` (and any price-resolving helper) reads `featured_price_usd`, `bump_price_usd`, `featured_days`, `bump_days` from `site_settings` (`id = 'global'`) instead of the hardcoded $9.99 / $2.99 / 7d / 1d.
- Update `src/components/PromoteDialog.tsx` to fetch the same row (via a small `getPromotionPricing` serverFn or a direct `supabase.from('site_settings').select(...)` read — public read policy already exists) so the UI shows live prices/durations.
- Fallback to current defaults if the row is missing.

### 2. Maintenance banner in `__root.tsx`
- Add a `getPublicSiteSettings` serverFn (or reuse the one above) returning `{ maintenance_mode, maintenance_message, site_name, support_email }`.
- In `src/routes/__root.tsx`, fetch once via TanStack Query and render a dismissible top banner when `maintenance_mode = true`.
- Admins (checked via `has_role`) see the banner but are NOT blocked. Non-admins on protected routes (`_authenticated/*`) see a full-page maintenance screen instead of the app.

### 3. User-detail drawer on Users page
- In `src/routes/admin.users.tsx`, add a row action "View" that opens a `Sheet` (shadcn) with:
  - Profile: display_name, email, phone, country, city, created_at, avatar
  - Roles: list + add/remove (admin/moderator/user) via existing role mutations
  - Wallet: current balance + last 10 `wallet_transactions`
  - Listings: count by status + last 5 listings (title, status, created_at)
  - Activity: last 10 `audit_log` rows where `target_id = user.id`
  - Quick actions: Ban/Unban, Send password reset, Adjust wallet (opens existing dialog), Delete user
- New serverFn `getUserDetail(userId)` in `src/lib/admin.functions.ts` aggregating the above in one call (uses `supabaseAdmin`, admin-gated, logged).

### Out of scope
No new tables, no schema changes, no new payment logic. Pure wiring + one drawer.
