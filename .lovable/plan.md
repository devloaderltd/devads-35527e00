## Fix mobile footer alignment

**Problem:** On mobile, the footer renders as a single column. The link sections (Marketplace, Company, Legal, Stay in touch) each contain short text that only fills the left side, leaving a large empty area on the right.

**Fix:** Update `src/components/Footer.tsx` grid layout so mobile uses a 2-column grid for the link sections while the brand block spans full width on top.

### Changes

1. Outer grid: `grid gap-10 md:grid-cols-12` → `grid gap-8 grid-cols-2 md:grid-cols-12`
2. Brand block (logo + tagline + socials): add `col-span-2 md:col-span-4` so it spans the full width on mobile and 4/12 on desktop.
3. Each link section (`Marketplace`, `Company`, `Legal`): keep `md:col-span-2`, add nothing extra — they naturally take 1 of 2 columns on mobile.
4. "Stay in touch" block: `md:col-span-2` + `col-span-2 md:col-span-2` so it spans both columns on mobile (since it has a longer paragraph + CTA) — or keep single column; will pick whichever looks cleaner.
5. Bottom bar (`© …` + legal links row): no changes needed; already flex-wraps.

### Files
- `src/components/Footer.tsx` (single edit to the grid wrapper + column-span classes)

No business logic, no other components touched.