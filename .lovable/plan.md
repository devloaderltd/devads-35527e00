## Remaining admin polish

The shell, command palette, sidebar (with persisted state), dashboard, activity feed, settings, broadcasts, and the Reports / Top-ups / Reviews / Listings / Payments / Threads list pages are done. Here's what's still open from the original plan.

### 1. KYC page polish (`src/routes/admin.kyc.tsx`)
- Add the shared `AdminTableToolbar` (search by full name / user id, status filter — keep the existing Tabs OR replace with the filter dropdown, pick one) and CSV export.
- Wrap empty results in `<EmptyState>` instead of the inline "No submissions" line.
- Add a `BulkActionBar` for approve / reject on selected pending submissions (reuses existing `adminReviewKyc` per-row mutation, batched).

### 2. Users page (`src/routes/admin.users.tsx`)
- Already has search/filter/CSV/bulk-select. Swap the bespoke toolbar for shared `AdminTableToolbar` and the bespoke bulk bar for the floating `BulkActionBar` so visuals match the other list pages. No behavior changes.

### 3. Moderation / Reports queue (`src/routes/admin.moderation.tsx`)
- Audit-only: if it duplicates `/admin/reports`, leave it. Otherwise apply the same toolbar + empty state treatment.

### 4. Debug page health strip (`src/routes/admin.debug.tsx`)
- The plan called for a top-of-page "System health" strip (DB ping, last cron, queue depth) that's always visible above the tabs, not buried in a tab. Promote `getSystemHealth` results into a 3-tile strip at the top, keep the existing Health tab as the detailed view.

### 5. Dashboard aggregation (open question from original plan)
- Today `admin.index.tsx` pulls all rows of `profiles` / `listings` / `payments` to the client for chart math. Add a `getDashboardTimeseries` server fn that returns pre-bucketed series + totals, and switch the dashboard to consume it. This is the biggest scalability win left.

### Out of scope
- No schema changes, no new RLS, no public-facing UI changes.

## Suggested order
1. KYC polish (highest user value — visible queue)
2. Users + Moderation toolbar swap (consistency)
3. Debug health strip (small, high signal)
4. Dashboard server-side aggregation (largest change — confirm before starting)

Want me to proceed with all four, or stop after step 3 and treat the dashboard refactor as a separate pass?
