## Balanced upgrade pass — admin, dashboard, front-end

A focused set of high-impact additions across all three surfaces. No payments/auth changes, no schema breaks (only additive columns + 1 new table for listing_views aggregation if needed). Existing dark theme & Marketly brand preserved.

### 1. Analytics & charts

**User dashboard (`/dashboard`)**
- Per-listing analytics panel: views/contacts/favorites over the last 30 days using `listing_events` (already exists).
- Conversion ratio (views → contacts) and best-performing listing highlight.
- "Compare last 30d vs prior 30d" deltas on KPI tiles.

**Admin (`/admin`)**
- New "Insights" section: signups, listings, GMV, top categories/cities, funnel (views→contacts→sold).
- Revenue breakdown by promotion type (featured vs bump) with stacked bars.
- Date-range selector (7/30/90d).

Server fns added: `getListingAnalytics(listingId, range)`, `getAdminInsights(range)` in `src/lib/extras.functions.ts` / `admin.functions.ts`.

### 2. Listing page + SEO upgrades

`src/routes/listings.$id.tsx`:
- Image gallery: keyboard nav, swipe on mobile, thumbnail strip, proper lightbox with arrows.
- Breadcrumbs (Home › Category › City › Title).
- "Similar listings" rail (same category & city, exclude current).
- Share buttons (copy link, X, Facebook, WhatsApp, email) + Web Share API on mobile.
- Sticky contact card on desktop.
- Per-listing `head()` meta with og:image from first image + JSON-LD `Product` schema.

Sitewide SEO:
- Expand `/api/public/sitemap.xml` to include category + city pages.
- Add `head()` meta to `/search`, `/sellers/$id` with dynamic titles.

### 3. Homepage upgrades (`src/routes/index.tsx`)

- Featured carousel sourced from `listing_promotions` where type='featured'.
- Category tiles grid (already partial) → make it the primary nav block with counts.
- "New in {city}" section + "Popular in {country}".
- Site banner band reading from `site_banners` (table exists).
- Trust strip (stats: listings, sellers, cities) + clearer CTA to /post.

### 4. Admin bulk actions & CSV exports

`/admin/listings`, `/admin/users`, `/admin/payments`:
- Row checkboxes + "Select all on page".
- Bulk bar: Approve / Suspend / Delete (listings); Ban / Unban / Reset pwd (users).
- "Export CSV" button — generates client-side CSV from current filtered query.

Server fns: `bulkUpdateListings`, `bulkUpdateUsers` in `admin.functions.ts` (additive, RLS via existing `requireAdmin` middleware).

### Technical notes

- All server-side work via existing `createServerFn` + `requireAdmin` / `requireSupabaseAuth` patterns — no edge functions.
- No new auth, no new payment provider, no destructive migrations.
- One small migration: add index on `listing_events(listing_id, created_at)` for analytics perf; optionally add `listings.contact_count` cached column updated by trigger.
- Recharts already in project — reuse.
- CSV exports done client-side (no new deps).

### Out of scope (this pass)

- Notification preferences / email digests
- Seller profile editor revamp
- Reviews moderation tools
- Realtime everywhere

Happy to roll these in as a follow-up pass.
