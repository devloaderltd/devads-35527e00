## Current state

Most of the requested work is already in place — I checked the codebase and these items are done:

- `/verify` route with the multi-step KYC form, wired to `submitKyc` + `getMyKyc` ✓
- `/admin/kyc` route with review queue and approve/reject via `adminListKyc` + `adminReviewKyc` ✓
- AdminSidebar has a "KYC verification" link to `/admin/kyc` (but no pending count) ✓ (partial)
- Dashboard already imports and renders `ProfileCompletionCard`, `RecentNotificationsCard`, `RecentMessagesCard` on the Overview tab and `WalletPanel` under a Wallet tab ✓

## What's actually still missing

1. **Pending-count badge on the admin KYC sidebar item** — add a small server fn (or extend `adminListKyc`) to return the pending count, fetch it in `AdminSidebar`, and render a badge next to the "KYC verification" row.

2. **Profile page redesign** (`src/routes/_authenticated.profile.tsx`) — the current page is a basic form. Replace with a polished layout:
   - Header banner with avatar, display name, member-since, and a verification badge row (Email / Phone / KYC) reading from `profiles.email_verified_at`, `phone_verified_at`, `kyc_status`.
   - **KYC verification card**: status pill (none / pending / approved / rejected), short description, and a primary CTA ("Verify identity · +$5" → `/verify`) or "View status" when already submitted.
   - **Completion checklist card**: avatar, display name (≥2 chars), bio (≥40 chars), phone set, phone verified, KYC approved — with a circular progress ring of completed/total and inline "Add"/"Verify" links.
   - Keep the existing edit form, recent listings, and `AccountSettingsCard` but reorganize into a 2-column grid (`lg:grid-cols-[2fr_1fr]`) inside `PanelShell` for consistency with the dashboard.

3. **Consistent visual polish across the user-panel routes** — wrap `_authenticated.favorites.tsx`, `_authenticated.wallet.tsx`, `_authenticated.messages.tsx`, `_authenticated.my-listings.tsx`, `_authenticated.notifications.tsx`, and `_authenticated.saved-searches.tsx` in `PanelShell` with a matching title/subtitle, and unify card surfaces (`rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5`) so every tab matches the dashboard's look.

## Technical details

- **Pending count**: add `getKycPendingCount` server fn in `src/lib/kyc.functions.ts` using `requireAdmin` middleware and `supabaseAdmin.from("kyc_submissions").select("id", { count: "exact", head: true }).eq("status", "pending")`. Consume it in `AdminSidebar` via `useQuery` with a 60s `staleTime`. Render as a `Badge` inside the `SidebarMenuButton` only when count > 0.
- **Profile completion %**: derive client-side from the same profile query (no DB change needed). Reuse `ProfileCompletionCard` logic — extract the scoring into `src/lib/profile-completion.ts` if useful for the new dedicated card.
- **PanelShell**: already exists at `src/components/PanelShell.tsx` with `title`/`highlight`/`subtitle` props — reuse as-is, no new variants.

No database migrations, no new server secrets, no new routes.

## Out of scope

- Changing KYC flow logic, bonus amount, or review behavior.
- Mobile-specific redesign beyond what the responsive grid already covers.
- Phone OTP / actual ID-provider integration.