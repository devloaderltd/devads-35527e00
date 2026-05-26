## Scope

Finish the admin polish pass: dashboard hero + chart refinement, unify loading/error states across data tables, and upgrade the notifications inbox with per-kind read tracking.

## 1. Dashboard hero + chart polish (`src/routes/admin.index.tsx`)

- **HeroStrip** above existing `HealthStrip`: gradient panel (`from-indigo-500/10 via-fuchsia-500/5 to-transparent`) with greeting, current admin name, last refresh timestamp, and a "Refresh all" button that calls `queryClient.invalidateQueries({ queryKey: ['admin'] })`.
- **HealthStrip refinement**: animated pulse on bad/warn dots, hover ring, link each tile to its destination (errors → `/admin/debug`, failed payments → `/admin/payments?status=failed`, pending top-ups → `/admin/topups?status=pending`).
- **Charts**: 
  - Line charts: add area gradient fill under the line, dotted grid, larger end-point dot with glow.
  - Bar charts: rounded tops, gradient bars (indigo→fuchsia), value label on hover.
  - Funnel: convert to horizontal stepped bar with % drop chips between steps.
- **Section headers**: split KPI grid into "This period" / "All-time" with a thin gradient divider.

## 2. Skeleton + error fallback consistency

Apply the same `RowSkeleton` / `ErrorFallback` / `EmptyState` pattern already used on audit/reports to:
- `admin.listings.tsx`
- `admin.users.tsx`
- `admin.payments.tsx`
- `admin.topups.tsx`
- `admin.wallets.tsx`
- `admin.kyc.tsx`

For each: replace ad-hoc "Loading…" and try/catch text with `<RowSkeleton rows={8} />` while pending, `<ErrorFallback error={...} onRetry={refetch} />` on error, and `<EmptyState />` when result is empty. Keep table column structure unchanged.

## 3. Notifications inbox upgrades (`src/routes/admin.notifications.tsx` + `NotificationsBell.tsx`)

- **Per-kind read tracking**: replace single `lastSeenAt` with a record `{ kyc, reports, topups, errors, broadcasts, payments }` stored in `localStorage` under `admin.inbox.lastSeenByKind`. New helper `src/lib/admin-inbox-seen.ts` exporting `getLastSeen(kind)`, `setLastSeen(kind, iso)`, `getAllLastSeen()`, `markAllSeen(items)`.
- **Tab badges**: each tab shows its own unseen count derived from `getLastSeen(kind)`.
- **"Mark tab as read"** button per tab (in addition to existing "Mark all").
- **Loading state**: `CardGridSkeleton` instead of plain text.
- **Empty state**: per-tab `EmptyState` with kind-specific copy + icon (e.g. "No new KYC submissions" + Shield icon).
- **Error state**: `ErrorFallback` with retry.
- **Bell**: sum of per-kind unseen counts; dropdown groups items by kind with mini section headers.

## 4. Files

**New**
- `src/lib/admin-inbox-seen.ts`

**Edited**
- `src/routes/admin.index.tsx` (hero, chart gradients, section headers)
- `src/routes/admin.listings.tsx`
- `src/routes/admin.users.tsx`
- `src/routes/admin.payments.tsx`
- `src/routes/admin.topups.tsx`
- `src/routes/admin.wallets.tsx`
- `src/routes/admin.kyc.tsx`
- `src/routes/admin.notifications.tsx`
- `src/components/admin/NotificationsBell.tsx`

## Out of scope

No DB migrations, no new server functions, no role/permission changes, no chart library swap (continue using the existing inline SVG charts).
