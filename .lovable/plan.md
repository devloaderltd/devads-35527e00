## 1. Slug system for listings

URLs become `/listings/my-iphone-15-pro-a1b2c3` instead of `/listings/<uuid>`.

**Database migration** on `public.listings`:
- Add `slug text` column, unique.
- Add SQL function `generate_listing_slug(_title text)` that lowercases, strips non-alphanumerics to `-`, trims, truncates to ~60 chars, and appends a 6-char random suffix to guarantee uniqueness.
- Add `BEFORE INSERT` trigger that auto-fills `slug` when null, using the title.
- Backfill: `UPDATE listings SET slug = generate_listing_slug(title) WHERE slug IS NULL`.
- Make `slug` `NOT NULL` after backfill, add unique index.

**Route refactor** — rename `src/routes/listings.$id.tsx` to `src/routes/listings.$slug.tsx`:
- Look up by `slug` instead of `id` (`.eq("slug", slug)`).
- Keep all existing logic (recently viewed, contact reveal, related, etc.) — only the lookup key changes.
- Add a redirect-compatibility branch: if the param looks like a UUID, fetch by id, then `navigate({ to: "/listings/$slug", params: { slug }, replace: true })` so old URLs still work and 301-style redirect to the new URL.

**Link/ref updates** — replace every `to="/listings/$id" params={{ id: l.id }}` with `to="/listings/$slug" params={{ slug: l.slug }}`. Files: `ListingCard`, `ExpiringSoonCard`, `RecentlyViewedRail`, `index.tsx`, `_authenticated.dashboard.tsx`, `_authenticated.my-listings.tsx`, `_authenticated.favorites.tsx`, `_authenticated.messages.$threadId.tsx`, admin pages, and the post-create redirect in `_authenticated.post.tsx`. Every query that selects listings adds `slug` to the projection.

**Post-create** (`_authenticated.post.tsx`): after insert, navigate to the returned `slug`.

## 2. Sitemap

Both `src/routes/sitemap[.]xml.tsx` and `src/routes/api/public/sitemap[.]xml.ts` currently emit `/listings/${id}`. Update both to:
- Select `slug, updated_at` from `listings`.
- Emit `${BASE}/listings/${slug}`.

Keep the existing static routes, categories, cities entries. No structural change otherwise.

## 3. Cookie banner sticky-after-accept

Root cause: `useConsent` initializes `useState(() => getConsent())` which on SSR returns `null` (no `window`). After hydration the effect's `sync()` runs, but the local `dismissed` state in `CookieConsent` is only set on the current session — a fresh page load with consent already stored should hide via `consent != null`. The current code does that, but the banner stays visible because `CookieConsent` returns the banner during the brief hydration window and (the user's report) doesn't re-hide on storage-backed consent on subsequent visits. Likely the storage write inside `save()` is happening but the SSR snapshot keeps showing the banner until the effect; combined with the `cityDialogOpen` guard, the banner can re-mount visible.

Fix in `src/components/CookieConsent.tsx` + `src/lib/cookie-consent.ts`:
- Add a `hydrated` flag in `useConsent` (set true inside the effect). Export it.
- In `CookieConsent`, render `null` until `hydrated` is true — prevents the SSR/hydration flash that the user perceives as "always showing".
- Keep the existing `consent || dismissed → null` short-circuit so once accepted, the banner stays gone on every subsequent navigation.
- Also call `save()` synchronously **before** `setDismissed(true)` so the write to localStorage happens before any re-render, and ensure the `EVENT_NAME` listener catches it on other open tabs.

No visual changes to the banner UI.

## Files touched

- new migration: add `slug`, function, trigger, backfill, unique index
- `src/routes/listings.$id.tsx` → renamed to `src/routes/listings.$slug.tsx` (with UUID-compat redirect)
- `src/routes/sitemap[.]xml.tsx`, `src/routes/api/public/sitemap[.]xml.ts`
- `src/components/ListingCard.tsx`, `ExpiringSoonCard.tsx`, `RecentlyViewedRail.tsx`
- `src/routes/index.tsx`, `_authenticated.post.tsx`, `_authenticated.dashboard.tsx`, `_authenticated.my-listings.tsx`, `_authenticated.favorites.tsx`, `_authenticated.messages.$threadId.tsx`
- admin routes that link to listings (`admin.listings.tsx`, `admin.moderation.tsx`, `admin.reports.tsx`, `admin.broadcasts.tsx`)
- `src/lib/cookie-consent.ts`, `src/components/CookieConsent.tsx`

Out of scope: no changes to reviews, auth, payments, or other features.
