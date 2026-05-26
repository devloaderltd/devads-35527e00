## Goal

Add the full rating + write-review UI to the listing detail page. Today the listing page shows only an average badge plus a "See all reviews →" link, so visitors have to navigate to the seller page to submit a star rating.

## What's already in place

The `SellerReviews` component (`src/components/SellerReviews.tsx`) is a complete reviews block: average + distribution bars, 1–5 star picker, write/edit/delete form, list of past reviews, and the "you can review after messaging" gate. It's currently only rendered on `/sellers/$id`.

## Change

### `src/routes/listings.$id.tsx`
- Import `SellerReviews` from `@/components/SellerReviews`
- Render `<SellerReviews sellerId={listing.user_id} />` as a new section just after the "Similar listings" block (around line 480), wrapped in `<div id="reviews" className="scroll-mt-24">` so the existing `#reviews` deep link still works
- Replace the "See all reviews →" link target from `/sellers/${listing.user_id}#reviews` to the in-page `#reviews` anchor so users stay on the listing

No backend/schema changes — server functions (`listSellerReviews`, `canReviewSeller`, `submitSellerReview`, `deleteMyReview`) already exist and are used by the same component.

## Marked features

The previously circled item (dashboard "Workspace" sidebar) was already removed in the last turn. No other features are flagged in this message — if there are more, please point them out and I'll remove them in a follow-up.

## Out of scope

- Per-listing reviews (current model is seller-level reviews)
- Changes to the seller page reviews section