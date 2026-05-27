## Goal

Audit every page in the app at mobile (375px), tablet (768px) and desktop (1280px+) widths and fix responsive layout issues — overflow, horizontal scroll, cramped touch targets, crowded grids, text wrapping. Keep the existing visual design. No business-logic changes.

## Method

For each route I'll check in the running preview:
- horizontal scroll / overflow (the main symptom)
- min-w-0 missing on flex/grid children that contain long text or inputs
- tables and wide grids that need horizontal scroll wrappers or stacked card fallbacks on mobile
- fixed widths (`w-[NNNpx]`) that should be `max-w-` + `w-full`
- text sizes (`text-xs sm:text-sm` patterns) and padding (`p-3 sm:p-4`) for small screens
- touch targets ≥ 40px on mobile
- sticky headers / sidebars that should collapse below `lg`
- modals/dialogs that exceed viewport on mobile

## Scope (grouped, by priority)

**1. Public / marketing**
`index.tsx`, `about.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx`, `cookies.tsx`, `dmca.tsx`

**2. Auth flows**
`login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`, `verify-email.tsx`, `auth.callback.tsx`, `unsubscribe.tsx`

**3. Browse / discovery**
`search.tsx`, `compare.tsx`, `listings.$id.tsx`, `sellers.$id.tsx`

**4. Authenticated user area**
`_authenticated.dashboard`, `favorites`, `my-listings`, `post`, `profile`, `wallet`, `notifications`, `saved-searches`, `verify`, `messages` (index + thread)

**5. Admin panel** (highest density, most overflow risk)
All `admin.*` routes — these are data-heavy tables, the biggest source of horizontal scroll on mobile. Standard treatment: wrap tables in `overflow-x-auto`, switch dense table → stacked card list at `<md`, collapse the admin sidebar to a sheet/drawer at `<lg`.

**6. Shared layout shells**
`__root.tsx`, `_authenticated.tsx`, `admin.tsx`, `Header` — verify nav collapses cleanly, no double scrollbars, content area has correct `min-w-0`.

## Deliverable per page

Surgical edits to existing JSX/Tailwind classes only. No component rewrites, no design tokens changes, no new dependencies. Each fix limited to:
- adding/removing Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
- adding `min-w-0`, `truncate`, `break-words`, `overflow-x-auto`, `flex-wrap`
- swapping fixed widths for `max-w-*`
- introducing mobile-card fallbacks for the worst tables (only where needed)

## Verification

After fixes I'll spot-check the highest-risk pages in the live preview at 375 / 768 / 1280 using the browser tools — confirm: (a) no horizontal scroll on `<body>`, (b) primary actions reachable without zoom, (c) tables either scroll inside their container or stack into cards. Existing Playwright visual baseline (`tests/visual/admin-settings.spec.ts`) is left as-is.

## Out of scope

- Visual redesign, color/typography changes, new components
- Server functions, schema, auth, business rules
- New routes or features
- Extending visual regression to more pages (can be a follow-up)

## Size note

This touches ~55 route files. I'll work in the priority order above and report progress per group. If you want a tighter first pass (e.g. "just the public pages + admin tables"), say so and I'll narrow before starting.
