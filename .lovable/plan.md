## Goal
Remove the listing item **price** and **currency** from the post form, listing displays, search filters, saved searches, admin listings, and seed data. Wallet, promotion pricing, and admin payment money stays untouched (platform money, not listing price).

## DB migration
Drop `price` and `currency` columns from `public.listings`.

## Post form — `src/routes/_authenticated.post.tsx`
- Remove `price` and `currency` state, the Price `<Input>`, and the Currency `<Select>`.
- Drop `price` / `currency` from the insert payload.

## Listing detail — `src/routes/listings.$id.tsx`
- Remove `price`/`currency` from the select, remove `priceFmt` and the `{priceFmt}` chip in the hero, remove `offers` block from JSON-LD.

## Listing card — `src/components/ListingCard.tsx`
- Remove `price`/`currency` from the type and the price badge (`{priceFmt}`). Replace the price chip with nothing (clean image), so cards are visual + title + location only.

## Home — `src/routes/index.tsx`
- Drop `price, currency` from the select. Remove `heroPrice` and any UI referencing it.

## Search — `src/routes/search.tsx`
- Remove `priceMin`/`priceMax` from schema and query string.
- Remove `price_asc` / `price_desc` sort options (and the related `.order("price", …)` branches).
- Remove the Min/Max price inputs, the price chip in active filters, and the meta description "by category, city, price and condition" → "by category, city and condition".
- Drop `price`/`currency` from the listings select.

## Saved searches
- `src/lib/extras.functions.ts` — remove `priceMin`/`priceMax` from the Zod filters schema.
- `src/routes/_authenticated.saved-searches.tsx` — remove the price summary span.
- `src/routes/api/public/cron/match-saved-searches.ts` — remove `priceMin`/`priceMax` from the `Filters` type, remove `.gte/.lte("price", …)`, drop `price, currency` from the select.

## Other listing reads
- `src/routes/_authenticated.my-listings.tsx`, `src/routes/_authenticated.favorites.tsx`, `src/routes/sellers.$id.tsx`, `src/routes/admin.listings.tsx` — remove `price`/`currency` from selects and any UI line that prints them (admin listings: drop the `"${currency} ${price}"` chunk from the meta line).

## Seed data
- `src/lib/seed-demo.server.ts` — remove `price` from the sample type/array and drop `price` / `currency: "USD"` from the insert payload.

## Out of scope (untouched)
- `payments`, `wallets`, `crypto_topups`, `site_settings.featured_price_usd / bump_price_usd`, `PromoteDialog`, `wallet.functions.ts`, `nowpayments-ipn.ts`, admin payments/topups/settings pages, terms/privacy copy.

## Notes
- DB column drop is destructive; existing price data on listings will be lost (intentional per request).
- `src/integrations/supabase/types.ts` regenerates automatically after the migration.
