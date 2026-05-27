## Goal
Polish the admin settings page responsiveness (Promotion pricing + AssetUploader) and lock it in with visual regression tests so future edits can't silently reintroduce overflow.

## Scope
- `src/routes/admin.settings.tsx` (Promotion pricing grid + AssetUploader)
- New Playwright visual regression test for `/admin/settings` at multiple viewports
- Minimal Playwright config / scripts wiring if not already present

No server function, schema, or business logic changes.

## Changes

### 1. Promotion pricing — clean phone stacking
In `admin.settings.tsx` Promotion pricing Panel:
- Grid stays `grid-cols-1 sm:grid-cols-2` but add `min-w-0 gap-3 sm:gap-4` and `[&>*]:min-w-0` so each Field cell can shrink.
- Wrap each numeric `<Input>` in a `relative` container and render a unit suffix (`USD` / `days`) as an absolutely positioned, `pointer-events-none` chip on the right (`right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500`). Input gets `pr-12` so digits never collide with the suffix.
- Inputs get `w-full text-sm` (currently inherits a base size that crowds at 360–393px) and `tabular-nums` for aligned digits.
- `Field` label gets a `flex items-baseline justify-between` row so an optional inline hint (e.g. small "(0–9999)") can sit beside the label without a second line. Error text keeps `break-words text-xs text-red-400` and gains `leading-snug`.

Result at 393px: Featured price / Featured days / Bump price / Bump cooldown each occupy a full row, suffix visible inside the field, no horizontal scroll.

### 2. AssetUploader — standardized thumb + spacing
In the `AssetUploader` component:
- Replace the bare `h-14 w-14` thumb with a token-driven sizing block:
  - Logo: `h-16 w-16`
  - Favicon: `h-10 w-10` (centered inside an `h-16 w-16` slot so both uploaders have the same outer row height)
- Introduce a `thumbSize` prop (`"logo" | "favicon"`) so the parent picks the correct preview size. Outer slot is always `h-16 w-16 flex-shrink-0` → row heights match across breakpoints.
- Container: keep `w-full min-w-0`. Outer card row becomes `flex min-w-0 items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5` (gap bumped from 2 → 3, padding standardized).
- Text column: `flex min-w-0 flex-1 flex-col gap-1.5`, button row stays `flex flex-wrap gap-1.5`, hint uses `break-words text-[11px] leading-snug text-slate-500 line-clamp-2` so it never pushes height past the thumb on tablet/desktop.
- Label row uses `flex items-center justify-between` so we can show the byte limit as a small chip on the right (e.g. `≤ 1 MB`) instead of duplicating it in the hint.
- Both uploaders wrapped in `min-w-0` (already present) — keep.

Parent (Branding grid) call sites updated to pass `thumbSize="logo"` and `thumbSize="favicon"`.

### 3. Visual regression tests
Add Playwright + `toHaveScreenshot` based visual regression covering the admin settings page.

Files:
- `playwright.config.ts` (create if missing): single project, `baseURL` from `PLAYWRIGHT_BASE_URL` (defaults to `http://localhost:3000`), `expect.toHaveScreenshot.maxDiffPixelRatio: 0.01`, snapshot dir `tests/visual/__screenshots__/`.
- `tests/visual/admin-settings.spec.ts`: a single test that
  1. Signs in as a seeded admin (reuse existing admin login route — use `storageState` produced by a small `tests/visual/global-setup.ts` that calls `/admin/login` with seed credentials from env `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`).
  2. Navigates to `/admin/settings`, waits for "Site settings" heading.
  3. Iterates viewports `[360×740, 393×740, 768×1024, 1280×800]` and runs `await expect(page).toHaveScreenshot(...)` for each, masking the live preview block (so dynamic site name/email text doesn't cause flakes).
- `package.json` scripts: `"test:visual": "playwright test"`, `"test:visual:update": "playwright test -u"`.
- `.gitignore`: add `test-results/` and `playwright-report/`.

Baselines: the first `bun run test:visual:update` after the layout changes generates the canonical PNGs under `tests/visual/__screenshots__/admin-settings.spec.ts/`. Document this in a short `tests/visual/README.md` (how to run, when to update baselines, masking conventions).

### 4. Verification
1. Manually at 360 / 393 / 768 / 1280 widths:
   - Promotion pricing: each input full-width on phone, suffix visible inside field, no horizontal scroll, errors wrap below.
   - Branding: Logo (64px thumb) and Favicon (40px thumb in 64px slot) rows align; hint text wraps to max 2 lines.
2. `bun run test:visual` passes against committed baselines.
3. No TS errors, no changes to validation/save/upload logic.

## Technical details
- Playwright is not currently a dep — install via `bun add -D @playwright/test` and `bunx playwright install --with-deps chromium` in the test environment.
- Visual tests are opt-in (not wired into the build) to avoid CI flakiness from font rendering differences; run locally + in a dedicated visual job.
- Masking: use `mask: [page.locator('[data-vr-mask]')]`. Add `data-vr-mask` to the maintenance preview card and any time-sensitive UI.

## Out of scope
- Server functions, new settings fields
- Redesign of Branding/Maintenance panels
- Other admin pages (test scaffold is reusable later)
