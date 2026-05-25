## Continue the balanced upgrade pass

Picking up from the previous batch (SEO/JSON-LD on listings, dashboard Performance tab, CSV exports on admin tables). Here's what's left from the agreed scope.

### 1. Admin Insights (date-range analytics)
New tab/section on `/admin` with a 7/30/90-day range selector and Recharts:
- KPI cards: signups, new listings, GMV (sum of completed `payments`), active users
- Funnel: views → contacts → favorites (from `listing_events`)
- Revenue split by `promotion_type` (bump vs featured)
- New `getAdminInsights(range)` in `src/lib/admin.functions.ts` (uses `supabaseAdmin` behind `requireAdmin`)

### 2. Admin bulk actions (finish the job)
CSV export already shipped; add the row-selection + bulk bar:
- `/admin/listings`: checkboxes, bulk Approve / Suspend / Delete
- `/admin/users`: checkboxes, bulk Ban / Unban
- New `bulkUpdateListings`, `bulkUpdateUsers` server fns with audit_log entries

### 3. Homepage upgrades (remaining pieces)
Banner + trust strip already shipped. Add:
- Featured carousel from `listing_promotions` where `type='featured'` and active
- Category tiles grid (top-level `categories`) as primary nav
- "New in {city}" rail using the visitor's selected city (fallback: most popular city)
- New `getHomepageData()` server fn returning featured/categories/recent in one call

### 4. Listing page polish (remaining pieces)
JSON-LD, breadcrumbs, keyboard nav already shipped. Add:
- "Similar listings" rail (same category, same city, exclude self, limit 6)
- Share buttons (Web Share API + copy-link fallback)
- Sticky contact card on desktop (≥lg)

### 5. Sitewide SEO
- Add `head()` meta + canonical to `/search` and `/sellers/$id`
- Expand `public/sitemap.xml` (or its generator) to include category and city pages

### Technical notes
- All server work via `createServerFn` + existing `requireAdmin` / `requireSupabaseAuth` middleware
- One migration: index on `listing_events(listing_id, created_at desc)` to keep analytics fast
- No auth, payment, or destructive schema changes
- Reuses Recharts already in the project

### Out of scope (for this pass)
- Notifications UI, public seller-profile editor, reviews moderation, realtime — can be a follow-up.

Approve and I'll implement in this order: migration → admin insights → bulk actions → homepage → listing polish → SEO meta.
