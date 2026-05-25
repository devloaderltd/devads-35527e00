# Broad feature pass: admin + dashboard + front-end

A coordinated expansion across the three areas you picked. Grouped so related DB, server, and UI work ship together.

## 1. Schema additions (one migration)

New tables (all with RLS):
- `listing_events` — per-listing event log (`view`, `favorite`, `message`, `contact_reveal`). Powers listing analytics + admin charts.
- `saved_searches` — user-owned: `query`, `filters jsonb`, `notify boolean`, `last_notified_at`.
- `notifications` — user-owned: `type`, `title`, `body`, `link`, `read_at`, `metadata`.
- `seller_reviews` — `seller_id`, `reviewer_id`, `listing_id`, `rating 1-5`, `body`, unique per (reviewer, seller, listing).
- `homepage_slots` — admin-curated: `position` (hero/featured/banner), `listing_id?`, `image_url?`, `title`, `cta_url`, `sort_order`, `active`.
- `site_banners` — admin promo banners: `message`, `cta_label`, `cta_url`, `variant`, `active`, `starts_at`, `ends_at`.

Indexes on `listing_events(listing_id, created_at)`, `notifications(user_id, read_at)`, `seller_reviews(seller_id)`.

## 2. Admin panel

- **Analytics dashboard** (`/admin` upgrade): time-range selector (7/30/90d) + charts via Recharts — signups, new listings, revenue (payments+topups), top categories, top cities, DAU. Server fn aggregates from existing tables.
- **Bulk actions**: checkbox selection on `/admin/users`, `/admin/listings`, `/admin/reports`. Actions: bulk ban/unban, bulk delete listings, bulk mark reports resolved, bulk feature listings. CSV export buttons on users, listings, reports, wallets (extends existing payments export).
- **Moderation queue**: new `/admin/moderation` page consolidating pending reports + flagged listings. Approve/reject with reason; queues a notification to the listing owner (uses `notifications` table; if email infra exists, also sends).
- **Featured & banners**: new `/admin/homepage` page to manage `homepage_slots` (drag-sort, add/remove, pick listing or upload image) and `site_banners` (live preview, schedule window).

## 3. User dashboard

- **Listing analytics** (`/dashboard` + per-listing view): views over time, favorites, message count, contact reveals. Chart per listing + table of top performers.
- **Saved searches & alerts**: "Save this search" button on `/search`. `/dashboard/saved-searches` to list, toggle alerts, delete. Cron (pg_cron, hourly) matches new listings against saved filters and inserts notifications.
- **Notifications center**: bell icon in header with unread count, dropdown of recent items, `/dashboard/notifications` full page. Realtime subscribe via Supabase channel.
- **Public seller profile + reviews**: upgrade `/sellers/$id` with rating average, review list, "Leave a review" (only buyers who messaged the seller can review), verified badge if `email_verified_at` set, share button.

## 4. Public front-end

- **Richer search** (`/search`): price min/max, condition multi-select, date posted, sort (newest/oldest/price asc/desc/most viewed), pagination, URL-state-driven (`useSearch`), "Save this search" CTA.
- **Homepage sections**: hero (from `homepage_slots`), featured listings strip, "Trending this week" (by `listing_events` 7d), "New near you" (by city), category tiles with counts, optional banner.
- **Listing page upgrades**: swipeable image gallery with lightbox, "Similar listings" (same category + city), share button (native share / copy link), safety tips collapsible, contact reveal button that logs a `listing_events` row.
- **SEO & sitemaps**: per-listing `head()` with title/description/OG image from cover photo + JSON-LD `Product`; per-category and per-city head metadata; `/sitemap.xml` route enumerating active listings, categories, cities, sellers; `robots.txt` allowing all + sitemap reference.

## 5. Cron jobs

- `match-saved-searches` — hourly, calls `/api/public/cron/match-saved-searches` (authed via apikey) to fan out notifications.
- `expire-promotions` — daily cleanup of expired `listing_promotions` (already partially handled, formalize).

## Out of scope

- Payment provider work (no new providers/flows).
- Real ratings moderation workflow beyond owner-can-report.
- Mobile app / push notifications (in-app only).
- Redesigning existing shells or auth flows.
- Translating UI / i18n.

## Technical notes

- All server logic via `createServerFn` with `requireAdmin` / `requireSupabaseAuth`. Public sitemap is a server route under `/api/public/`.
- Charts use Recharts (already a shadcn dep).
- Realtime: enable publication on `notifications` only.
- Email: notifications are in-app first; only wire email sending if domain is already configured (skip otherwise — no setup prompts in this pass).
- Reuse existing `audit_log` for every admin write (bulk and single).
- Bulk endpoints validate `ids: string[]` with `z.array(z.string().uuid()).max(500)`.

This is ~3 migrations of work and ~25 new/edited files. After approval I'll execute in this order: migration → server fns → admin pages → dashboard pages → public pages → cron + sitemap.
