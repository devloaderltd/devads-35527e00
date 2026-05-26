## Goal
Bring back the glass stats card on the homepage shown in the screenshot:
- 122 Active listings (Sparkles icon)
- 10 Trusted sellers (Users icon)
- 664 Cities covered (MapPin icon)
- 100% Free to post (ShieldCheck icon)

## Findings
`src/routes/index.tsx` still has everything wired except the render:
- `siteStats` query already fetches `listings`, `sellers`, `cities` counts.
- `TrustTile` helper component is still defined at the bottom of the file.
- Icons (`Sparkles`, `Users`, `MapPin`, `ShieldCheck`) are already imported.
- Only the JSX block that renders the card is missing.

## Change
Edit `src/routes/index.tsx` only — add a `<section>` right after the empty-state "No listings yet" block (and before the `cityId && (<>` fenced rails) that renders a glass card with a 1-column (mobile) / 4-column (md+) grid of `TrustTile`s:
- `siteStats?.listings ?? '—'` → "Active listings"
- `siteStats?.sellers ?? '—'` → "Trusted sellers"
- `siteStats?.cities ?? '—'` → "Cities covered"
- `100%` static → "Free to post"

Card uses existing `glass` / `rounded-[2rem]` styling to match the rest of the page (and the screenshot's frosted look). Always visible, regardless of whether a city is selected.

## Out of scope
- No backend / query changes (counts already work).
- No new components, no design-token changes.
- No changes to other routes.