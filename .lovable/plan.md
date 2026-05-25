## Goal

Make it easy to diagnose admin-access issues by exposing live session info, and make sure that after signing in from an admin-protected URL the user lands back on `/admin` (not `/`).

## 1. New debug page — `/debug/session`

Create `src/routes/_authenticated.debug.session.tsx`:
- Protected by the existing `_authenticated` layout (already waits for `loading` before redirecting).
- Shows, in a readable card layout:
  - `loading` flag from `useAuth`
  - `user.id`, `user.email`, `created_at`, `last_sign_in_at`
  - `session.expires_at` (formatted) and `access_token` length
  - Roles fetched live from `user_roles` for the current user
  - `isAdmin` / `isModerator` derived flags
  - Raw JWT claims (decoded payload from access token)
- "Copy as JSON" button + "Refresh" button that re-runs the role query and `supabase.auth.getSession()`.
- `noindex` meta.

## 2. Post-login redirect always honors original URL

`src/routes/_authenticated.tsx` currently captures `location.href` once and passes it as `redirect` search param — good. Two small fixes:
- Capture redirect target on every render where `!session` becomes true (not via `useRef` initial value) so deep links like `/admin?tab=users` round-trip correctly even after client-side nav.
- `src/routes/login.tsx` `validateSearch`: keep `/`-prefixed safety check, but also accept paths with query strings/hash (currently fine — confirm). After successful sign-in, replace `window.location.assign(redirect)` with `navigate({ to: redirect, replace: true })` so TanStack Router rehydrates context without a full reload (avoids losing the just-set session in some browsers). Fallback: if `redirect` equals current URL, go to `/`.

## 3. Harden `/admin` guard

`src/routes/_authenticated.admin.tsx` already gates on `rolesLoading` + `roles === undefined`. Additional hardening:
- Also gate on `useAuth().loading` (currently only `user` is read) so first paint never flashes "Admins only" before the session resolves.
- If the role query errors (network/RLS), show a retry card instead of falling through to "Admins only" (which is misleading).
- Add a small link "See session debug →" pointing to `/debug/session` on the access-denied screen so future debugging is one click away.

## 4. Header link (optional, admin-only)

Add a "Debug session" entry in the user dropdown in `src/components/Header.tsx` — visible to all signed-in users, points to `/debug/session`. Keeps it discoverable without polluting nav for signed-out visitors.

## Files

- new: `src/routes/_authenticated.debug.session.tsx`
- edit: `src/routes/_authenticated.tsx` (redirect capture)
- edit: `src/routes/login.tsx` (use router navigate instead of full reload)
- edit: `src/routes/_authenticated.admin.tsx` (loading gate + retry + debug link)
- edit: `src/components/Header.tsx` (dropdown entry)

## Out of scope

No DB changes, no new server functions — all reads use the existing browser Supabase client under RLS.