Building all three areas of polish. Prioritizing the items with the biggest user impact first.

## 1. Messages — server-backed read state + presence

**DB migration** — new table `thread_reads (thread_id uuid, user_id uuid, last_read_at timestamptz, primary key (thread_id, user_id))` with RLS limiting rows to `auth.uid() = user_id`. Add `archived_by uuid[]` and `muted_by uuid[]` columns to `message_threads` so each participant can archive/mute independently. Enable realtime on `messages` and `message_threads`.

**Frontend**
- Replace the `localStorage` last-read map with reads/writes against `thread_reads` (upsert when opening a thread).
- Thread list shows a numeric unread badge per thread (count of messages newer than my `last_read_at`).
- Page header unread total recomputed from the same source.
- Add a per-thread overflow menu (archive / unarchive, mute / unmute) and an "Archived" tab in the thread list.
- Smarter quick-replies: different chip sets for buyer vs seller, plus an extra "Sorry, it's sold" chip when the listing's status is `sold`.
- Realtime presence channel per thread to show a "typing…" line under the header and a "seen" tick on my last sent message when the other side's `last_read_at` >= that message's `created_at`.

## 2. My Listings — bulk actions, expiry banner, sparkline

**Frontend only** (uses existing `listings` + `listing_events` tables).
- Add a "Select" toggle that reveals a checkbox on each card and shows a sticky bottom action bar with "Renew 30 days", "Mark sold", "Delete" for all selected listings.
- Top banner shows when ≥1 active listing expires in ≤3 days: "N listings expiring soon" + "Renew all" button (batched update).
- Per-card 14-day views sparkline rendered from `listing_events` where `type = 'view'` grouped by day. Tiny inline SVG, no chart library needed.

## 3. Profile — 2FA, connected accounts, notification preferences

**DB migration** — new table `notification_preferences (user_id uuid pk, email_on_message bool default true, email_on_expiring bool default true, email_on_offer bool default true, updated_at timestamptz)` with RLS scoped to owner. Seed-on-read via upsert.

**Frontend additions to AccountSettingsCard**
- **Two-factor auth** section: enroll TOTP via `supabase.auth.mfa.enroll({ factorType: 'totp' })`, show the QR (data URL returned by Supabase) + secret, verify with a 6-digit code, and list enrolled factors with an "Unenroll" button.
- **Connected accounts**: detect Google identity in `user.identities`; show Connected/Not connected with a Link button (calls `lovable.auth.signInWithOAuth('google', …)`) and Unlink (`supabase.auth.unlinkIdentity(...)`).
- **Notification preferences**: three toggles bound to the new table; saved with a single "Save preferences" button.

## Files

New
- `supabase/migrations/<ts>_messages_reads_and_prefs.sql` — `thread_reads`, `archived_by/muted_by`, `notification_preferences`, realtime publication.
- `src/components/TwoFactorSection.tsx`
- `src/components/ConnectedAccountsSection.tsx`
- `src/components/NotificationPreferencesSection.tsx`
- `src/components/ThreadSparkline.tsx`
- `src/components/BulkActionBar.tsx`

Edited
- `src/routes/_authenticated.messages.tsx` — read state from DB, archived tab, numeric unread badges, archive/mute menu.
- `src/routes/_authenticated.messages.$threadId.tsx` — upsert read on open, presence-based typing + seen receipt, context-aware quick replies.
- `src/routes/_authenticated.my-listings.tsx` — bulk select bar, expiring banner, per-card sparkline.
- `src/components/AccountSettingsCard.tsx` — mount the three new sections.

No new packages. No edge functions. All work stays in TanStack server functions where server-side is needed; the rest is browser Supabase + realtime.