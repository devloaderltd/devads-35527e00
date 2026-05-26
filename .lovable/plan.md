## Goal
Make the admin panel feel like a real ops console: cleaner shell, faster nav, smarter dashboard, and a few high-value missing utilities. Scope is UI/UX polish + small additive features — no schema changes, no destructive refactors.

## What changes

### 1. Shell polish (`AdminShell`, `AdminSidebar`)
- Sticky header gets: breadcrumbs (derived from route), an environment chip (Live / Preview), a notifications bell that opens a popover of pending items (KYC, reports, top-ups, open broadcasts) and a "Jump to…" button that opens the command palette (⌘K).
- Sidebar: pinned "Quick" group at top with smart links (Pending KYC, Open reports, Pending top-ups) whose counts come from a single `getAdminBadges` server fn (one query, replaces today's KYC-only fetch). Each People/Content/Finance/System item that has an actionable backlog gets the same badge treatment.
- Active-item indicator gets a left accent bar; collapsed mini-rail keeps tooltips and badges.
- Subtle gradient + grain on the dark surface, refined spacing (px-4 → px-5, header height 56px), section divider lines lightened. Mobile drawer keeps current behavior.

### 2. Command palette (`⌘K` / `Ctrl+K`)
- New `AdminCommandPalette` (cmdk-based, reuses the public `CommandPalette` pattern).
- Sources: every admin route, the 8 "quick action" verbs (approve next KYC, review next report, broadcast…), recent users/listings (live search via `searchAdmin` server fn that does limited `ilike` over `profiles`, `listings`, `payments.provider_session_id`).
- Keyboard: ⌘K to open, ↑↓ + Enter to navigate. Mobile floating "Search" button in the header opens the same palette.

### 3. Dashboard upgrades (`/admin`)
- Add date-range toggle (7d / 30d / 90d) that drives all charts + KPIs (today they're hardcoded to 30d).
- KPI tiles gain trend deltas vs the previous period (▲ +12% green / ▼ red) and a tiny sparkline under the value.
- New "Funnel" mini-card: signups → first listing → first paid promotion (last 30d, with conversion %).
- "Recent activity" feed: virtualize / cap at 20 with "Open full feed →" linking to the new Activity page.
- Empty-state and skeleton loaders for every card (today shows "—").

### 4. New page: `/admin/activity`
- Full unified activity stream merging signups, listings, payments, top-ups, reports, KYC events, broadcasts, admin actions (from `audit_log`).
- Filters: type chips, actor search, date range, "only admin actions".
- Server fn `getAdminActivityFeed({ types, q, from, to, cursor })` with cursor pagination.
- Each row clickable → deep link to the relevant admin sub-page.

### 5. Cross-cutting list/table polish
Applied to `admin.users`, `admin.listings`, `admin.payments`, `admin.topups`, `admin.reports`, `admin.kyc`, `admin.reviews`, `admin.threads`:
- Shared `<AdminTableToolbar>` with: text search, status filter, date range, export CSV button.
- Sticky table header, zebra rows, row hover, row count + page size selector (25/50/100), keyboard `j/k` to move selection, `Enter` to open detail drawer.
- Bulk-select with a floating action bar (approve / reject / archive where the action already exists on that page — no new mutations, just batched).
- Toast confirmations + optimistic UI on existing row mutations.

### 6. Misc additive features
- `/admin/settings`: add "Copy site config as JSON" + "Export DB stats" buttons.
- `/admin/broadcasts`: preview pane showing how the broadcast renders in the notification dropdown.
- `/admin/debug`: add a "System health" strip (DB ping, last cron run, queue depth from `pgmq` via `getAdminHealth` server fn).
- Persist sidebar collapsed state and dashboard date range in `localStorage`.

## Files touched (additive-first)
- New: `src/components/admin/AdminCommandPalette.tsx`, `src/components/admin/AdminTableToolbar.tsx`, `src/components/admin/Breadcrumbs.tsx`, `src/components/admin/NotificationsBell.tsx`, `src/components/admin/KpiTile.tsx`, `src/components/admin/Sparkline.tsx`, `src/components/admin/BulkActionBar.tsx`, `src/components/admin/EmptyState.tsx`, `src/routes/admin.activity.tsx`.
- New server fns in `src/lib/admin.functions.ts`: `getAdminBadges`, `searchAdmin`, `getAdminActivityFeed`, `getAdminHealth`, `getFunnelStats`, `getKpiTrends`.
- Edited: `AdminShell.tsx`, `AdminSidebar.tsx`, `ui.tsx`, `admin.index.tsx`, each list route (toolbar swap + bulk-bar wiring), `admin.settings.tsx`, `admin.broadcasts.tsx`, `admin.debug.tsx`.

## Out of scope
- No DB migrations (everything reads existing tables).
- No new permissions / RLS changes.
- No redesign of public-facing pages.
- No payment provider changes.

## Open question
The dashboard currently fetches all rows of `profiles` / `listings` / `payments` client-side for chart math, which won't scale. Want me to also move that aggregation into server fns (`getDashboardTimeseries`) as part of this pass, or leave it for a follow-up?
