# Polish & Completion Sweep

A medium-depth pass across the user-facing app: fix missing functionality, unify the visual language, and tighten every panel. Admin panel is left alone unless touched by a shared component.

## 1. Missing / broken functionality

**Edit listing (currently broken)**
- `my-listings` already links to `/post?edit={id}` and `ListingRowActions` uses a Pencil icon that just opens the public details page.
- Add edit mode to `src/routes/_authenticated.post.tsx`:
  - Add `validateSearch` for `{ edit?: uuid }`.
  - When `edit` is present, prefill all fields (title, description HTML, price, category, phone, whatsapp, images, city) from the listing (must belong to current user, else redirect).
  - Submit path: `UPDATE` instead of multi-city `INSERT`. City picker collapses to single-city select while editing. Image management: keep existing + add new, allow remove.
  - Header switches to "Edit listing" + "Save changes" button.
- Fix `ListingRowActions`: replace the Pencil→view button with a real "Edit" link to `/post?edit={id}` and add a separate eye-icon "View" link.

**Other small gaps**
- `_authenticated.profile.tsx`: add a "Delete account" action (calls existing account function; confirm dialog).
- `_authenticated.messages.index.tsx`: add empty-state CTA ("Browse listings") and search-filter input across threads.
- `_authenticated.notifications.tsx`: add "Mark all as read" and per-row delete (uses existing notifications table).
- `_authenticated.favorites.tsx`: add empty-state with CTA, plus "Clear all" action.
- `_authenticated.saved-searches.tsx`: ensure run-button navigates with the saved filters; add delete confirm.
- `_authenticated.wallet.tsx`: surface "Pending top-ups" section if any IPN is awaiting confirmation.

## 2. Visual & UX consistency (medium polish)

Shared patterns rolled out across every `_authenticated.*` page and key public pages (`index`, `search`, `listings.$id`, `sellers.$id`, `compare`):

- **Page shell**: every user panel uses `PanelShell` with consistent page title + subtitle + right-side primary action slot.
- **Empty states**: standard component-level treatment (icon, headline, helper text, single CTA). Apply to favorites, saved-searches, messages list, notifications, my-listings (already partially done).
- **Loading states**: replace remaining "Loading…" text with skeleton blocks (Skeleton component) matching final layout.
- **Buttons & badges**: enforce the rounded-full + tonal palette already used in the dashboard for all CTAs in user panels.
- **Forms**: standard label spacing, `text-sm font-medium`, inline help text, required marker, consistent error rendering under each field.
- **Cards**: unify on `rounded-2xl border border-white/40 bg-white/70 backdrop-blur` surface used by the dashboard.
- **Mobile**: verify 393px layout for each panel; ensure no horizontal overflow, tap targets ≥ 40px, sticky action bars don't cover MobileTabBar.
- **Dark mode**: spot-check tokens; replace any stray `text-white`/`bg-black` with semantic tokens.

## 3. Listing details page polish (`listings.$id.tsx`)

- Tidy the new contact action cluster (Call / WhatsApp / Message) into one consistent button row, mobile sticky bar mirrors it.
- Render `rte-content` HTML in a max-width container with proper typographic spacing.
- Add a small "Report listing" link near the seller card (uses existing `ReportDialog`).
- Add breadcrumb (Home › Category › City › Title) for SEO + nav.

## 4. Header / nav

- Make `Header` show the authenticated user's avatar + dropdown (Dashboard, My listings, Wallet, Profile, Sign out) when signed in, instead of the current "Sign in" button.
- Wire `NotificationsBell` unread count to live data (it already exists; verify subscription).
- Ensure `MobileTabBar` highlights the active tab via `useRouterState`.

## 5. Runtime / build hygiene

- Console shows repeated `Failed to fetch` from the Lovable preview shim — that's environmental, not our code; no action.
- Audit each route file for missing `errorComponent` / `notFoundComponent`; add minimal boundaries where missing (per TanStack guards).
- Quick lint sweep: remove unused imports introduced by recent edits.

## Out of scope

- Admin panel pages.
- Email templates (already shipped).
- Database schema changes (no migrations expected).
- Adding entirely new features (chat translations, etc.).

## Deliverables

- Edit-listing works end-to-end from My Listings.
- Every user panel has consistent shell, empty/loading/error states, and unified card/button styling.
- Header shows authenticated user menu.
- Notifications/favorites get bulk + delete actions.
- Listing details page contact cluster + breadcrumbs polished.

Estimated touched files: ~15–20 (mostly under `src/routes/_authenticated.*`, `src/components/`, plus `Header`, `ListingRowActions`, `listings.$id.tsx`).
