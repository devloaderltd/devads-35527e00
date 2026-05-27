# Production cleanup plan

Per your answers: **wipe all users**, **keep Cities only** (drop Categories), **remove seed-demo entirely**.

## 1. Database wipe (single migration)

Order matters to satisfy implicit FK chains. All in one migration:

```text
DELETE FROM listing_images;
DELETE FROM listing_price_history;
DELETE FROM listing_promotions;
DELETE FROM listing_events;
DELETE FROM scheduled_bumps;
DELETE FROM favorites;
DELETE FROM recently_viewed;
DELETE FROM messages;
DELETE FROM thread_reads;
DELETE FROM message_threads;
DELETE FROM message_quick_replies;
DELETE FROM seller_reviews;
DELETE FROM seller_follows;
DELETE FROM user_blocks;
DELETE FROM reports;
DELETE FROM saved_searches;
DELETE FROM notifications;
DELETE FROM notification_preferences;
DELETE FROM referrals;
DELETE FROM referral_codes;
DELETE FROM kyc_submissions;
DELETE FROM payments;
DELETE FROM crypto_topups;
DELETE FROM wallet_transactions;
DELETE FROM wallets;
DELETE FROM listings;
DELETE FROM homepage_slots;
DELETE FROM site_banners;
DELETE FROM admin_broadcasts;
DELETE FROM audit_log;
DELETE FROM client_error_logs;
DELETE FROM server_fn_logs;
DELETE FROM email_send_log;
DELETE FROM email_unsubscribe_tokens;
DELETE FROM suppressed_emails;
DELETE FROM user_roles;
DELETE FROM profiles;
DELETE FROM categories;          -- per your choice
-- cities preserved (664 rows)
```

Auth users (the 9 in `auth.users`) must be deleted via the admin API, not SQL. I'll add a one-shot server route `/api/public/admin-wipe-users` gated by `x-seed-token = SUPABASE_SERVICE_ROLE_KEY` that lists and deletes every auth user, then I'll call it once and delete the route file in the same turn.

## 2. Remove seed-demo code

Delete:
- `src/lib/seed-demo.server.ts`
- `src/routes/api/public/seed-demo.ts`
- `src/components/admin/SeedDemoButton.tsx`

Strip references in:
- `src/routes/admin.maintenance.tsx` (Seed Demo button + handler)
- `src/routes/admin.index.tsx` (any SeedDemoButton import/usage)
- any audit-log filter chips referencing `demo.seed_rotate.public`

## 3. First-admin bootstrap

With every user wiped, signing up creates a `user` role only (`handle_new_user` trigger). To regain admin access, I'll add a tiny one-shot server route `/api/public/bootstrap-admin` that promotes the FIRST signup to admin if zero admins exist (same pattern as the existing `hasAnyAdmin` check). You sign up → call the endpoint once → you're admin. Route auto-noops after the first admin exists.

Alternative: I run an `INSERT INTO user_roles` migration after you tell me your new user id. Pick one in the next reply if you don't want the bootstrap endpoint.

## 4. Verification

- Re-count all tables → expect 0 except `cities` (664).
- Visit `/` → no listings, hero still renders.
- Admin panel inaccessible until a user is promoted.
- Build passes (no dangling imports to deleted files).

## Out of scope

- Storage bucket cleanup (listing-images, kyc-documents, review-photos) — old files are orphaned but harmless; tell me if you want them purged too.
- Reference data re-seed for Categories — you'll add them via `/admin/categories`.
- No schema, RLS, or business logic changes.
