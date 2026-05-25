# Auth error handling polish

Most of the requested infrastructure is already in place. The remaining gap is **client-side handling of `Unauthorized` errors thrown by server functions** — today they surface as a generic "Something went wrong" screen or, in the admin shell, a `useQuery` error that never resolves and looks blank.

## What already exists (no changes needed)

- **`requireSupabaseAuth`** (`src/integrations/supabase/auth-middleware.ts`, auto-generated): validates bearer token, throws `Error('Unauthorized: ...')` with a consistent message prefix when the header is missing/invalid.
- **`attachSupabaseAuth`** (`src/integrations/supabase/auth-attacher.ts`, auto-generated, wired in `src/start.ts`): automatically attaches the Supabase access token as `Authorization: Bearer …` on every serverFn call.
- **`requireAdmin`** (`src/lib/admin-middleware.ts`): composes `requireSupabaseAuth` + `user_roles` check; already applied to every admin serverFn in `src/lib/admin.functions.ts`.

Both auto-generated files are off-limits to edit, so the "move session checks into requireSupabaseAuth" and "auto-pass Authorization header" items are already satisfied by the platform.

## Changes

### 1. New `src/lib/auth-errors.ts`
- `isUnauthorizedError(err)` — returns true if `err.message` starts with `"Unauthorized"` (also handles TanStack's serverFn error envelope where the message is nested).
- `isForbiddenError(err)` — same for `"Forbidden"`.

### 2. New `src/components/AuthErrorFallback.tsx`
Reusable card with:
- Lock icon + heading "Please sign in"
- Sub-copy explaining the session expired
- **Sign in** button → navigates to `/login?redirect=<current>` (or `/admin/login` when `variant="admin"`)
- **Retry** button → calls the `reset` / `refetch` callback passed in

Accepts `{ error, reset, variant?: "default" | "admin" }`.

### 3. `src/routes/__root.tsx` — `ErrorComponent`
Detect `isUnauthorizedError(error)` and render `<AuthErrorFallback>` instead of the generic "Something went wrong" panel. Generic errors keep their current UI.

### 4. `src/routes/admin.tsx` — `Gated`
Today: when `getMyRoles` throws Unauthorized (e.g. token expired mid-session), `rolesQ` enters an error state and the component falls through to "Loading admin…" forever (blank screen).

Fix:
- Add `retry: false` to the `useQuery` so 401s don't loop.
- When `rolesQ.isError && isUnauthorizedError(rolesQ.error)` → `navigate({ to: "/admin/login", search: { redirect: "/admin" }, replace: true })` inside an effect.
- For any other `rolesQ.error`, render `<AuthErrorFallback variant="admin" reset={rolesQ.refetch} />`.

### 5. Lightweight guard in user-facing serverFn callers
Pages that call protected serverFns from components (`src/routes/_authenticated.*` already gated by `_authenticated` layout, so loaders are fine). No code change needed there — the new root `ErrorComponent` covers the rare 401 from a token refresh race.

## Out of scope
- Rewriting `requireSupabaseAuth` or `auth-attacher` (auto-generated).
- Changing the error contract of existing serverFns — the `"Unauthorized: ..."` / `"Forbidden: ..."` message prefixes are already consistent and we key off them.

## Files touched
- **new** `src/lib/auth-errors.ts`
- **new** `src/components/AuthErrorFallback.tsx`
- **edit** `src/routes/__root.tsx` (ErrorComponent only)
- **edit** `src/routes/admin.tsx` (Gated only)
