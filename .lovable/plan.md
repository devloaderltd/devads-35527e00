## Goal

Polish the entire user panel (dashboard, profile, my-listings, favorites, wallet, messages) with a refined glassmorphism look, and add four new functions plus a full KYC verification system tied to a $5 premium-post bonus.

## New features

### 1. KYC verification system (new)
- New table `kyc_submissions`: user_id, full_name, doc_type (passport/id_card/drivers_license), doc_front_url, doc_back_url, selfie_url, status (pending/approved/rejected), reviewer_id, review_note, bonus_credited, timestamps.
- New storage bucket `kyc-documents` (private, owner-only read; admins read all).
- Add `kyc_status` + `kyc_verified_at` to `profiles` for fast lookup.
- New user route `/_authenticated/verify`: multi-step form (info → upload ID front/back → upload selfie → submit). Shows current status (none/pending/approved/rejected with reviewer note).
- New admin route `/admin/kyc`: queue of pending submissions, document previews, Approve/Reject (with note). On approve, set profile flags and credit $5 to wallet via `credit_wallet` (only once, guarded by `bonus_credited`).
- Server functions: `submitKyc`, `getMyKyc`, `adminListKyc`, `adminReviewKyc`.
- Sidebar nav and dashboard tile surface "Verify account · earn $5".

### 2. Listing quick actions (in dashboard My Listings table)
- Inline buttons: Bump, Promote (opens existing PromoteDialog), Pause/Activate, Edit, Delete (confirm).
- Bulk actions: select rows → Pause / Activate / Delete (reuses BulkActionBar pattern).

### 3. Notifications & messages widget (dashboard Overview tab)
- "Recent activity" card: last 5 unread notifications with mark-as-read + link.
- "Recent conversations" card: last 5 threads with peer name, snippet, unread badge, jump-to-thread.

### 4. Profile completion & verification card
- Circular progress ring showing % complete across: avatar, display name, bio, phone, phone verified, KYC verified.
- Inline CTAs to finish each missing item.
- Verification badges row: Email / Phone / KYC with green check or "Verify" CTA.

### 5. Wallet & earnings panel (dashboard new tab "Wallet")
- Big balance tile + Top-up CTA.
- 30-day spend chart (wallet_transactions, type=spend).
- Recent transactions table (last 10) with type chips.

## Visual polish (refine current glassmorphism, full user panel)

- New shared `PanelShell` wrapper: container max-w, hero header with gradient title + subtitle + primary action slot.
- Tighten KPI cards: larger numbers (font-display), subtle gradient ring on hover, mini sparkline support.
- Reorder Dashboard tabs: Overview · Performance · Wallet · My Listings · Reviews.
- Profile page: redesign hero with avatar + stats inline, soft floating panels, sectioned (Identity, Location, Verification, Account).
- My-listings, favorites, wallet, messages pages: unify card radius (rounded-2xl/3xl), backdrop-blur surfaces, gradient accents, consistent empty states with illustration glyph.
- Micro-interactions: hover lift on cards, animated number on KPI mount, smooth tab transition.
- Add semantic tokens in `src/styles.css` if missing: `--shadow-float`, `--shadow-float-lg`, `--gradient-primary`, `--gradient-mesh-soft`.

## Database changes (migration)

```text
- profiles: add kyc_status (text default 'none'), kyc_verified_at (timestamptz)
- new table kyc_submissions + RLS (owner select/insert, admin all)
- storage bucket 'kyc-documents' (private) + RLS policies (owner read own folder, admin read all)
- function approve_kyc(_submission_id) SECURITY DEFINER: marks approved, sets profile flags, credits $5 to wallet if not yet credited
- function reject_kyc(_submission_id, _note) SECURITY DEFINER
```

## File changes

New:
- `src/routes/_authenticated.verify.tsx` (KYC submission UI)
- `src/routes/admin.kyc.tsx` (admin review queue)
- `src/lib/kyc.functions.ts`
- `src/components/dashboard/ProfileCompletionCard.tsx`
- `src/components/dashboard/RecentNotificationsCard.tsx`
- `src/components/dashboard/RecentMessagesCard.tsx`
- `src/components/dashboard/WalletPanel.tsx`
- `src/components/dashboard/ListingRowActions.tsx`
- `src/components/PanelShell.tsx`

Edited:
- `src/routes/_authenticated.dashboard.tsx` (polish, new tab, new widgets, quick actions)
- `src/routes/_authenticated.profile.tsx` (redesign + verification section)
- `src/routes/_authenticated.my-listings.tsx`, `.favorites.tsx`, `.wallet.tsx`, `.messages.tsx` (visual unification)
- `src/components/admin/AdminSidebar.tsx` (KYC entry)
- `src/components/Header.tsx` (verify link in user menu)
- `src/styles.css` (tokens)
- `src/integrations/supabase/types.ts` will regenerate after migration

## Out of scope

- Phone OTP verification flow (kept as-is)
- Real ID provider integration (Persona/Stripe Identity) — manual admin review only
- Mobile-specific redesign beyond responsive tweaks
