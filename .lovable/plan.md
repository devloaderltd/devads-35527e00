## Goal

Ship a coherent round of user-panel + frontend upgrades and polish, in line with the existing glass / gradient design system. Backend touches only where features genuinely need it; everything else is presentation.

## 0. Quiet fixes first (blockers)

Runtime currently throws "Expected corresponding JSX closing tag for `<PanelShell>`" in three files. Re-balance the JSX in:
- `src/routes/_authenticated.wallet.tsx`
- `src/routes/_authenticated.my-listings.tsx`
- `src/routes/_authenticated.saved-searches.tsx`

(Stray inner `</div>` from the previous PanelShell wrap — remove the orphan closing tag in each file so the tree balances.) No behavior change.

## 1. New features

### A. Listing compare + share/QR
- `src/components/CompareBar.tsx` — sticky bottom bar that appears when 2-4 listings are added; "Compare" button + clear.
- `src/lib/compare-context.tsx` — small Zustand-free context (localStorage-backed, max 4).
- `ListingCard`: add a "Compare" checkbox icon (top-left of image) toggling the set.
- `src/routes/compare.tsx` — side-by-side table (image, title, price, city, condition, seller rating, posted, views, contact button). Mobile: horizontal scroll with sticky first column.
- `src/components/ShareSheet.tsx` — drop-in dialog using `navigator.share` when available, otherwise copy-link + WhatsApp/Telegram/X/Email buttons + a QR code (use `qrcode` npm pkg → canvas data URL, downloadable as PNG).
- Wire share button on `listings.$id.tsx` and `sellers.$id.tsx`.

### B. Seller profile polish (`src/routes/sellers.$id.tsx`)
- Cover photo strip (gradient fallback) + avatar overlap.
- Badges row: KYC verified, member-since, response rate (derived from existing message stats).
- Tabs: "Active listings" / "Reviews" / "About".
- Follow seller button → `seller_follows` table (new); count + "Following" toggle. Notifications already exist; add a `new_listing_from_followed` type into existing notifications insert when a followed seller posts.

### C. Messages upgrades (`_authenticated.messages.*`)
- Quick replies: per-user saved canned messages. Small `+ Saved replies` button next to composer; manage in a popover (add/edit/delete). New table `message_quick_replies(user_id, label, body)` with RLS.
- Typing indicator: Supabase Realtime presence on `thread:<id>`; broadcast typing on input + debounce 2s.
- Read receipts toggle: `profiles.show_read_receipts boolean default true`; only show ✓✓ to the other party if both have it on.

### D. Wallet auto-promote rules
- Per-listing toggle in `MyListings` row actions: "Auto-bump every N days while balance ≥ $X".
- New table `auto_promote_rules(listing_id, type:'bump'|'featured', interval_days, min_balance_usd, active)` + RLS (owner only).
- Cron route `api/public/cron/auto-promote.ts` (signature-protected like existing crons) processes due rules using `debit_wallet` + existing promote logic.

### E. Onboarding tour
- `src/components/OnboardingTour.tsx` — driver.js-free, custom popover-based tour (uses existing `Popover` + a backdrop). Steps: dashboard cards → "Post a listing" → wallet top-up → KYC → messages.
- Persist completion in `profiles.onboarding_done_at`. Show once on first login; "Restart tour" link in Account settings.

## 2. UI polish

### Header + mobile nav
- `Header.tsx`: stronger glass blur + scrim on scroll; condensed search-pill on `/search` and listing pages.
- New `src/components/MobileTabBar.tsx`: bottom fixed bar for authed users — Home, Search, Post (center FAB), Messages, Account. Hide on inputs focus.

### Listing detail (`listings.$id.tsx`)
- Photo gallery: tap-to-zoom lightbox, swipe on mobile, thumbnails strip on desktop.
- Sticky right-rail contact card on desktop; sticky bottom contact bar on mobile.
- "More from this seller" + "Similar in this city" rails at bottom.
- Breadcrumbs (Category › City › Title) + JSON-LD Product.

### Search + filters
- Replace filter dropdowns with chip row (category/city/condition/price); selected chips show inline with × to remove.
- Sort segmented control (Newest / Price ↑ / Price ↓ / Most viewed).
- Skeleton grid while loading; empty state with "Save this search" CTA.
- Optional map toggle (defer to next round if scope tight — keep button stubbed).

### Global tokens + motion
- Tighten `src/styles.css`: surface tiers (`--surface-1/2/3`), shadow tiers, consistent radius scale (10/14/20/28), focus ring token, dark-mode contrast pass on muted text.
- Standard motion: `transition-all duration-200 ease-out` baseline; `animate-fade-in` on route mounts; hover-lift on cards.

## 3. Technical details

- **New deps**: `qrcode` (tiny, edge-safe).
- **New tables / columns** (single migration):
  - `seller_follows(follower_id, seller_id, created_at)` + RLS (owner read/write own).
  - `message_quick_replies(id, user_id, label, body)` + RLS.
  - `auto_promote_rules(id, listing_id, type, interval_days, min_balance_usd, active, last_run_at)` + RLS (owner).
  - `profiles`: add `show_read_receipts boolean default true`, `onboarding_done_at timestamptz`.
- **New server fns**: follow/unfollow, list followers; CRUD quick replies; CRUD auto-promote rules; cron handler.
- **No edits** to `client.ts`, `types.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `.env`.
- **Realtime**: enable presence channel `thread:<id>` (no schema change needed).
- **Cron**: add row to existing pg_cron setup pointing at `/api/public/cron/auto-promote` with `CRON_SECRET`.

## 4. Out of scope (this round)

- Map view (stub only).
- Native push notifications.
- Admin panel changes.
- Payments beyond existing wallet flow.

## 5. Order of work

1. JSX fixes (blockers).
2. Migration + types regen.
3. Global tokens + motion + Header + MobileTabBar (foundation for the rest).
4. Listing detail polish + Share/QR + Compare.
5. Seller profile polish + follow.
6. Messages upgrades.
7. Auto-promote + cron.
8. Onboarding tour.
9. Search polish.
