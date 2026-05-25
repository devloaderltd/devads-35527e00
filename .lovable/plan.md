## Goal
On the listing details page, "Similar listings" should only show ads from the same city as the current listing — never cross-city.

## Change
In `src/routes/listings.$id.tsx` (the similar-listings query, lines 79–101):

- Add `.eq("city_id", listing!.city_id)` to the Supabase query so the database only returns same-city, same-category, active listings (excluding the current one).
- Require `listing?.city_id` in `enabled` so the query doesn't fire before the city is known.
- Remove the client-side same-city/other-city merge — just return the first 4 rows from the query result.
- Keep ordering by `bumped_at desc` and the limit of 4.

## Result
The "Similar listings" section will render only ads from the same city as the listing being viewed. If there are no other active listings in that city + category, the section hides (existing `similar.length > 0` guard already handles this).
