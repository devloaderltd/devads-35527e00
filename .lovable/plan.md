# Fix: Featured tile missing on mobile homepage

## Problem
On the homepage bento grid (`src/routes/index.tsx`), the large Featured tile renders on desktop but is missing on mobile in some sessions (e.g. before a city is picked, or while the listings query is loading). The placeholder fallback uses `hidden md:block`, so mobile collapses to nothing instead of showing the tile.

## Root cause
`heroFeatured = pinnedListing ?? featured[0] ?? listings?.[0] ?? globalFeatured` can be `undefined` when:
1. The listings query is still loading (no city or in-flight) AND
2. `globalFeatured` hasn't resolved yet OR returned null.

When that happens, the JSX falls through to the empty `<div className="hidden md:block …" />`, which renders nothing on mobile.

## Fix (frontend-only, `src/routes/index.tsx`)

1. **Broaden the global fallback trigger** so it runs whenever no concrete hero pick exists yet — not just when listings is empty:
   - Change `needGlobalFallback` to `!pinnedId && !featured[0] && !listings?.[0]` (drops the `(!listings || listings.length === 0)` gate that prevented the fallback from running while the city query was loading).

2. **Render a mobile-visible skeleton** instead of `hidden md:block` while `heroFeatured` is not yet resolved, so mobile shows a placeholder card (matching the tile's rounded glass styling) and swaps in the real featured listing once any query resolves. On desktop it keeps occupying the 2×2 slot.

3. **Keep the existing resolution order** (`pinnedListing → featured[0] → listings?.[0] → globalFeatured`) — no business-logic change, only visibility/loading behavior.

## Out of scope
- No changes to homepage-config, listings schema, or queries beyond the one `enabled` condition.
- No changes to tiles 2–4 or other sections.

## Verification
- Mobile preview (393px): featured tile visible immediately (skeleton → real listing).
- Desktop preview: unchanged behavior, no layout shift in the 2×2 slot.
- City picked vs not picked: tile renders in both states.
