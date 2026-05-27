## Goal
Stop hint text and input groups from overflowing the Branding panel on small screens, and keep the Logo/Favicon uploaders visually aligned across breakpoints.

## Scope
Single file: `src/routes/admin.settings.tsx`. No business logic, no schema, no server function changes.

## Changes

### 1. `AssetUploader` container
- Wrap the outer `<div>` with `w-full min-w-0` so it can shrink inside its grid cell instead of pushing the panel wider.
- Change inner row from `flex items-center gap-2` to `flex items-start gap-2 min-w-0` — `min-w-0` lets the text column actually wrap instead of forcing horizontal overflow (this is the root cause of the current overflow on 393px screens).
- Preview thumb: keep `h-14 w-14 flex-shrink-0`, no change.
- Text column: keep `flex min-w-0 flex-1 flex-col gap-1`, but:
  - Change button row from `flex gap-1.5` to `flex flex-wrap gap-1.5` so Replace + Remove wrap to a second line when the cell is narrow.
  - Hint `<p>` gets `break-words leading-snug` and font bumped to `text-[11px]` for readability; remove the implicit single-line behavior.
- Label gets `block truncate` so a long "Favicon"/"Logo" label never blows the cell width (defensive).

### 2. Branding panel grid
- The uploader grid stays `grid-cols-1 sm:grid-cols-2` but add `gap-3 sm:gap-4` and `min-w-0` on the grid container so children can shrink.
- Add `[&>*]:min-w-0` (or apply `min-w-0` directly on each `AssetUploader` instance via a wrapper) to guarantee neither column overflows.

### 3. Page-level spacing for small screens
- Outer `<div className="grid gap-4 lg:grid-cols-2">` → `grid gap-3 sm:gap-4 lg:grid-cols-2` (tighter gutters on phones).
- `Field` label: add `text-xs sm:text-sm` so labels don't crowd the right edge at 360–393px widths.
- `Field` error text already `text-xs` — add `break-words` so long validation messages wrap.
- Inputs inside Field: add `text-sm` on the small-screen path is already inherited; no change needed.

### 4. Promotion pricing grid
- Change `grid grid-cols-2 gap-3` to `grid grid-cols-1 gap-3 sm:grid-cols-2` so the four numeric inputs stack on phones (currently they crush at 393px). Each Field already has its own label/error.

### 5. AdminPageHeader actions row
- No structural change. The header's action buttons (`Discard`, `Publish changes`) already wrap via `flex-wrap` in `AdminPageHeader`.

## Verification
1. Open `/admin/settings` at 393×655 (current viewport) — confirm:
   - Hint text under Logo/Favicon wraps inside the card, no horizontal scroll.
   - Replace/Remove buttons wrap to a second line cleanly.
   - Promotion pricing inputs stack one per row.
2. Resize to 768 and 1280 — Logo and Favicon uploaders remain equal-width side by side, hint text on one line.
3. No new TS errors; no changes to validation, save flow, or upload logic.

## Out of scope
- Server function changes
- New fields
- Visual redesign of the Branding panel
