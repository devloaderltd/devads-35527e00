# Frontend & User Dashboard — Missing Features Audit + Upgrade Plan

Based on a sweep of `src/routes/`, `src/components/` and the DB schema. Grouped by area, with each item flagged **[High]**, **[Med]** or **[Low]**.

## 1. Search & discovery (`/search`)
What's missing today:
- No **price range** filter (min/max), no **age range**, no **verified-only** toggle, no **with-photos-only** toggle, no **promoted-only** filter — schema supports all of these but UI exposes only category/country/city/condition.
- Sort options are just `recent / oldest` — no **price asc/desc**, **most viewed**, **most favorited**, **ending soon**, **closest-to-me**.
- No **grid / list view** toggle, no **map view** (cities have a region but coords aren't stored — map can come later).
- No **infinite scroll or "load more"** — only numbered pagination.
- No **recent searches** chip rail above the bar.
- No **"no results" empty state** with suggestions (broaden filters, browse category, etc.).

Plan:
- Extend `searchSchema` with `minPrice`, `maxPrice`, `minAge`, `maxAge`, `verified`, `hasPhotos`, `promoted`, and add `sort` values `price_asc | price_desc | views | favorites | ending`.
- Add a **collapsible filter sheet** (mobile drawer / desktop sidebar) with the new fields. Keep the active-filter chip rail.
- Add a **view toggle** (grid/list) persisted in URL.
- Replace pagination with **"Load more" infinite query** while keeping a `?page=` deep link.
- Add **empty-state component** with "Clear filters" + category suggestions.
- Add **recent searches** rail (read from `localStorage`, max 6).

## 2. Listing detail (`/listings/$id`)
What's missing:
- No **make-offer** flow even though the schema has `is_negotiable` and `listing_price_history` exists.
- No **price history chart** (data already collected by `track_listing_price_change`).
- No **"Report this listing"** button visible above the fold (component exists, just needs to be wired into the action bar).
- No **breadcrumbs** for SEO (`Home › Category › City › Title`).
- No **"Save to compare"** toggle directly on the page (only on cards).
- No **schema.org Product/Offer JSON-LD** with price/availability (it has BreadcrumbList only).
- Sticky **contact / message bar** on mobile is missing — important on a 393-wide viewport.

Plan:
- Add a **MakeOfferDialog** that opens a thread with a templated first message and stores the offer amount in `messages.body`.
- Add **PriceHistorySparkline** querying `listing_price_history`.
- Add **Sticky mobile action bar** (Message · WhatsApp · Save) pinned to bottom.
- Add **BreadcrumbsNav** + JSON-LD with `Product` + `Offer`.
- Surface **Report / Block seller** in a single `…` menu.

## 3. Dashboard (`/dashboard`)
Today it has: KPIs, charts, performance, wallet, listings table, reviews. Gaps:
- **Goals & insights** — no "best day to post", "your CTR vs category avg", "your response rate".
- **Conversion funnel** view (views → contact reveals → messages → reviews) — data exists in `listing_events`.
- No **"Profile strength" score** with actionable nudges in one card (only basic completion).
- No **referral / invite** card even though `referrals` + `referral_codes` tables exist.
- No **CSV export** for the listings table or wallet history.
- No **notification preferences** quick toggles on dashboard (only in profile).

Plan:
- Add **`FunnelCard`** computing `view → contact_reveal → message` per period.
- Add **`InsightsCard`** with response rate, avg time-to-reply, best-performing category, peak hour.
- Add **`ReferralCard`** (auto-create code if none, copy/share link, show invited count + earned credit).
- Wire **Export CSV** buttons on the listings tab and the wallet panel using the existing `lib/csv.ts`.

## 4. My Listings (`/my-listings`)
Gaps:
- No **search box** to filter within own listings.
- No **multi-select bulk actions** beyond the bottom action bar — needs "Mark sold", "Delete", "Renew" in one place.
- No **duplicate listing** action.
- No **promote (feature/bump)** entry point from the row (`PromoteDialog` exists but isn't wired here).
- No **draft auto-save** indicator.

Plan:
- Add a **search input** (client-side filter on title).
- Wire `PromoteDialog`, `Duplicate`, `Mark sold`, `Delete` into `ListingRowActions`.
- Add a **bulk "Promote selected"** option when multiple active rows selected.

## 5. Messages
Gaps:
- Per-thread: no **search** within a thread, no **attachment / image** support, no **typing indicator broadcast** (state exists locally but isn't sent), no **read receipts UI** (DB supports `show_read_receipts`).
- Inbox: no **filter tabs** (Unread / Archived / Muted), no **bulk archive**, no **block user** action.
- No **canned replies dropdown** in the composer (component `QuickRepliesManager` exists in profile but isn't connected to the composer).

Plan:
- Add **read-receipt double-tick** + last-read timestamp (use existing `thread_reads`).
- Add **canned reply picker** in the composer (insert text from `message_quick_replies`).
- Add **filter tabs** (All / Unread / Archived) and **bulk archive/mute**.
- Realtime **typing broadcast** via supabase `presence` channel.

## 6. Profile (`/profile`)
Gaps:
- No **public profile preview** link/button.
- No **social links** field (Instagram/Twitter/Tiktok handles).
- No **languages spoken** field for international marketplaces.
- No **availability hours** for sellers (useful for contact expectations).
- No **delete account** action (account settings has it? — verify and add if missing).

Plan:
- Add **"View as public"** button linking to `/sellers/$id`.
- Add new profile fields `social_links jsonb`, `languages text[]`, `availability jsonb` (migration in next pass; UI scaffolded behind feature flag if needed).
- Confirm/expose **delete account** in `AccountSettingsCard`.

## 7. Seller page (`/sellers/$id`)
Gaps:
- No **review summary** rail at top (stars, count breakdown).
- No **active categories** chip rail.
- No **"Contact seller"** button independent of a specific listing.
- No **sold listings** history toggle.

Plan:
- Add **rating distribution bars** (5★ ... 1★).
- Add **category chips** derived from active listings.
- Add **direct-message button** that opens a new thread on the seller's most recent listing.

## 8. Global UX polish
- Header search is **desktop-only** — add a mobile search trigger (icon → sheet).
- No **global command palette** (⌘K) for power users.
- No **PWA install prompt** / manifest visible — check `__root.tsx` head.
- **Footer** lacks "How it works", "Safety tips", "Pricing", "Help".
- Loading: `BrandLoader` exists but `sellers.$id`, `compare`, `_authenticated.verify`, and some admin pages still render the plain `Loading…` string.

Plan:
- Mobile **search sheet** in `Header.tsx`.
- **CommandPalette** component (Cmd/Ctrl-K) covering "Post", "My listings", "Dashboard", category jumps, recent searches.
- Swap remaining `Loading…` texts to `<BrandLoader variant="block" />`.

## 9. Trust & safety
- No **verified seller filter** on search, no **verification badge** on `ListingCard` (data exists: `listings.verified_at`).
- No **report-confirmation toast with status link**.
- No **block-user** UI (`user_blocks` table is unused on the client side).

Plan:
- Show **verified badge** in `ListingCard` and `SellerRatingBadge`.
- Add **"Block seller"** option in listing detail and seller page; filter blocked sellers out of search/feed.

---

## Phasing (so it ships in slices)
- **Phase 1 (1 PR, biggest win):** Search filters & sorts + view toggle + sticky mobile action bar on listing detail + verified badge.
- **Phase 2:** Dashboard insights (funnel, referral, CSV export) + My-Listings bulk actions, duplicate, promote.
- **Phase 3:** Messages (read receipts, canned replies, typing presence, filter tabs).
- **Phase 4:** Profile/seller polish (public preview, rating distribution, category chips, contact-seller).
- **Phase 5:** Global polish (mobile search sheet, ⌘K palette, finish loader swaps, footer links).

## Technical notes
- Most features map to existing tables — only **Phase 4** needs a small migration (`profiles.social_links jsonb`, `languages text[]`, `availability jsonb`) and **Phase 9** needs an index on `listings.verified_at` if we add a verified filter.
- All new fetches go through TanStack Query with `useQuery`/`useSuspenseQuery` (per `tanstack-query-integration`). No new server functions unless aggregation is needed (funnel, insights — likely yes via `createServerFn` reading `listing_events`).
- Realtime additions (typing presence) use supabase channels already wired in the message route.

## Out of scope
- Map view with coords (no lat/lng yet — schema change + geocoding).
- Multi-currency, multi-language i18n.
- Native mobile apps.

Approve and tell me which phase to ship first (default: **Phase 1**).