## Goal

Make the admin panel fully responsive with a mobile-tuned layout, and audit/fix the rest of the app so every page works cleanly on small viewports (≤393px) up to desktop.

## Scope

### 1. Admin panel — mobile-first restructure

`src/components/admin/AdminShell.tsx`
- Replace the desktop-only header with a responsive one:
  - Mobile: compact top bar (logo + hamburger). Hamburger opens a `Sheet` (slide-in drawer) with: admin email, nav links (Overview, Users, Listings, Payments, Reports), and Sign out.
  - Desktop (md+): existing inline header with email + sign-out button.
- Container padding: `px-3 sm:px-4` instead of fixed `px-4`. Vertical padding `py-4 sm:py-8`.

`src/routes/admin.index.tsx`
- Page header: smaller display type on mobile (`text-2xl sm:text-3xl`), tighter spacing.
- Tabs: make `TabsList` horizontally scrollable on mobile (`overflow-x-auto no-scrollbar`, `whitespace-nowrap`) so all 5 tabs stay reachable; keep pill look on desktop.
- KPI grid: `grid-cols-2` on mobile (already), reduce icon/value sizes and card padding on small screens.
- Charts grid: stays `grid-cols-1 lg:grid-cols-2`. Reduce chart `height` to ~200 on mobile via container. Hide/rotate dense axis labels on small widths (smaller font, larger `interval`).
- Users / Listings / Payments / Reports tables: on mobile (<md) render as stacked cards (one card per row with key/value pairs and action buttons), on md+ keep the existing table. Search inputs become full-width on mobile.
- Action button rows: wrap with `flex-wrap gap-2` and full-width on mobile.

`src/routes/admin.login.tsx`
- Already centered; tighten padding (`p-6 sm:p-8`), ensure form inputs are 16px font (prevents iOS zoom), full-width button, safe-area aware (`pb-[max(1rem,env(safe-area-inset-bottom))]`).

### 2. Marketplace (user) app — responsive audit

`src/components/Header.tsx`
- Mobile city pill is already icon-only; verify search input row doesn't overflow at 320px.
- Convert the user dropdown to a `Sheet` on mobile (optional polish) OR keep dropdown but ensure trigger stays tappable (44px). Will keep dropdown, just enforce min-touch sizes.

Pages to audit and tighten (only what's actually broken on 393px):
- `src/routes/index.tsx` — hero spacing, section paddings
- `src/routes/search.tsx` — filter sidebar collapses into a `Sheet` triggered by a "Filters" button on mobile
- `src/routes/listings.$id.tsx` — image gallery, sticky CTA on mobile, contact button width
- `src/routes/sellers.$id.tsx` — header stack on mobile
- `src/routes/login.tsx`, `src/routes/signup.tsx` — input zoom-prevention, full-width buttons
- `src/routes/_authenticated.dashboard.tsx` — KPI cards 2-col on mobile
- `src/routes/_authenticated.my-listings.tsx`, `_authenticated.favorites.tsx` — grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- `src/routes/_authenticated.messages.tsx` + `.$threadId.tsx` — on mobile, show thread list OR conversation (not both); back button in thread view
- `src/routes/_authenticated.post.tsx`, `_authenticated.profile.tsx` — form fields full-width, sticky submit on mobile
- `src/routes/_authenticated.debug.session.tsx` — pre/JSON blocks `overflow-x-auto break-all`

Cross-cutting:
- Add `.no-scrollbar` utility in `src/styles.css` for horizontal scroll affordances.
- Ensure all `<input>` use `text-base` (16px) to suppress iOS zoom.
- Ensure no fixed widths that overflow at 360px (replace with `max-w-*` + `w-full`).
- Add `viewport-fit=cover` already present via Tanstack root; add `pb-[env(safe-area-inset-bottom)]` to bottom-sticky bars.

### 3. Out of scope
- No business logic, auth, RLS, or DB changes.
- No new routes — admin already lives at `/admin/*`, separate from user area.
- No design overhaul; keep existing tokens and dark admin theme.

## Files touched

- `src/components/admin/AdminShell.tsx` (mobile drawer header)
- `src/routes/admin.index.tsx` (tabs scroll, responsive KPIs/charts, mobile card-tables)
- `src/routes/admin.login.tsx` (mobile polish)
- `src/components/Header.tsx` (touch sizes)
- `src/routes/index.tsx`, `search.tsx`, `listings.$id.tsx`, `sellers.$id.tsx`, `login.tsx`, `signup.tsx`
- `src/routes/_authenticated.dashboard.tsx`, `.my-listings.tsx`, `.favorites.tsx`, `.messages*.tsx`, `.post.tsx`, `.profile.tsx`, `.debug.session.tsx`
- `src/styles.css` (`.no-scrollbar` helper)

## Verification

- Preview at 360, 393, 768, 1280 widths.
- Walk through: `/`, `/search`, `/listings/:id`, `/login`, `/dashboard`, `/messages`, `/admin/login`, `/admin` (Overview, Users, Listings, Payments, Reports tabs).
- Confirm no horizontal scroll on body, all primary actions reachable, tables convert to cards on mobile, admin nav reachable via drawer.
