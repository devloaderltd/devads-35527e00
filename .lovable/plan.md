# Fix 4 homepage issues

## 1. SEO title & description on the home page

**File:** `src/routes/index.tsx` (lines 38–48)

The home route's `head()` overrides the correct sitewide SEO in `__root.tsx` with old "Buy & sell locally" copy — that's why the browser tab still shows the old title.

Replace the meta entries with:
- `title`: `Independent Escorts Near You – Local Escort Directory`
- `description` / `og:description` / `twitter:description`: `callescort24 is an escort directory for adult providers to advertise services, show rates and availability, and connect with paying clients.`
- `og:title` / `twitter:title`: same as title

Root already has the correct copy, so other pages inherit it automatically. No other route files contain the old strings.

## 2. New listings not showing in "Latest" / "Recent"

**File:** `src/routes/index.tsx` (lines 74–95)

Current query filters strictly by the user's selected city (`Mobile` in the screenshot). The new "Ready to fuck" listing is in Denver, so it never appears in Latest. User expects new listings to appear regardless.

Fix: if the in-city query returns 0 listings, run a fallback query without the `city_id` filter (still ordered by `bumped_at desc, created_at desc, limit 24`). Keep city filtering when there ARE city listings, so local relevance is preserved. The `featured` / `bumped` / `recent` split stays the same.

## 3. Featured posts don't slide and show only one

**File:** `src/routes/index.tsx` (lines 391–411)

Two problems:
- Section is gated by `featured.length > 1`, so when there's only one featured listing the carousel is hidden entirely.
- `featured.slice(1)` skips the hero featured, leaving nothing.

Fix:
- Change gate to `featured.length > 0`.
- Render `featured` (not `.slice(1)`) so all featured listings appear in the carousel. The hero showing the same item is fine — that's the intended "featured rail" behavior.
- Also relax basis so single items still look correct and the carousel arrows + drag work on desktop.

## 4. Ad view counts stuck at 0

**File:** `src/routes/listings.$id.tsx` (line 185)

`supabase.rpc("increment_listing_view", ...)` is called without `.then()` / `await`. Supabase JS query builders are lazy thenables — they don't fire the HTTP request until consumed. Verified the SQL function itself works (tested via psql: counter incremented from 0 → 1).

Fix: chain `.then(() => {})` so the request is actually sent:
```ts
supabase.rpc("increment_listing_view", { _listing_id: listing.id }).then(() => {});
```

## Out of scope / not changing
- No DB migrations needed.
- No changes to `__root.tsx` (already correct).
- No changes to other route files — SEO inherits from root.
