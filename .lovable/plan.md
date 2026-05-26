# Fix admin dashboard layout overflow

## Problem
On `/admin`, the `SeedDemoButton` is a full `Card` (Demo accounts panel) rendered inside the `AdminPageHeader` `actions` slot. The header is a `flex-wrap` row meant for small controls (range toggle, buttons). A full card in that slot overflows the page on mobile (393px viewport) and visually sits on top of the dashboard content — exactly what the screenshot shows.

## Fix
Convert `SeedDemoButton` into a compact header control:

1. Render only a small pill button in the header: `[icon] Demo accounts`, matching the style of the existing range toggle / outline buttons (`rounded-full border-white/20 bg-white/5`).
2. Clicking it opens a `Dialog` (shadcn) containing the existing card body: description, "Rotate & reveal credentials" button, hide/show toggle, known emails list, and the rotated credentials panel. All current rotation logic and `runDemoSeed` server-fn behavior stays the same.
3. Inside the dialog, drop the outer `Card`/`CardHeader`/`CardTitle` wrapper (the Dialog provides the title and chrome). Keep the inner content blocks unchanged.
4. Make the dialog content `max-w-md` with `max-h-[85vh] overflow-y-auto` so the credentials list scrolls on small screens.

No other admin routes change. No backend, server-fn, or seed logic changes.

## Files
- `src/components/admin/SeedDemoButton.tsx` — wrap existing UI in a `Dialog`, replace outer `Card` with a compact `DialogTrigger` button.

## Out of scope
- Dashboard data, KPI tiles, charts, range toggle.
- Other admin pages.
- Seed endpoint / credential rotation behavior.
