## Security hardening plan (18 findings)

Goal: clear every open finding from the latest scan without changing user-facing behavior.

### 1. Stop leaking seller email (ERROR)
File: `src/lib/seller-contact.functions.ts`
- Remove the `supabaseAdmin.auth.admin.getUserById(...)` call.
- Drop `email` from the return shape; return only `{ phone, whatsapp }`.
- Update the one caller in `src/routes/listings.$id.tsx` to stop reading `email` (hide the "Email" reveal row).

Rationale: any signed-in user could harvest every seller's account email by iterating listing IDs. The in-app message thread already covers contact.

### 2. Gate listing phone / WhatsApp behind auth (ERROR)
Migration:
- `REVOKE SELECT (phone, whatsapp) ON public.listings FROM anon;` (keep for `authenticated`).
- Add a SECURITY DEFINER RPC `public.reveal_listing_contact(_listing_id uuid)` that:
  - requires `auth.uid() IS NOT NULL`,
  - confirms listing is `active`,
  - inserts a `contact_reveal` row into `listing_events`,
  - returns `{ phone, whatsapp }`.
- `getSellerContact` server fn switches to call this RPC (so reveals are logged and the column grant change can't break it).
- `GRANT EXECUTE ON FUNCTION public.reveal_listing_contact(uuid) TO authenticated;` and `REVOKE ... FROM anon, public`.

Anonymous browsing of cards still works (title, price, images); only the contact numbers require sign-in.

### 3. Stop exposing all user IDs via referral codes (WARN)
Migration:
- Drop `Referral codes public read` policy.
- Add: authenticated users can `SELECT` only their own row (`auth.uid() = user_id`).
- Add SECURITY DEFINER RPC `public.lookup_referrer(_code text) RETURNS uuid` for the signup flow; grant EXECUTE to `anon, authenticated`.

### 4. Scope realtime channels per user (2 × WARN)
Migration updates the `Authenticated topic read` policy on `realtime.messages`:
- `wallet-rt` → require `realtime.topic() = 'wallet-' || auth.uid()::text` (rename pattern).
- `messages-overview` → require `realtime.topic() = 'messages-overview-' || auth.uid()::text`.

Code:
- `src/routes/_authenticated.wallet.tsx`: subscribe to `` `wallet-${user.id}` ``.
- `src/routes/_authenticated.messages.tsx`: subscribe to `` `messages-overview-${user.id}` ``.
- Any server-side broadcasters publishing to these channels (search `wallet-rt` / `messages-overview` in server code) get the same per-uid suffix.

### 5. Lock down SECURITY DEFINER EXECUTE grants (13 × WARN)
One migration that, for every project-owned definer function, does:
```
REVOKE EXECUTE ON FUNCTION public.<fn>(...) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.<fn>(...) TO service_role;
```
Applied to: `credit_wallet`, `debit_wallet`, `admin_adjust_wallet`, `approve_kyc`, `reject_kyc`, `enqueue_email`, `read_email_batch`, `delete_email`, `move_to_dlq`, `log_admin_action`, `handle_new_user`, `track_listing_price_change`, `seed_listing_price`, `set_listing_slug`, `generate_listing_slug`, `set_updated_at`.

Kept callable as today (used directly from the browser / RLS):
- `has_role(uuid, app_role)` — required by every RLS policy; grant EXECUTE to `authenticated, anon`.
- `get_my_phone()` — grant EXECUTE to `authenticated`.
- `increment_listing_view(uuid)` — called via `supabase.rpc` from the public listing page; grant EXECUTE to `anon, authenticated`.
- `reveal_listing_contact(uuid)` (new, see §2) — `authenticated` only.
- `lookup_referrer(text)` (new, see §3) — `anon, authenticated`.

Triggers continue to work because the trigger executor doesn't need EXECUTE on the function.

### 6. Update `@security-memory`
Document the new access model: listing contact reveal requires auth + logs the event; realtime channels are uid-scoped; referral codes are private; only `has_role`, `get_my_phone`, `increment_listing_view`, `reveal_listing_contact`, `lookup_referrer` are callable from the Data API.

---

### Execution order
1. Migration (single file): column REVOKEs, new RPCs, realtime policy rewrite, referral_codes policy swap, blanket EXECUTE REVOKE/GRANT.
2. Code edits: `seller-contact.functions.ts`, `listings.$id.tsx`, wallet + messages realtime channels, any matching broadcasters.
3. Re-run security scan, mark remaining findings as fixed, update security memory.

### Verification
- Re-run `security--run_security_scan` → expect 0 findings.
- Manual: sign in as demo user, open a listing, click "Reveal contact" → numbers appear, `listing_events` gets a `contact_reveal` row.
- Manual: open `/wallet` and `/messages` in two browsers as two different users → each only sees their own realtime events.
