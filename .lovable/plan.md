
## 1. Site settings editor with publish/save workflow + validation (`admin.settings.tsx`, `admin.functions.ts`)

- Add **Zod validation** to `updateSiteSettings` server fn:
  - `featured_price_usd`, `bump_price_usd`: number, 0–9999, max 2 decimals
  - `featured_days`, `bump_days`: integer, 1–365
  - `site_name`: 1–80 chars
  - `support_email`: valid email, ≤120 chars
  - `maintenance_message`: ≤500 chars
  - `maintenance_mode`: boolean
- Settings page UX upgrade:
  - Track dirty state — disable Save when nothing changed.
  - Per-field client-side validation with inline errors (zod resolver pattern, plain `useState` errors map is fine — no need for react-hook-form).
  - "Save changes" runs validation, shows toast errors, and on success invalidates `site-settings` + `promotion-pricing` queries.
  - Add a "Discard" button (resets form to last loaded `s`).
  - Add a "Maintenance preview" banner mock inside the Maintenance panel so admins see what users will see.
  - When `maintenance_mode` is toggled ON, require typed confirmation ("type ENABLE to confirm") before allowing save.

## 2. PromoteDialog loading/error/fallback states (`PromoteDialog.tsx`)

- Replace silent fallback with explicit states from `useQuery({ ...promotion-pricing })`:
  - **Loading**: skeleton plan cards (animated `bg-white/40` blocks) until both `wallet` and `pricing` resolve.
  - **Error**: small inline alert ("Couldn't load latest pricing — using defaults") + a "Retry" button calling `refetch()`. Still allow purchase using hardcoded defaults so the UX doesn't dead-end.
  - **Success**: current layout.
- Add `staleTime: 60_000` to pricing query, retry: 1.
- Disable pay buttons while either query is loading to avoid charging the wrong price.

## 3. Paginated user detail sheet sections (`admin.users.tsx`, `admin.functions.ts`)

- Refactor `getUserDetails` → split into three paginated server fns:
  - `getUserListings({ userId, offset, limit })`
  - `getUserWalletTxs({ userId, offset, limit })`
  - `getUserPayments({ userId, offset, limit })`
  - Keep a light `getUserSummary({ userId })` returning status counts, threadsCount, totals (single round trip on open).
- Each list uses `useInfiniteQuery` with `limit=20`. Append-style "Load more" button at the bottom of each section.
- Sheet header shows totals from summary (e.g. "Listings (42)" instead of `d.listings.length`).
- Status-count badges driven by summary, not by the loaded slice.

## 4. Server-side search + pagination for `/admin/users` (`admin.functions.ts`, `admin.users.tsx`)

- Rewrite `listUsersAdmin`:
  - Inputs: `{ q?: string; filter?: "all"|"admins"|"moderators"|"banned"; page: number; perPage: 25 }`
  - When `q` set: search via `profiles` table with `ilike` on `display_name` + `auth.admin.listUsers` email filter (since auth API has no ilike, fall back to fetching matching profile ids first, then `auth.admin.getUserById` in batch — or use SQL view over `auth.users` if available).
  - Filter `admins`/`moderators`: pre-filter via `user_roles` query, then hydrate.
  - Filter `banned`: requires page through auth users until perPage filled (cap 5 internal pages = 1000 users scanned, return `hasMore=false` after that with a notice).
  - Return `{ users, total, hasMore, page }`.
- Users page UX:
  - Debounced search input (300ms) using `useQuery` keyed on `[q, filter, page]`.
  - Pagination controls: Prev / Next + "Page X of Y" (or `hasMore`-driven Load more).
  - Reset to page 1 on `q`/`filter` change.
  - Show skeleton rows while fetching.

## 5. Enriched admin audit log page (`admin.audit.tsx`, `admin.functions.ts`)

- Upgrade `getAuditLog`:
  - Inputs: `{ q?: string; action?: string; actorId?: string; from?: string; to?: string; page: number; perPage: 50 }`
  - Build query with `.range()` for pagination, `.ilike("action", ...)` for filter, date range on `created_at`.
  - Hydrate `actor_name` (profiles) and, when `target_type === "user"`, `target_name` from profiles; when `target_type === "listing"`, `target_title` from listings.
  - Return `{ entries, total, hasMore, page }`.
- Audit page UI:
  - Filter chips for action category: `wallet.*`, `role.*`, `user.ban|unban`, `listing.grant_*`, `settings.*`, `topup.*`.
  - Search box (action / actor name / target id).
  - Date-range picker (`from` / `to`).
  - Each row: icon by category, actor (linked to user detail sheet), action label (humanized: "Granted admin to …", "Adjusted wallet +$5.00 — 'Refund'", "Banned user for 7 days", "Featured listing 'iPhone 13'"), timestamp + relative time, expandable metadata JSON.
  - Prev/Next pagination + total count in header.

## Validation / hardening notes

- All new server fns keep `requireAdmin` middleware and continue to call `audit(...)` for any state change.
- Pagination caps: `perPage ≤ 100` enforced server-side.
- All text inputs `.slice(maxLen)` defensively in handlers in addition to zod validation.
- No DB schema changes required — `audit_log`, `site_settings`, `wallet_transactions`, `payments`, `listings` already provide everything needed.

## Out of scope

- No new tables, no RLS changes, no payment-provider work.
- No redesign of the admin shell / sidebar / dashboard cards.
- No realtime subscriptions on audit log (polling refetch via React Query is enough).
