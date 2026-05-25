# Seed demo data + admin re-seed button

## 1. Run the seed endpoint now (server-side, one-shot)

I'll POST to `/api/public/seed-demo` with the `x-seed-token` header set to `SUPABASE_SERVICE_ROLE_KEY` using the server-invoke tool. This creates the two accounts (idempotent) and seeds ~5 listings each. After it returns `{ ok: true }`, you can immediately log in with:

- **User:** `demo@marketly.test` / `DemoUser123!`
- **Admin:** `admin@marketly.test` / `AdminUser123!`

If sign-in still fails after the seed, the most likely cause is **email confirmation being required**. The seed uses `email_confirm: true` when *creating* the user, but if the accounts already exist in a half-created state from a previous attempt, they may not be confirmed. I'll handle this by:
- Upgrading `ensureUser` to also call `supabaseAdmin.auth.admin.updateUserById(id, { email_confirm: true, password })` when the user already exists, so re-running the seed always heals the account (confirms email + resets password to the known value).

## 2. Admin "Seed demo data" button

Add a button on the admin dashboard (`/admin`, Overview tab) that re-runs the seed from the UI — no curl, no token paste.

### How auth works (so no token is exposed to the browser)

- New server function `runDemoSeed` in `src/lib/admin.functions.ts`, gated by a new `requireAdmin` middleware (checks `has_role(userId, 'admin')` via `supabaseAdmin`).
- The server function calls the same seeding logic directly (refactored out of the route handler into `src/lib/seed-demo.server.ts` so both the public route and the server fn share one implementation).
- No service-role token is ever sent from the browser — admin role is verified server-side via the user's session.

### UI

- New `SeedDemoButton` component in the admin Overview tab:
  - Button: "Seed / refresh demo accounts"
  - On click → calls `runDemoSeed` → toast with result (`"Created demo + admin, seeded N listings"` or `"Demo accounts refreshed"`).
  - Shows the two account credentials below the button (read-only, with copy buttons) so you always know what to log in with.
- Disabled while running; shows a spinner.

## Files

**Edit**
- `src/routes/api/public/seed-demo.ts` — extract seeding into a shared helper; harden `ensureUser` to confirm email + reset password on existing users.
- `src/routes/_authenticated.admin.tsx` — add `SeedDemoButton` to Overview tab.
- `src/lib/admin.functions.ts` — add `runDemoSeed` server fn.

**Create**
- `src/lib/seed-demo.server.ts` — shared seeding logic (ensure users, seed listings, ensure admin role).
- `src/lib/admin-middleware.ts` — `requireAdmin` server middleware (composes `requireSupabaseAuth` + role check).
- `src/components/admin/SeedDemoButton.tsx` — UI component.

## Out of scope
- One-click "Log in as demo" shortcut on login page (we can add later if you want).
- Resetting/wiping demo data — current behavior is idempotent (skips listings if user already has any).
