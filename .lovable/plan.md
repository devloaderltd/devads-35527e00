## Remaining frontend / user-panel polish

From `.lovable/plan.md`, the only remaining item is wrapping the rest of the user-panel routes in `PanelShell` so every tab matches the dashboard/profile/favorites/notifications look. After audit, three routes still use bespoke `<div className="container mx-auto …">` headers:

1. `src/routes/_authenticated.wallet.tsx`
2. `src/routes/_authenticated.my-listings.tsx`
3. `src/routes/_authenticated.saved-searches.tsx`

(`_authenticated.messages.tsx` is a 3-pane inbox layout with `<Outlet />` — intentionally not wrapped; leaving as-is.)

## Changes

For each of the three files:

- Import `PanelShell` from `@/components/PanelShell`.
- Replace the outer `container mx-auto … py-8` wrapper + manual `<h1>…<gradient-text>…</gradient-text></h1>` + subtitle block with `<PanelShell title="…" highlight="…" subtitle="…" action={…}>` and move the existing right-side button(s) into the `action` prop.
- Body content (cards, grids, transaction lists, etc.) stays unchanged; only the outer wrapper + header is unified.

Per-route specifics:

- **wallet**: `title="Wallet"` `highlight="& top-ups"` `subtitle="Top up with crypto, spend credits to promote your listings."` size `md`. Unify the three card surfaces to `rounded-2xl border-0 bg-white/70 backdrop-blur dark:bg-white/5` to match other tabs (current `iridescent-border` balance card kept as accent).
- **my-listings**: `title="My"` `highlight="listings"` `subtitle="{counts.all} total · {counts.active} active"`, action = the Select + New listing buttons. size `lg`.
- **saved-searches**: `title="Saved"` `highlight="searches"` `subtitle="{items.length} saved · {notifyOnCount} with alerts on"`, action = the "Browse listings" button. size `md`.

No schema, server-fn, route, or business-logic changes. Pure presentation.

## Out of scope

- Messages inbox layout (already custom and working).
- KYC / admin pages.
- Any behavior, data, or auth changes.
