## Goal

Three related improvements to the admin/demo flow:

1. Make the existing "Seed / refresh demo accounts" button auto-rotate the demo credentials safely (no more hard-coded passwords in the UI or in `seed-demo.server.ts`).
2. Add automated checks that verify admin-vs-user permissions across `/admin` and `/login`.
3. Make sure seed/reset actions and other important admin changes land in the audit log.

Existing pieces we'll build on (already in the repo):
- `src/components/admin/SeedDemoButton.tsx` (UI button, currently shows hard-coded passwords).
- `src/lib/seed-demo.server.ts` with `DEMO_USER` / `ADMIN_USER` constants.
- `src/lib/admin.functions.ts` exposes `runDemoSeed` (admin-gated) and an `audit()` helper.
- `audit_log` table + `log_admin_action` RPC.
- `/admin/audit` page that humanizes audit entries.
- `/api/public/seed-demo` route (bootstrap + `x-seed-token` modes).

## Plan

### 1. Rotating demo credentials

`src/lib/seed-demo.server.ts`
- Keep stable emails (`demo@callescort24.test`, `admin@callescort24.test`).
- Drop the hard-coded passwords. Generate a fresh strong password per run using `crypto.getRandomValues` (24 chars, alphabet of upper+lower+digits+symbols, retry until at least one of each class).
- `runSeedDemo()` returns each account with the freshly generated password plus `rotated_at: string`. Existing fields (`email`, `id`, `was_created`, `listings_seeded`, `role?`) stay so callers don't break.
- Healing path still confirms the email and updates metadata, but now also resets the password to the freshly rotated value every run.

`src/components/admin/SeedDemoButton.tsx`
- Remove the hard-coded `ACCOUNTS` constant.
- Before first run: render only the email addresses (read from a tiny constant) with a "Rotate & reveal credentials" button.
- After a run: render a one-time "Credentials rotated — copy them now" panel showing email + new password with copy buttons, plus a "Hide" toggle. Do not persist the password in component state beyond the page session and never log it.
- Toast clearly says "Credentials rotated · N account(s) created · M listing(s) seeded".

### 2. Audit logging for seed + admin changes

- `runDemoSeed` in `src/lib/admin.functions.ts`: after a successful `runSeedDemo()`, call the existing `audit()` helper with action `demo.seed_rotate`, target `auth`, metadata `{ accounts: [{ email, was_created, listings_seeded }], rotated: true }`. Never log the new passwords.
- `src/routes/api/public/seed-demo.ts`: after a successful run, insert an `audit_log` row via `supabaseAdmin` with `actor_id = null`, action `demo.seed_rotate.public`, metadata `{ via: "token" | "bootstrap", accounts: [...redacted...] }`.
- Audit-coverage sweep in `src/lib/admin.functions.ts`: grep for admin server fns that mutate state but don't call `audit(...)` and add one `audit()` call to each gap. Most already log; this is a final pass.
- `src/routes/admin.audit.tsx`: extend the `humanize()` switch with cases for `demo.seed_rotate` and `demo.seed_rotate.public` ("Rotated demo accounts — N created, M listings seeded").

### 3. Automated permission checks for `/admin` and `/login`

Add a Bun-runnable script `scripts/check-auth-routes.ts` and a `"check:auth"` npm script in `package.json`. The script hits the published URL (or a `BASE_URL` env override) and the seeded accounts to assert:

- Anonymous `GET /admin` → status 200 but HTML does NOT contain the admin shell sentinel; instead contains the login form / redirect target `/admin/login`.
- Anonymous `GET /login` → status 200, contains login form.
- Demo user signed in via `supabase.auth.signInWithPassword` (publishable anon key + freshly rotated demo password):
  - `getMyRoles` returns `["user"]`.
  - `runDemoSeed` server-fn call rejects with 401/403 (admin-only).
- Admin signed in:
  - `getMyRoles` includes `"admin"`.
  - `runDemoSeed` succeeds.
- `POST /api/public/seed-demo` without `x-seed-token` is rejected once an admin row exists.

The script obtains tokens itself and attaches `Authorization: Bearer <token>` to server-fn POSTs (matches the `attachSupabaseAuth` contract). It exits non-zero on the first failed assertion and prints a concise pass/fail report. Not wired into the build; usable locally or in CI.

## Technical details

- Password generator (server-only, uses Web Crypto): 24 chars from a 72-char alphabet drawn from `crypto.getRandomValues(new Uint32Array(24))`; regenerate if any of {lower, upper, digit, symbol} class is missing.
- `runSeedDemo` return shape is additive: existing callers continue to compile.
- No DB schema changes: `audit_log`, `log_admin_action`, `user_roles`, `wallets`, `listings` already exist.
- No new secrets required. The script uses the published `VITE_SUPABASE_*` keys and the rotating demo passwords it just generated.

## Files touched

- `src/lib/seed-demo.server.ts` — rotate passwords on every run; return them.
- `src/components/admin/SeedDemoButton.tsx` — render rotated credentials; copy UI; no hard-coded passwords.
- `src/lib/admin.functions.ts` — audit `runDemoSeed`; sweep for any missing `audit()` calls.
- `src/routes/api/public/seed-demo.ts` — audit public seed calls.
- `src/routes/admin.audit.tsx` — humanize the new actions.
- `scripts/check-auth-routes.ts` — new permission test script.
- `package.json` — `"check:auth"` script entry.

## Out of scope

- Changing the `audit_log` schema or the audit page beyond new humanizer cases.
- Emailing/SMS-delivering rotated passwords.
- Rotating real (non-demo) user passwords.
- Adding the script to CI — left as a follow-up if you want it gated on PRs.