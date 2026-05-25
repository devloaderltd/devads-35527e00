## Fill the empty space under the image gallery

On `/listings/$id`, the left column ends at the thumbnail strip while the right column keeps going, leaving a large empty gap (visible in the screenshot). I'll move/duplicate detail content into the left column so it fills naturally on all viewports.

### Changes (single file: `src/routes/listings.$id.tsx`)

Below the thumbnails in the left column, add a stacked content block:

1. **Description card** — move the listing description out of the right column into a card here ("Description" heading, `whitespace-pre-wrap`). Right column keeps title/price/chips/seller card only, so it stays compact and aligned with the gallery.
2. **Details grid** — small 2-col key/value list: Category, Condition, Location (city, region, country), Posted (relative + exact date), Views, Listing ID (short).
3. **Safety tips card** — short bullet list ("Meet in a public place", "Inspect before you pay", "Never wire money or share codes", "Report suspicious listings") with a link to the existing Report dialog trigger.
4. **Share & save row** — keep the existing Save/Share buttons in the right column; no duplication.

All cards reuse existing styles (`iridescent-border`, `rounded-2xl`, `bg-white/65 backdrop-blur-xl`, `shadow-[var(--shadow-float)]`) so the look matches the seller card. No new dependencies, no backend changes, no schema changes.

### Out of scope
- No new routes, no new components, no design system tokens added.
- No changes to similar-listings section or lightbox.
