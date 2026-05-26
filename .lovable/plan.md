## Problem

The dashboard wraps its content in a `SidebarProvider` + `DashboardWorkspaceSidebar` (left rail) plus a "Workspace" trigger bar at the top. On mobile this looks broken:
- The "Workspace" strip sits awkwardly between the header/search and the page heading
- Opening it shows a sidebar that duplicates links already in the main `Header` (New listing, Messages, Wallet, Favorites, Saved searches, Profile, Notifications)
- The dashboard already exposes its own sub-sections via the tabs at the bottom (Overview, Performance, My Listings, Reviews)

So the sidebar adds visual noise without giving the user anything they don't already have one tap away.

## Fix

Remove the workspace sidebar from the dashboard route entirely.

### `src/routes/_authenticated.dashboard.tsx`
- Drop the `SidebarProvider` / `SidebarInset` / `SidebarTrigger` / `DashboardWorkspaceSidebar` imports
- Replace `DashboardShell` with a plain wrapper that just renders `<DashboardPage />`
- Remove the "Workspace" strip (the `<div>` with the trigger + label)

### Cleanup
- Delete `src/components/DashboardWorkspaceSidebar.tsx` (no other importers)

No other routes use this sidebar, and the main site `Header` + dashboard tabs already cover navigation, so nothing else needs to change.

## Out of scope
- Admin sidebar (`/admin/*`) — unrelated, stays as is
- Header / tabs styling — not what the user flagged