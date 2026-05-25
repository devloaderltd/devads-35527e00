## Goal
Replace the "More from this seller" section on the single listing page with a "Similar listings" section.

## Definition of "similar"
Pick active listings (excluding the current one) that match the same `category_id`, prioritized by:
1. Same `city_id` first (most relevant), then fallback to same category in any city if not enough results.
2. Order by `bumped_at` desc.
3. Limit 4 (or up to 8 if available, then trim to 4 for grid).

Optional bonus: prefer listings within ±50% of current `price` when price is set, but keep this as a soft filter (only apply if it still returns ≥4 results) to avoid empty states.

## Technical changes (single file: `src/routes/listings.$id.tsx`)

1. Replace the `more` useQuery (currently keyed on seller `user_id`) with a `similar` useQuery:
   - `queryKey: ["similar-listings", listing?.id, listing?.category_id, listing?.city_id]`
   - `enabled: !!listing?.category_id`
   - Strategy: one query that selects active listings where `category_id = current`, `id != current`, ordered by `bumped_at desc`, limit 8. Then in JS, sort city matches first, slice to 4.
   - Select shape unchanged (id, title, price, currency, bumped_at, cities, listing_images, listing_promotions) so `ListingCard` keeps working.
2. Also select `category_id` and `city_id` on the main listing query if not already (verify; add if missing).
3. Rename the rendered section heading from "More from this seller" → "Similar <span class='gradient-text'>listings</span>".
4. Update variable name `more` → `similar` for clarity.

## Out of scope
- Backend RPC / DB function (pure client query, fast enough at this scale).
- Search/filter UI changes.
- Recommending across categories.
- Saving impressions/clicks for recs.

## Files touched
- `src/routes/listings.$id.tsx` (only)
