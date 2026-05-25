## Goal
Make the user panel and public frontend feel more alive and useful, with **Saved searches + alerts** as the headline feature. Keep changes frontend/UX-focused — no schema changes (the `saved_searches`, `notifications`, and cron route already exist).

## 1. Saved searches + alerts (priority)

**Search page (`src/routes/search.tsx`)**
- Replace the plain "Save this search" button with a dialog: name it, toggle "Notify me of new matches", confirm. Default name = current query / "All in {city}".
- After saving, show a toast with a "View saved searches" link.
- If the same filter combo is already saved, swap the button to "Saved ✓" linking to `/saved-searches`.

**Saved searches page (`src/routes/_authenticated.saved-searches.tsx`)**
- Add header with count, "Run all" disabled until selection.
- Each card: show filter chips (category icon, city, condition, price range), last-notified timestamp ("Checked 2h ago"), "X new since last check" badge driven by `last_notified_at` vs new listings count.
- Inline rename (pencil → input).
- Empty state with illustration + CTA to `/search`.

**Header bell (`src/components/Header.tsx`)**
- Unread `notifications` count badge on the bell icon (poll every 60s or realtime via the existing `notifications` channel if wired).
- Dropdown preview: latest 5 notifications, "Mark all read", link to `/notifications`.

## 2. User dashboard polish (`src/routes/_authenticated.dashboard.tsx`)

- Add a top "Quick actions" row: Post new ad, Top up wallet, Saved searches, View messages.
- Add a "Recent activity" feed (last 10 events from `listing_events` for your listings — view / favorite / message / contact reveal) with relative timestamps.
- Add an "Insights" mini-card per listing on the My Listings tab: views last 7 days sparkline, favorites count, "Promote" CTA if not currently featured.
- Show wallet balance + "Top up" link in the header stats strip.

## 3. My Listings (`src/routes/_authenticated.my-listings.tsx`)

- Status filter chips: All / Active / Expired / Draft.
- Sort dropdown: Newest, Most viewed, Most favorited.
- Per-card action menu: Edit, Bump, Promote (feature), Mark as sold, Delete. Bump and Promote already exist as flows — surface them here.
- "About to expire" warning badge when `expires_at` is within 3 days, with a one-click renew (extends `expires_at` and bumps).

## 4. Messages (`src/routes/_authenticated.messages.*`)

- Show listing thumbnail + title in the thread list rows.
- Unread indicator (bold + dot) — use the existing `messages` rows newer than the thread's `last_read_at` (store this client-side in localStorage keyed by thread id since no DB column exists yet).
- Quick-reply suggestion chips on the thread page ("Is it still available?", "Can you do {price}?", "When can I pick it up?").

## 5. Profile (`src/routes/_authenticated.profile.tsx`)

- Avatar upload using existing `listing-images` bucket (or fall back to a dedicated avatar bucket if simpler — using the same bucket avoids new infra).
- Bio character counter + markdown-safe display on the public seller page.
- Show member-since, rating average (already exists via `seller_reviews`), and total active listings.

## 6. Public frontend polish

**Home (`src/routes/index.tsx`)**
- Add "Recently viewed" rail (read from a small `recentlyViewed` localStorage list updated on listing detail view).
- Add "Trending in {city}" rail — top 8 listings by `view_count` in the last 7 days for the selected city, fallback to global.

**Search (`src/routes/search.tsx`)**
- Sticky filter bar on scroll for mobile (chips: category, city, price, condition, sort).
- Result count + active filter chips (click an X to remove that filter).
- Empty state suggests broadening (clear city) and offers "Save this search" so the user gets notified when something matches.

**Listing detail (`src/routes/listings.$id.tsx`)**
- Image gallery: keyboard arrows + swipe + fullscreen lightbox.
- Sticky bottom action bar on mobile (Message seller, Call/reveal, Favorite, Share).
- "Report listing" hooked into existing `reports` table flow (it already exists — surface a clearer button).
- Breadcrumbs (Home › Category › City › Title) for SEO + JSON-LD Product/Offer schema.

## Out of scope (this turn)
- Reviews/ratings extensions, messaging realtime + image attachments, wallet/promotion flows beyond surfacing existing actions — confirmed by user's feature pick (Saved searches + alerts).
- DB schema changes. The cron route `api/public/cron/match-saved-searches` already exists; if it's not yet scheduled in `pg_cron`, that's a follow-up I'll flag.

## How I'll deliver
This is large — I'll ship it in 3 batches, asking for confirmation between batches:
1. **Saved searches + alerts + header bell** (sections 1 + dashboard quick actions).
2. **My Listings + Messages + Profile** (sections 3, 4, 5).
3. **Home + Search + Listing detail polish** (sections 2 dashboard insights + 6).

After approval, I start with batch 1.
