# Fix admin mobile overflow

## Root cause

All four screenshots show the same symptom: the admin content is shifted/clipped on the left with empty space on the right. That's horizontal scroll on the main content area. A few children are wider than the 393px viewport and there's no overflow guard, so the whole page scrolls sideways and every header/title looks cut.

The widest offenders:
- `AdminShell` → `SidebarInset` / `<main>` have no `min-w-0` or `overflow-x` guard, so any oversized child stretches the column.
- `admin/listings`: action buttons row (`View · Gift bump · Gift featured`) is in the same flex row as the title; with three pill buttons it pushes total width past the viewport and squeezes the title to one-char-per-line.
- `admin/debug`: shadcn `TabsList` with 4 icon+label triggers (`Client errors`, `Server logs`, `Health`, `DB inspector`) is wider than 393px and doesn't scroll.
- `AdminTableToolbar`: search input has `min-w-[14rem]` (224px) + filter + `Export CSV` in one row → overflows on narrow phones.
- `admin/settings`: `AdminPageHeader` actions (`Discard` + `Publish changes`) sit beside a long title; the Publish button doesn't shrink.
- `admin/maintenance`: "Demo accounts" `SeedDemoButton` lives inside an `Action` row whose left text doesn't truncate, so the trigger pill gets shoved off.

## Fix

1. `src/components/admin/AdminShell.tsx`
   - Add `min-w-0` to `SidebarInset` and to `<main>`, plus `overflow-x-hidden` on `<main>` as a safety net so a single oversized child can't break the layout.

2. `src/components/admin/ui.tsx` (`AdminPageHeader`)
   - Wrap the title block in `min-w-0 flex-1` and add `break-words` so long titles wrap instead of forcing width.
   - Let the actions row shrink (`shrink-0` only on individual buttons, container `flex-wrap`).

3. `src/routes/admin.listings.tsx`
   - Change the list-row layout: stack title and action buttons vertically on mobile (`flex-col sm:flex-row`), and put the actions on their own wrapping row below. Add `min-w-0` + `break-words` on the title cell so "Vintage Ford Escort MK2 …" no longer renders one character per line.

4. `src/routes/admin.debug.tsx`
   - Make `TabsList` horizontally scrollable on small screens: wrap it in `<div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">` and add `w-max` / `whitespace-nowrap` to triggers so they don't wrap or clip.

5. `src/components/admin/AdminTableToolbar.tsx`
   - Drop `min-w-[14rem]` on the search wrapper (use `min-w-0 flex-1 basis-full sm:basis-auto`) so it takes a full row on mobile and the filter + Export CSV wrap to a second row cleanly.

6. `src/routes/admin.settings.tsx`
   - In the header `actions`, allow buttons to wrap: `flex flex-wrap gap-2`, and make `Publish changes` not force width (no fixed min-width). Title already wraps once header is fixed (step 2).

7. `src/routes/admin.maintenance.tsx` (`Action` helper)
   - Switch to `flex-wrap` with `min-w-0 flex-1` on the text block so the trigger button drops to a new line on narrow screens instead of overflowing.

No changes to data, server functions, routing, auth, or seed logic. Pure CSS / layout fixes scoped to the admin shell and the four affected pages.

## QA
- After edits, recheck at 393px viewport: each page should fit with no horizontal scrollbar, titles fully visible, tabs scrollable, listing titles wrapping as words.

## Out of scope
- Visual redesign of cards, dashboard data, KPI tiles, sidebar, or any non-admin route.
