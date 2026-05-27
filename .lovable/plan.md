# Preview before Post

Currently, clicking **Post listing** immediately charges the wallet and publishes the ad. We'll insert a preview step so users can review (and edit) before any charge happens.

## New flow

1. User fills the form.
2. Primary button now says **Preview Post** (no charge, no DB write).
3. A preview screen appears showing exactly how the listing will look once live, plus a clear cost breakdown.
4. User can:
   - **Edit** → returns to the form with all values intact (photos, text, city, promote selection).
   - **Post ad** → wallet is charged and the listing goes live (existing submit logic runs here).

## UI changes (`src/routes/_authenticated.post.tsx`)

- Add local state `mode: "edit" | "preview"` (default `"edit"`).
- Rename the existing submit button to **Preview Post**. Clicking it runs client-side validation only (same checks already in `submit`) and switches `mode` to `"preview"`. No network call, no charge.
- Render a new `<ListingPreview />` panel when `mode === "preview"`, hiding the form. The preview shows:
  - Cover + photo carousel (from in-memory `previewUrl`s and existing photos).
  - Title, description, category, city/cities, contact info — styled to match the public listing detail card.
  - Promotion badges if Featured / Bump selected.
  - **Cost summary** card (post fee, promo fee, total, wallet balance, remaining after charge) — reuse the totals block currently inside the form.
  - Two buttons at the bottom: **Edit** (back to form) and **Post ad** (runs the real submit → charges wallet → publishes → navigates to the new listing, same as today's `Post listing` action).

## New component

- `src/components/post/ListingPreview.tsx` — pure presentational component, receives form values, photo previews, totals, wallet balance, and `onEdit` / `onConfirm` callbacks. Built to mirror the live listing layout so what the user sees is what gets published.

## Out of scope

- No backend / pricing / payment logic changes — the existing charge + publish path runs unchanged when the user confirms from the preview.
- No changes to bump security work already shipped.
