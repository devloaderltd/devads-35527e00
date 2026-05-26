
## Goal
Polish the admin's existing dark UI and fill the gaps you flagged. No new tables, no schema changes — pure UI + 1 new route + small server-fn additions on existing tables.

## 1. Visual polish (dark + refined)

**AdminShell / Sidebar**
- Sidebar header: subtle gradient stripe under the logo, brand badge with soft glow shadow, tighter padding.
- Group labels get a thin 1px divider above + slightly brighter color for hierarchy.
- Active menu item: gradient pill (`from-indigo-500/20 to-fuchsia-500/10`) + left accent bar instead of flat `bg-white/10`.
- Header bar: replace flat `bg-slate-950/80` with a faint top-to-bottom gradient + 1px hairline; env pill gets a dot indicator.
- Add subtle radial glow behind the page main area (decorative, low opacity).

**Dashboard (`admin.index`)**
- New hero strip: greeting + live system pulse (4 mini-stats inline: maintenance status, errors 24h, failed payments 24h, pending top-ups) — sourced from existing `getSystemHealth`.
- KPI tiles: regroup into 2 rows (4 + 4) with section headers ("This period" / "All-time"). Add hover lift + accent glow per tile.
- Funnel: switch to a horizontal stepped bar with arrows between steps.
- Charts: unify card chrome, add gradient fills on Line/Bar (using existing colors), tooltip restyled with rounded + ring.
- Recent activity: add per-kind colored icon chips instead of plain Badge.

**Tables (`admin.listings`, `admin.users`, `admin.reports`, `admin.payments`, `admin.topups`, `admin.wallets`)**
- Shared `<DataRow>` styling: rounded-xl card with hover ring, status pills with dot prefix (`bg-emerald-500` etc.), monospace IDs in muted chip.
- `AdminTableToolbar`: filter chips become segmented pill group; search gets leading icon + ⌘F hint.
- Empty states: use `EmptyState` consistently with illustrated icon + suggested action button.

**Loading + error fallbacks (cross-cutting)**
- Add a tiny `<TableSkeleton rows={6}>` and `<CardSkeleton>` helper in `src/components/admin/ui.tsx`.
- Replace every `"Loading…"` text in admin pages with skeletons.
- Wrap queries that can fail (listings, reports, users, kyc, audit, payments, topups, wallets, broadcasts, activity) with an inline `<ErrorFallback onRetry>` (red-tinted card + retry button) when `isError`.

## 2. Missing features

**A. Global admin notifications inbox** — new route `/admin/notifications`
- New server fn `getAdminInbox({ types?, unreadOnly?, limit, before })` that unions, in JS, recent rows from: `kyc_submissions (pending)`, `reports (open)`, `crypto_topups (waiting/confirming)`, `client_error_logs (unresolved fatal/error)`, `admin_broadcasts (last 7d)`, `payments (failed 24h)`. Returns `{ items: [{ id, kind, title, body, link, at, severity }], hasMore }`.
- Page: tabs (All / KYC / Reports / Top-ups / Errors / Broadcasts), each item is a row with icon, title, time, deep-link to the source page. Mark-as-seen is local (localStorage timestamp) — no schema changes.
- Wire `NotificationsBell` to use the same fn so its count + dropdown become real (currently scaffolded).
- Sidebar gets a top-level "Inbox" entry under Overview with a badge for the total unseen since last visit.

**B. System health badges on Debug**
- `admin.debug.tsx`: add a header strip of 6 stat chips powered by `getSystemHealth` (already returns `failedPayments24h`, `unresolvedErrors`, `serverErrors24h`, `pendingTopups`, `openReports`, `maintenanceMode`). Each chip colored by threshold (green/amber/red).
- Sidebar "Debug center" entry gets a red dot when any of (`unresolvedErrors > 0`, `serverErrors24h > 0`, `failedPayments24h > 0`). Extend `getAdminBadges` to return `debug: number` + `errors: number` and add to `BADGE_KEYS` in `src/lib/admin-badges.ts`.

**C. Audit log CSV export + actor filter**
- `admin.audit.tsx`: add "Export CSV" button in toolbar (uses existing `toCsv`/`downloadCsv` from `AdminTableToolbar`). Exports current filtered page or all matching (a "Export all matching" option fetches all pages then downloads).
- Add `actor` filter input (search by actor display name — passed to server fn).
- Extend `getAuditLog` server fn to accept `actor?: string` and filter by joined actor display name; already has q/category/date.

**D. Bulk actions on Reports**
- `admin.reports.tsx`: add row checkboxes + `BulkActionBar` (already exists). Actions: "Resolve N", "Dismiss N", "Remove N listings". Add per-row checkbox and "Select all on page" like KYC.
- KYC already has bulk — no work needed.

## 3. Files touched

```text
NEW   src/routes/admin.notifications.tsx
NEW   src/components/admin/StatusPill.tsx        // dot + label pill
NEW   src/components/admin/Skeletons.tsx         // TableSkeleton, CardSkeleton, ErrorFallback

EDIT  src/components/admin/AdminShell.tsx        // header gradient, env dot
EDIT  src/components/admin/AdminSidebar.tsx      // active pill, group dividers, Inbox + debug badge
EDIT  src/components/admin/AdminTableToolbar.tsx // segmented filters, search icon
EDIT  src/components/admin/NotificationsBell.tsx // wire to getAdminInbox
EDIT  src/components/admin/ui.tsx                // refined panelCls, page header gradient
EDIT  src/components/admin/KpiTile.tsx           // hover glow

EDIT  src/routes/admin.index.tsx                 // hero strip, regrouped KPIs, gradient charts
EDIT  src/routes/admin.debug.tsx                 // health chips strip
EDIT  src/routes/admin.audit.tsx                 // CSV export, actor filter
EDIT  src/routes/admin.reports.tsx               // bulk actions
EDIT  src/routes/admin.listings.tsx              // skeletons, error fallback, polish
EDIT  src/routes/admin.users.tsx                 // skeletons, error fallback
EDIT  src/routes/admin.payments.tsx              // skeletons, error fallback
EDIT  src/routes/admin.topups.tsx                // skeletons, error fallback
EDIT  src/routes/admin.wallets.tsx               // skeletons, error fallback
EDIT  src/routes/admin.kyc.tsx                   // error fallback + skeleton

EDIT  src/lib/admin-badges.ts                    // add "debug", "errors", "inbox" keys
EDIT  src/lib/admin.functions.ts                 // getAdminInbox (NEW), extend getAdminBadges + getAuditLog
```

## Out of scope
- No DB migrations, no RLS changes, no new tables.
- No user impersonation, no Stripe-style refunds UI, no role editor rewrite — those need product decisions.
- "Mark as seen" for inbox is local-only (acceptable since you said no schema changes); we can promote to a DB table later if you want cross-device sync.
