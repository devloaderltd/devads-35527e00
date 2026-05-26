# Admin badges: refresh, type safety, loading/error states + small gaps

## Scope

Concrete asks I can do without further input:

1. **Type-safe `BadgeKey`** — single source of truth shared by `getAdminBadges` and the sidebar.
2. **Manual "Refresh counts"** action in sidebar header + command palette.
3. **Loading skeleton + error fallback** for the badges query in the sidebar.
4. **Wire up the badges already returned but unused** (`topups`, `broadcasts`) — `getAdminBadges` already returns them; sidebar throws them away. Hook them into Crypto top-ups and Broadcasts entries.

The last ask — *"Add more functionality and features to the admin. Find any missing function."* — is too open-ended to bundle into this plan. I'll list candidate gaps I noticed at the bottom and ask you to pick which (if any) to ship in a follow-up. **This plan does NOT implement them.**

## Implementation

### 1. `src/lib/admin-badges.ts` (new, client-safe)

```ts
export const BADGE_KEYS = ["kyc", "reports", "moderation", "topups", "broadcasts"] as const;
export type BadgeKey = typeof BADGE_KEYS[number];
export type AdminBadges = Record<BadgeKey, number>;
export const EMPTY_BADGES: AdminBadges = { kyc: 0, reports: 0, moderation: 0, topups: 0, broadcasts: 0 };
export const ADMIN_BADGES_QUERY_KEY = ["admin-badges"] as const;
```

### 2. `src/lib/admin.functions.ts`

- Type `getAdminBadges`'s handler return as `AdminBadges` (import from the new file). This forces a compile error if the handler stops returning a key.
- Replace the `listings … eq("status","draft")` query (no `draft` status exists on `listings`) with `listings … eq("status","active").eq("verified_at", null)` so the `moderation` count reflects unverified active listings — or, simpler, count `reports` of type `listing` with `status='open'`. I'll pick the unverified-listings option since it matches the existing "Moderation" page semantics; flag in code with a short comment.

### 3. `src/components/admin/AdminSidebar.tsx`

- Replace inline `badges` object with `AdminBadges` typed from the new module.
- Constrain each sidebar item's `badgeKey` to `BadgeKey` via a typed `Item` type so a typo or stale key fails the build.
- Add `badgeKey: "topups"` to Crypto top-ups, `badgeKey: "broadcasts"` to Broadcasts.
- Query: keep `useQuery({ queryKey: ADMIN_BADGES_QUERY_KEY, … })`, expose `isLoading`, `isError`, `refetch`.
  - Loading: render small pulsing pills (`h-4 w-6 animate-pulse bg-white/10 rounded-full`) in place of badge numbers on items with a `badgeKey`.
  - Error: tiny `AlertCircle` icon at the top of the sidebar with a tooltip "Counts unavailable — click to retry" that calls `refetch()`.
- Add a header refresh button (small `RefreshCw` icon button next to the logo, hidden when collapsed) that calls `refetch()` and shows `animate-spin` while `isFetching`.

### 4. `src/components/admin/AdminCommandPalette.tsx`

- Add a "Refresh badge counts" entry under **Quick actions** that uses `useQueryClient().invalidateQueries({ queryKey: ADMIN_BADGES_QUERY_KEY })` and shows a `toast.success("Counts refreshed")`.

### 5. No DB / RLS changes. No new server functions.

## Files touched

- new: `src/lib/admin-badges.ts`
- edit: `src/lib/admin.functions.ts` (typed return + corrected moderation count)
- edit: `src/components/admin/AdminSidebar.tsx`
- edit: `src/components/admin/AdminCommandPalette.tsx`

## QA

- Throttle network → confirm skeleton pills appear, then numbers fill in.
- Force a 500 (temp throw in `getAdminBadges`) → confirm error icon + tooltip + retry works.
- Click sidebar refresh and palette "Refresh badge counts" → counts re-fetch, spinner shows.
- Rename a `BadgeKey` in `admin-badges.ts` → TypeScript fails in both the server function and the sidebar item that references it.

## Out of scope (please confirm)

You also asked to "add more functionality and features to the admin. Find any missing function." That's open-ended. Candidates I spotted while exploring, but will **not** build in this plan:

- Admin route `/admin/notifications` — no global outbox view of `notifications` table.
- Bulk actions on KYC and Reports tables (only single-row actions exist).
- Server fn for exporting `audit_log` to CSV (currently UI only).
- `crypto_topups.raw_last_ipn` viewer per top-up.
- A "user impersonation / view as" action (security-sensitive; would need an approval flow).
- `getAdminBadges` extra counts: failed payments 24h, unresolved client errors, server errors 24h — already exposed via `getSystemHealth`; could be surfaced as sidebar badges on Debug center.

Tell me which of those (or anything else) you want, and I'll plan that work separately.
