## Premium-bump cities report

Query against `listings` + `listing_promotions` (type = `bump`, active, not expired):

**No city currently has 5+ listings with a premium bump.** Top cities have only **1 bumped listing each** (San Francisco, Gary, Rutland, Pasadena, Bristol, Auburn, Waterbury, Nanaimo, Raleigh, Llanelli). To populate this, run the demo seeder or bump more listings.

---

## Separate admin & user login pages

Goal: admin and user areas have their own login URL, branding, redirect rules, and guards. They never bleed into each other.

### Routes

```text
/login              → user login (existing, cleaned up)
/signup             → user signup (unchanged)
/admin/login        → NEW admin-only login page
/admin              → admin dashboard (existing, re-guarded)
/_authenticated/*   → user-only protected area (favorites, messages, post, profile, my-listings, debug)
```

### Behavior

**User flow**
- Unauthed visit to `/_authenticated/*` → redirect to `/login?redirect=…`
- `/login` rejects users who already have an admin role: after sign-in, if the account is admin-only it shows "Use the admin sign-in" with a link to `/admin/login`; regular users continue to their redirect target or `/`.
- `/login` never sends anyone to `/admin*`. If the captured redirect starts with `/admin`, it's discarded and replaced with `/`.

**Admin flow**
- Unauthed visit to `/admin` (or any `/admin/*` child) → redirect to `/admin/login?redirect=…` (NOT `/login`).
- `/admin/login` is a distinct page with admin styling (darker, "Marketly Admin" header, no signup link, no "create account" CTA).
- On submit: sign in, call the existing `getMyRoles` server fn, and only navigate to the redirect target (or `/admin`) if the user has the `admin` role. Otherwise sign them back out and show "This account is not an admin."
- `/admin` guard waits for `authLoading` + `rolesLoading`; on no session → `/admin/login`; on session but no admin role → render a "Not authorized" card with a "Sign in as admin" button (signs out + routes to `/admin/login`). No more silent redirect loop.

**Header / navigation**
- The main `Header` (user shell) hides any "Admin" entry for non-admins and links admins to `/admin` (not to the admin login).
- Admin pages get a minimal admin top bar (no marketplace nav, no "Post listing", no city selector) so the two surfaces feel separate. A "Sign out" button in the admin bar returns to `/admin/login`.

### Files

New:
- `src/routes/admin.login.tsx` — standalone admin login (distinct layout, no shared user header).
- `src/components/admin/AdminShell.tsx` — admin-only header + container used by `/admin` (and future admin children).

Edited:
- `src/routes/_authenticated.tsx` — redirect target sanitised; never allow `/admin*` in user redirect.
- `src/routes/_authenticated.admin.tsx` — switch unauth/forbidden redirect target from `/login` to `/admin/login`; wrap content in `AdminShell`; add "Not authorized" state with sign-out CTA.
- `src/routes/login.tsx` — strip any `/admin*` from `redirect`; after login, if user has only admin role, show inline notice linking to `/admin/login`.
- `src/components/Header.tsx` — only show admin link when role check passes; do not render on `/admin*` routes.

No DB migration. No changes to `user_roles`, RLS, or server fns beyond reusing `getMyRoles`.

### Notes (technical)

- Admin login uses the same Supabase `signInWithPassword`, then awaits `getSession()` and calls `getMyRoles` before navigating — same hardening pattern already used on `/login`.
- Both login routes share `validateSearch` that whitelists redirect prefixes (`/login` allows `/` and any non-`/admin` path; `/admin/login` allows only `/admin` paths).
- Admin sign-out clears session then routes to `/admin/login`, so the admin surface never lands on the user marketplace.
