
# Plan

Your project already ships most of these features (admin moderation pages, search with filters, login/signup, listing image upload). Plan is split into one new feature, one new UX layer, and three focused audit/hardening passes — not a from-scratch rebuild.

## 1. Recoverable client-error banner (NEW)

Today the chunk-reload helper silently calls `location.replace`. If the auto-reload fails (offline, blocked storage, repeated failure), the user sees a blank "Updating to the latest version…" screen forever.

Build:
- `src/components/RecoveryOverlay.tsx` — fixed top banner + full-screen fallback:
  - States: `reloading` (spinner + "Updating to the latest version…") and `failed` (icon + "We couldn't reload automatically" + **Retry** + **Go home** buttons).
  - Auto-promotes from `reloading` → `failed` after 6s if the page is still alive.
  - Retry: clears the `chunk-reload-attempted` sessionStorage guard, then `location.reload()` with a cache-buster.
- `src/lib/chunk-reload.ts` — add `dispatchChunkReloadEvent()` that fires a `CustomEvent('chunk-reload')` so React can render the overlay even though `location.replace` is queued.
- `src/routes/__root.tsx` — mount `<RecoveryOverlay />` once at the shell level, replacing the bare "Updating…" div in `ErrorComponent`. The overlay also handles global `window.error` / `unhandledrejection` chunk-load events surfaced by `error-reporter.ts`.

## 2. Session expiration handling (NEW UX layer)

Per your answer: modal for active sessions, redirect on navigation.

- `src/lib/auth-errors.ts` — extend `isAuthError` matchers if needed (401, "JWT expired", "Unauthorized").
- `src/components/SessionExpiredDialog.tsx` — modal with "Your session expired" + **Sign in again** (opens `/login?redirect=<current>` in same tab, preserves URL) + **Dismiss**.
- New `src/lib/session-watcher.tsx` provider mounted in `__root.tsx`:
  - Subscribes to `supabase.auth.onAuthStateChange`. On `TOKEN_REFRESHED` failure or `SIGNED_OUT` while on a protected route → open modal.
  - Wraps the QueryClient with a global `queryCache` error handler: any thrown auth error opens the modal (active session case).
  - For loader/`beforeLoad` failures, `_authenticated` already redirects — keep that behavior (navigation case).
- Update `AuthErrorFallback` to also open the modal once instead of only showing a static page when triggered inside an authenticated layout.

## 3. Image upload audit & hardening

Current flow in `src/routes/_authenticated.post.tsx` uploads directly to the public `listing-images` bucket with no validation.

Harden client-side (no schema changes needed; bucket already exists and is public):
- Constants: max 10 images per listing, 5 MB each, allowed MIME `image/jpeg|png|webp|heic`, min dimension 200×200.
- Pre-upload validation: type sniff via `file.type` + extension, size check, reject animated GIFs, count check.
- Strip EXIF + downscale >2000px on longest edge via Canvas before upload (privacy + bandwidth).
- Unique path: `${user.id}/${listingId}/${crypto.randomUUID()}.${ext}` (already user-scoped via storage RLS).
- Per-file progress, retry on transient failure, clear toast on rejection with reason.
- Server: add a migration to add storage policies on `listing-images` requiring `auth.uid()::text = (storage.foldername(name))[1]` for INSERT/UPDATE/DELETE (read stays public). Verify current policies first; only add the missing ones.

## 4. Admin moderation audit & extension

You already have `admin.listings.tsx`, `admin.moderation.tsx`, `admin.reports.tsx`, `admin.users.tsx`, `audit_log` table, and `log_admin_action()` RPC.

Audit pass + small additions:
- Confirm every destructive action in admin routes (hide listing, delete listing, suspend user, resolve report) calls `log_admin_action()` from its server function — add wherever missing.
- Add **Suspend user** action on `admin.users.tsx`: new `suspended_at` column on `profiles` (migration) + server fn `adminSuspendUser` that sets the timestamp and inserts an audit entry. Update `_authenticated.tsx` to redirect suspended users to a `/suspended` info page.
- Add **Bulk hide** to `admin.listings.tsx` toolbar (uses existing `BulkActionBar`), routed through one server fn that writes one audit row per listing.
- Add an "Audit trail" tab on the user detail and listing detail admin views, filtering `audit_log` by `target_type` + `target_id`.

## 5. Search / category / location filter audit

`search.tsx` already supports `q`, category, country, city, condition, price, age, verified, photos, promoted, sort, view. Audit/improve:
- Verify category filter actually uses category slug → id mapping correctly (current code passes a string; confirm the server fn resolves it).
- Add **category multi-select** + parent/child traversal (a parent category includes children).
- City filter: tie into existing `CityProvider` so the active city seeds the search route; add a "near me" quick filter (geolocation → nearest seeded city by name match — no PostGIS).
- Add active-filter chips above results with one-click clear, and "Clear all" button. (Most plumbing already present — just UI polish.)
- Make filters indexable: ensure canonical URL omits empty params; add `rel=canonical` per applied filter combo.

## Out of scope

- No new auth providers, no email/SMTP changes.
- No DB schema changes beyond: `profiles.suspended_at` column, storage policies for `listing-images`. Both go in a single migration.
- No redesign of admin shell.

## Technical notes

- Files added: `RecoveryOverlay.tsx`, `SessionExpiredDialog.tsx`, `session-watcher.tsx`, one Supabase migration.
- Files edited: `__root.tsx`, `chunk-reload.ts`, `error-reporter.ts`, `_authenticated.post.tsx`, `_authenticated.tsx`, `admin.users.tsx`, `admin.listings.tsx`, `search.tsx`, relevant `*.functions.ts`.
- All admin server fns continue to use `requireSupabaseAuth` + role check via `has_role`.
- Image processing uses browser-native Canvas / `createImageBitmap`; no new deps.
