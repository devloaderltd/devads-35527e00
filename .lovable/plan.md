Most of the listings, messages, and profile upgrades from the previous turns are already in place (status filter chips with counts, sort dropdown, per-card actions menu, renew flow, expiring-soon badges, thread thumbnails, unread dots, quick-reply chips, editable profile + avatar upload + stat tiles). The only piece still missing is a clear **Account settings** surface on the profile page, plus one small messages polish.

## What I'll add

### 1. Account Settings card on `/profile`
Add a second card below the profile form with three grouped sections:

- **Email & verification** — show `user.email` (read-only), a "Verified" / "Not verified" badge, and a "Resend verification" button when not verified (calls `supabase.auth.resend`).
- **Security** — "Change password" button that opens a small inline form (current → new → confirm) using `supabase.auth.updateUser({ password })`. Shows success/error via toast.
- **Danger zone** — "Sign out everywhere" (calls `supabase.auth.signOut({ scope: 'global' })`) and "Delete account" (opens a confirm dialog that requires typing the email, then calls a new `deleteOwnAccount` server function using `supabaseAdmin.auth.admin.deleteUser(userId)` after re-verifying the caller via `requireSupabaseAuth`).

Visual treatment: same iridescent-border glass card style as the existing profile form, with section dividers and muted labels so the hierarchy is obvious.

### 2. Messages polish
- Keep the quick-reply chip row visible **above the input on every message** (currently only shown when the thread is empty), so sellers can one-tap common replies mid-conversation. Tapping a chip fills the input (doesn't auto-send) so it can be edited.
- Add an unread count badge next to the "Messages" page title (sum of threads where `last_message_at > localStorage lastRead`).

## Files

- `src/lib/account.functions.ts` (new) — `deleteOwnAccount` server fn with `requireSupabaseAuth` + `supabaseAdmin.auth.admin.deleteUser`.
- `src/components/AccountSettingsCard.tsx` (new) — the settings card described above.
- `src/routes/_authenticated.profile.tsx` — mount `<AccountSettingsCard />` under the profile form.
- `src/routes/_authenticated.messages.tsx` — add unread count badge in the heading.
- `src/routes/_authenticated.messages.$threadId.tsx` — always render the quick-reply row above the input.

No DB migrations required; admin delete uses the existing service-role client.