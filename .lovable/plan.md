## Goal

Reviews already exist (table `seller_reviews`, server fns, `SellerReviews` component on `/sellers/$id`), but there's no entry point from the user dashboard and the listing detail page only shows a rating badge. This plan completes the surface area.

## What's missing

1. The dashboard sidebar has a "Reviews" link pointing to `/dashboard?tab=reviews`, but the dashboard tabs are only Overview / Performance / Listings — clicking it goes nowhere.
2. Sellers can't see, in one place, the reviews buyers left them, with rating breakdown and the ability to respond.
3. There's no "Reviews I've written" view for buyers.
4. Listing detail page (`/listings/$id`) shows only the rating badge — no clickable path to the reviews section on the seller profile.

## Changes

### 1. New Reviews tab on `/dashboard`

Add a `reviews` tab to `src/routes/_authenticated.dashboard.tsx`, opened by default when URL has `?tab=reviews`. Contents:

- **Summary card**: average rating, total count, 5→1 star distribution bar chart (built from `seller_reviews` where `seller_id = me`).
- **Received reviews** list: each row shows reviewer name + avatar, stars, body, photos, date. If no seller response yet, an inline "Respond" textarea + Save button. If response exists, show it below with edit option.
- **Reviews I wrote**: collapsible list of reviews where `reviewer_id = me`, with edit / delete buttons (reuse existing `submitSellerReview` / `deleteMyReview`).

### 2. Two new server functions in `src/lib/extras.functions.ts`

- `listMyReceivedReviews` — returns reviews where `seller_id = auth.uid()`, joined with reviewer profile.
- `listMyAuthoredReviews` — returns reviews where `reviewer_id = auth.uid()`, joined with seller profile.
- `respondToReview({ reviewId, response })` — updates `response` + `response_at` on a review where `seller_id = auth.uid()`. Adds an RLS policy allowing sellers to update only the `response` / `response_at` columns of reviews left for them.

### 3. Listing detail page — link the rating badge

In `src/routes/listings.$id.tsx`, wrap the existing `SellerRatingBadge` so it's a `Link` to `/sellers/$id#reviews`, and add a small "See all reviews →" link next to it. Add `id="reviews"` to the `SellerReviews` wrapper on the seller page so anchor scrolling works.

### 4. Header user menu — quick link

Add a "My reviews" item in the user dropdown (`src/components/Header.tsx`) that opens `/dashboard?tab=reviews`.

## Database

One migration:

- Add RLS policy on `seller_reviews` so a seller can update `response` and `response_at` on reviews where `seller_id = auth.uid()` (existing policies only allow the reviewer to update).

## Not touching

- Existing `SellerReviews` write/edit/delete flow on `/sellers/$id` — works already.
- Review photos upload — already supported via `photo_urls`, no change needed.
- Admin reviews moderation page — separate concern, already exists.
