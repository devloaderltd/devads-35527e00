## Massive Update — Seller Workspace + Buyer Discovery + AI

A focused, shippable upgrade across the dashboard, frontend, and intelligence layer. No existing flows are broken — everything is additive.

---

### 1. New unified Seller Workspace

Replace the scattered `_authenticated.*` pages with a real workspace shell at `/dashboard` using a collapsible **shadcn Sidebar** with these sections:

- **Overview** — KPI tiles (active listings, views 7d, messages 7d, wallet balance, conversion rate), 30-day views/messages line chart, expiring-soon list, top-performing listings, recent activity feed.
- **Analytics** — per-listing funnel (views → favorites → contact reveals → messages), traffic source breakdown, hour-of-day heatmap, CTR vs category average, exportable CSV.
- **Listings** — current `/my-listings` with bulk actions kept intact.
- **Messages** — current threads page mounted in the workspace.
- **Promotions** — buy/schedule Featured + Bump, auto-renew toggle per listing, scheduled bumps (cron via `pg_cron` + `/api/public/cron/bumps`).
- **Wallet** — current wallet + transactions + low-balance auto top-up alert.
- **Reviews** — incoming reviews, response feature, rating breakdown.
- **Settings** — existing account settings card.

Mobile: sidebar collapses to bottom tab bar on small screens.

---

### 2. Buyer-side discovery upgrades

- **Personalized home**: "Recommended for you" rail driven by recently viewed + favorited categories/cities (server fn).
- **Recently viewed** rail (localStorage + server-backed when signed in).
- **Follow seller** — new `seller_follows` table, follow button on `sellers/$id`, notifications on new listing.
- **Price drop alerts** — track `listings.price` history in `listing_price_history`, notify favoriters on drop.
- **Map view** on `/search` (Leaflet + OpenStreetMap, no API key) toggle next to grid/list.
- **Distance sort** when user grants geolocation.
- **Compare drawer** — pick up to 4 listings, side-by-side spec table.
- **Smart filters** chips synced to URL for shareable searches.

---

### 3. AI Assistant (via Lovable AI Gateway — no extra keys)

Surfaces in the existing flows, all server functions calling `google/gemini-2.5-flash`:

- **AI Listing Writer** in `/post` — generates title + description + tags from a photo and 1-line hint.
- **Smart pricing suggestion** — analyzes recent sold/active listings in same category+city, returns a range.
- **Auto-categorization** — suggests category from title/description.
- **Reply suggestions** in messages — 3 contextual draft replies on the seller side.
- **Image alt-text** — generated on upload, improves SEO + a11y.
- **Search rewriter** — turns "blue sofa under 300 in Berlin" into structured filters.

---

### 4. Trust & reputation

- **Verified badges** — phone-verified, email-verified, ID-verified (manual admin toggle for now); shown on cards & seller pages.
- **Review photos** — extend `seller_reviews` with `photo_urls text[]`.
- **Public seller stats** — response time avg, response rate, active since.
- **Block user** — `user_blocks` table; blocked users can't message or see your listings.

---

### 5. Engagement & growth

- **Referral program** — unique referral code per user; both sides get $5 wallet credit on first successful top-up.
- **Saved-search digests** — daily email of new matches (uses existing `saved_searches.notify`).
- **Push-style in-app notification center** — already exists; add categories + bulk mark-read.
- **Onboarding checklist** card on dashboard — "Add avatar", "Verify phone", "Post first listing", "Top up wallet".

---

### 6. Frontend polish

- Global **command palette** (`⌘K`) — search listings, jump to dashboard sections, quick post.
- Skeleton loading states for every dashboard widget.
- Dark-mode pass on dashboard.
- Empty states with illustrations + CTA on every dashboard tab.

---

### Database additions (one migration)

- `seller_follows (follower_id, seller_id, created_at)` — RLS: users manage their own follows; public read for counts via server fn.
- `user_blocks (blocker_id, blocked_id, created_at)` — RLS: users manage own.
- `listing_price_history (listing_id, price, changed_at)` — trigger on `listings` update.
- `listings.price numeric` + `listings.is_negotiable boolean` — currently missing; needed for pricing UI.
- `listings.verified_at`, `profiles.phone_verified_at`, `profiles.id_verified_at`.
- `seller_reviews.photo_urls text[]` + `seller_reviews.response text` + `seller_reviews.response_at`.
- `referral_codes (user_id, code unique)` + `referrals (referrer_id, referred_id, status, credited_at)`.
- `dashboard_events` view aggregating `listing_events` for fast widget reads.
- `pg_cron` job hitting `/api/public/cron/bumps` every 10 min for scheduled promotions.

All policies follow existing pattern (`auth.uid()` + `has_role`).

---

### Server functions (all `createServerFn`)

`getDashboardOverview`, `getListingAnalytics`, `getRecommendations`, `followSeller` / `unfollowSeller`, `blockUser` / `unblockUser`, `aiWriteListing`, `aiSuggestPrice`, `aiSuggestCategory`, `aiSuggestReplies`, `generateReferralCode`, `redeemReferral`, `scheduleBump`, `setAutoRenew`, `exportAnalyticsCsv`.

Public server route: `/api/public/cron/bumps` (HMAC-signed).

---

### Shipping order (single big update, ~6 logical batches)

1. **DB migration** + sidebar shell at `/dashboard` with Overview tab.
2. Analytics tab + per-listing analytics drawer.
3. Promotions tab (auto-renew, scheduled bumps) + cron route.
4. AI assistant suite (Listing Writer, Pricing, Replies, Alt-text).
5. Buyer discovery (recommendations, recently viewed, follow seller, price history, map view).
6. Trust & growth (badges, blocks, referrals, review photos, command palette, polish).

Each batch is independently usable — if you want to stop after batch 3 the site still works and ships value.

---

### What I'm NOT touching

- Payment provider (NOWPayments stays).
- Auth (OAuth was just added).
- Admin pages (separate concern).
- Pricing/packaging changes.

---

### Open question before I start

The plan assumes "go big across all 4 themes." If you'd rather focus on **one** of (Seller Workspace / Buyer Discovery / AI / Trust & Growth) I'll cut scope accordingly. Otherwise reply "ship it" and I'll start with batch 1 (DB migration + dashboard sidebar shell + Overview tab).
