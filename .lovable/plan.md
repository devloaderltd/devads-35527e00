# Implementation plan

Five deliverables, scoped tightly to avoid drift. Each one is independent and can be cut if you want a smaller batch.

## 1. Automated smoke tests (Playwright)

Extend the existing `tests/e2e/` Playwright suite (already has `post-listing.spec.ts` and `bump.spec.ts`). Add:

- `tests/e2e/post-listing-images.spec.ts` — signs in as a seeded test user, opens `/post`, uploads 2 small fixture images from `tests/fixtures/`, validates the oversize/wrong-type rejection toast path, submits, and asserts the new listing renders with both images on `/listings/$id`.
- `tests/e2e/admin-moderation.spec.ts` — signs in as a seeded admin (uses `SUPABASE_SERVICE_ROLE_KEY` in test setup to grant the role), hides a listing, unhides it, suspends/unsuspends a user, asserts `audit_log` row is written.
- `tests/e2e/search-filters.spec.ts` — visits `/search`, applies category + city + price range, asserts URL is canonicalized, results filter, and "Clear all" resets.
- New `tests/e2e/global-setup.ts` — seeds a deterministic test user + admin via service role, idempotently. Teardown deletes the rows.
- Add `test:e2e` and `test:e2e:ui` scripts. Wire `playwright.config.ts` `testDir` to include `tests/e2e` alongside the existing visual project.

Not in scope: CI workflow files — the suite is runnable locally and ready for whatever CI is added later.

## 2. Build + lint + TypeScript verification

- Run `bun run lint`, `bun x tsc --noEmit`, and `bun run build` in sequence; fix any breakage exposed by the recent recovery/session work.
- Manually exercise the recovery overlay by dispatching `window.dispatchEvent(new CustomEvent("chunk-reload"))` and `chunk-reload-failed` from the browser console, and exercise the session watcher by calling `supabase.auth.signOut()` while on a protected page.
- Capture results in `.lovable/plan.md` as a short "verification" section so the next agent doesn't redo it.

## 3. Client + server error monitoring with dashboards

Already partly in place: `src/lib/error-reporter.ts` POSTs to `/api/public/client-errors`. Extend rather than replace.

- DB: new migration adding `server_errors` table (mirrors `client_errors` shape) and a `error_events_daily` view aggregating both by day/severity/route. GRANTs + RLS scoped so only admins can `SELECT`.
- Server: wrap `errorMiddleware` in `src/start.ts` to also insert into `server_errors` via `supabaseAdmin`. Capture serverFn name, route, user id, message, stack.
- Source maps: enable `build.sourcemap: "hidden"` in `vite.config.ts` so stacks are resolvable but maps aren't publicly listed. Document the upload step (manual for now — no Sentry dep added unless you ask).
- Admin dashboard: new `/admin.errors.tsx` route with two tabs (client / server), KPI tiles for last 24h/7d, severity filter, route filter, expandable stack, "mark resolved" toggle. Powered by serverFns querying the new view + base tables.
- Auth failures: `client_errors` already captures these via the error reporter; add a "kind" column (`chunk_reload`, `auth`, `query`, `unhandled`) inferred at insert time so the dashboard can split them.

Not in scope: Sentry/Datadog integration (would change the architecture; I'll do it if you say so).

## 4. Moderation queue with reasons + audit export

- DB migration: `moderation_actions` table (`id`, `actor_id`, `target_type` listing|user|review, `target_id`, `action` hide|unhide|suspend|unsuspend|delete|approve, `reason_code` enum, `reason_note text`, `created_at`). Reason codes: `spam`, `nudity`, `scam`, `harassment`, `illegal`, `duplicate`, `other`. Triggers also write into existing `audit_log` so nothing else breaks.
- Server fns: extend existing admin moderation fns (`adminHideListing`, `adminBanUser`, etc.) to require `{ reasonCode, reasonNote? }`. Reject the call if reasonCode missing. Backfill via a wrapper so existing callers stay typed.
- UI: refactor `admin.moderation.tsx` into a true queue (pending reports + active actions tabs). Each destructive action opens a `<ReasonDialog>` (radio reason codes + optional note + "notify user" checkbox). The dialog is shared by the listings and users admin pages.
- Export: new `/api/public/admin/audit-export.csv` server route (admin-gated via signed token in query string, generated from an admin page button). Streams CSV of `audit_log` joined with `moderation_actions` over a date range. Also a JSON variant for compliance dumps.
- Audit-trail panel on listing/user detail pages, filtered to that target.

## 5. SEO for listing pages

- Listing routes already use `listings.$id.tsx` and the DB has `slug` + `generate_listing_slug`. Add canonical slug routing: `/listings/$slug` (new file) that loads by slug and 301s `/listings/$id` to the slug URL when one exists. Keep `$id` for backward compat.
- Per-route `head()` on the listing page: title `${title} — ${city} — Callescort24`, meta description from listing excerpt, `og:title`/`og:description`/`og:url`/`og:type=product`, `og:image` from first listing photo, canonical link. Driven by loader data.
- JSON-LD: `Product` schema with `offers`, `image`, `brand`/`seller`, plus `BreadcrumbList` (Home → Category → City → Listing) via `scripts` array.
- Sitemap: both `src/routes/sitemap[.]xml.tsx` and `src/routes/api/public/sitemap[.]xml.ts` already exist (duplicate). Consolidate to the public one, have the top-level route 301 to it, and switch listing URLs to slug form. Add `<image:image>` extension for the cover photo.
- `robots.txt`: confirm `Sitemap: https://callescort24.org/api/public/sitemap.xml` line is present; add if missing.
- Add `next`/`prev` link tags on `/search` pagination for crawl efficiency.

## Technical notes

```
DB migrations (3):
  1. server_errors + error_events_daily view + client_errors.kind column
  2. moderation_actions table + reason_code enum + trigger to audit_log
  3. (none for SEO — slug column already exists)

Files added:
  tests/e2e/global-setup.ts
  tests/e2e/post-listing-images.spec.ts
  tests/e2e/admin-moderation.spec.ts
  tests/e2e/search-filters.spec.ts
  tests/fixtures/{small.jpg, big.jpg, bad.txt}
  src/components/admin/ReasonDialog.tsx
  src/routes/admin.errors.tsx
  src/routes/listings.$slug.tsx
  src/routes/api/public/admin/audit-export.csv.ts
  src/lib/moderation.functions.ts
  src/lib/errors.functions.ts

Files edited:
  playwright.config.ts (add e2e project)
  package.json (add test:e2e scripts)
  vite.config.ts (sourcemap: "hidden")
  src/start.ts (server error capture in errorMiddleware)
  src/routes/admin.moderation.tsx, admin.listings.tsx, admin.users.tsx
  src/routes/listings.$id.tsx (head() + JSON-LD + slug redirect)
  src/routes/api/public/sitemap[.]xml.ts (slug URLs, image extension)
  src/routes/sitemap[.]xml.tsx (redirect to public)
  public/robots.txt
```

## Out of scope

- Sentry / Datadog SDK integration
- CI pipeline files
- Auto-translating listing pages
- Schema markup for non-listing pages (can follow in a second pass)

## Suggested order if you want to split

1 (smoke tests) → 2 (build verify) → 5 (SEO, smallest surface) → 4 (moderation queue) → 3 (error monitoring, biggest).

Reply with "go" to build all five, or e.g. "just 1, 2, 5" to scope down.