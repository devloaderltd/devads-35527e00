# Add Boost Selection on Post Form

Add an optional promotion section to the create-listing form so users can feature and/or bump their post during creation, paid from wallet balance.

## Scope (CREATE only)

- New collapsible "Promote this listing" card on `_authenticated.post.tsx`, visible only in create mode (not edit).
- Two checkboxes:
  - **Feature this listing** — price + duration pulled from `site_settings` (existing `featured_price_usd` / `featured_duration_days`).
  - **Bump to top** — price pulled from `site_settings` (existing `bump_price_usd`).
- Live cost breakdown showing: post fee (cities × price), + feature, + bump = **Total**, plus current wallet balance and remaining-after.
- Disable submit if `total > wallet balance`, with inline warning + link to `/wallet`.

## Flow

1. Pre-flight: `chargeListingPost` (already implemented) debits posting fee.
2. After each listing row insert succeeds (one per selected city), if boosts were selected, call `promoteWithWallet({ listingId, type: 'featured' })` and/or `promoteWithWallet({ listingId, type: 'bump' })` for that listing.
3. If a promotion debit fails mid-loop, surface a toast naming which city/boost failed; the listing itself remains created (no rollback of post fee).

## Pricing source

Read from existing `getSiteSettings` query already loaded in the form (it's the same source the admin Promotion Pricing screen writes to). No new fetch needed.

## Files to edit

- `src/routes/_authenticated.post.tsx` — add state (`boostFeatured`, `boostBump`), cost summary UI, and post-creation boost loop.

## Out of scope

- Editing promotion on existing listings (use existing `PromoteDialog` from listing page).
- Partial refund if a boost fails after posting fee was charged.
- Per-city/per-category promotion price tiers.
