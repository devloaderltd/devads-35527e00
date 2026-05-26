## Goal

You can't get into the admin panel. The project already has a seeded admin account (`admin@callescort24.test`) and a public rotation endpoint (`/api/public/seed-demo`) that resets that account's password and re-confirms the email idempotently. We just need to call it.

## What I'll do (no code changes)

1. POST to `https://devads.lovable.app/api/public/seed-demo` with the `x-seed-token` header set to `SUPABASE_SERVICE_ROLE_KEY` (already in project secrets).
2. The endpoint will:
   - Reset the password on `admin@callescort24.test` (creating it if missing).
   - Reset the password on `demo@callescort24.test`.
   - Re-confirm both emails so login works immediately.
   - Ensure the `admin` row in `user_roles` exists for the admin account.
   - Write an entry to `audit_log` (`demo.seed_rotate.public`).
3. Return the freshly generated passwords to you in chat. You can then sign in at `/login` with `admin@callescort24.test` + the new password and reach `/admin`.

## What this does NOT do

- No schema changes, no migration, no edits to seed code or RLS.
- Does not touch any real user accounts — only the two seeded test accounts.
- Does not change your email domain or auth provider config.

## After you're back in

Once you're logged in as admin, you can change the admin email/password to something personal from the auth user management UI, or re-run the rotation any time from Admin → Maintenance ("Seed demo data").

Confirm and I'll run the rotation.