## Goal

Give admins deeper control of the site and a real-time error/debug surface, all inside the existing `/admin` shell.

## New admin pages

1. **`/admin/banners`** — manage `site_banners` (CRUD: message, variant, CTA, start/end, active toggle, preview).
2. **`/admin/notifications`** — broadcast notifications: send to one user, a role, or all users; insert into `notifications` via a new `adminBroadcastNotification` server fn.
3. **`/admin/reviews`** — moderate `seller_reviews` (list, filter by rating, delete abusive reviews, audit-logged).
4. **`/admin/threads`** — read-only view of `message_threads` + last messages for abuse investigation; ability to delete a thread.
5. **`/admin/maintenance`** — friendly toggle for `site_settings.maintenance_mode` + message, cache/version info, "clear stale topups" action, re-run demo seed.
6. **`/admin/debug`** — Error & Debug Center (see below).

## Error & Debug Center (`/admin/debug`)

Tabs:
- **Live errors**: client errors captured from a new `window.onerror` / `unhandledrejection` reporter that POSTs to `/api/public/client-errors` (HMAC-signed from the app, stored in new `client_error_logs` table). List newest 200, filter by route/severity, mark resolved.
- **Server function logs**: paginated view of a new `server_fn_logs` table populated by a `withLogging` middleware wrapping admin serverFns (records fn name, user, duration, status, error message).
- **Audit log**: reuse existing `getAuditLog` with better filters (actor, action, date range, target).
- **Health**: calls a new `getSystemHealth` serverFn returning DB row counts, pending topups, failed payments (last 24h), open reports, unresolved errors, last cron run. Renders status pills (OK/warn/fail).
- **DB inspector** (admin-only, read-only): dropdown of safe tables → shows last 50 rows via a new `adminPeekTable` serverFn with a strict allow-list of table names + columns (no PII columns).

## Schema (one migration)

- `client_error_logs` (id, created_at, user_id null, route, message, stack, user_agent, severity, resolved bool) — RLS: admins select/update, public insert only via signed route.
- `server_fn_logs` (id, created_at, fn_name, user_id, duration_ms, status, error) — RLS: admins select.
- `admin_broadcasts` (id, created_at, actor_id, audience, title, body, link) — audit of what was sent.
- Indexes on `created_at desc`, partial index on unresolved errors.

## Server functions (added to `src/lib/admin.functions.ts`)

- `listBanners`, `upsertBanner`, `deleteBanner`
- `adminBroadcastNotification({ audience: 'all'|'role:user'|'user:<id>', title, body, link })`
- `listReviewsAdmin`, `deleteReviewAdmin`
- `listThreadsAdmin`, `deleteThreadAdmin`
- `getSystemHealth`, `listClientErrors`, `resolveClientError`, `listServerFnLogs`, `adminPeekTable`
- `withLogging` middleware applied to all mutating admin fns

## Public route

- `src/routes/api/public/client-errors.ts` — POST, HMAC-verified with new `CLIENT_ERROR_REPORT_SECRET`, Zod-validated, inserts into `client_error_logs`. Rate-limited via simple per-IP throttle in handler.

## Client wiring

- `src/lib/error-reporter.ts` — installs global listeners (guarded by env), batches + signs payloads, no PII.
- Mount once from `src/routes/__root.tsx`.
- New sidebar entries in `AdminSidebar.tsx` for Banners, Broadcasts, Reviews, Threads, Maintenance, Debug.
- Reuse existing `AdminShell` styling; pages built with current `ui.tsx` primitives.

## Out of scope

- Email/SMS broadcast delivery (notifications table only).
- Replacing existing pages — only additions and the sidebar update.
- Editing user PII beyond what current admin fns already allow.

## Secret needed

- `CLIENT_ERROR_REPORT_SECRET` (will request via `add_secret` at build time).

## Files

**New**: 6 route files (`admin.banners.tsx`, `admin.broadcasts.tsx`, `admin.reviews.tsx`, `admin.threads.tsx`, `admin.maintenance.tsx`, `admin.debug.tsx`), `api/public/client-errors.ts`, `src/lib/error-reporter.ts`, 1 migration.
**Modified**: `src/lib/admin.functions.ts`, `src/components/admin/AdminSidebar.tsx`, `src/routes/__root.tsx`.
