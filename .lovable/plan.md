## Goal
Ship five related improvements: an admin "Clear cache & cookies" tool, a sitewide 18+ adult warning modal, adult-directory legal copy, light-mode color polish, and mobile performance fixes.

---

## 1. Admin: Clear Cache & Cookies tool
**File:** `src/routes/admin.maintenance.tsx` (new section inside existing maintenance page)

Add a "Cache & Cookies" card with three actions:
- **Clear my browser cache & cookies** — clears `localStorage`, `sessionStorage`, all non-essential cookies for this domain, IndexedDB (`supabase-auth`), and TanStack Query cache. Confirms then signs the admin out cleanly.
- **Bust client cache for all visitors** — bumps a `client_cache_version` row in `site_settings`. Root layout reads it and, when it changes, invalidates the service worker / query cache and forces a one-time `location.reload()` on next visit.
- **Purge server caches** — clears in-memory homepage config cache + invalidates TanStack Query cache server-side (calls a `createServerFn` that increments the version and returns success).

Wire all three behind admin role check (already enforced by `admin.tsx` layout).

---

## 2. 18+ Adult warning modal
**New file:** `src/components/AgeGateModal.tsx`
**Wired in:** `src/routes/__root.tsx` (renders once on the public site, skipped under `/admin`)

Behavior:
- Shows on first visit. Stores `age_verified=true` in `localStorage` with 30-day expiry.
- Two buttons: **"I am 18 or older — Enter"** (sets flag, closes) and **"I am under 18 — Leave"** (redirects to `https://www.google.com`).
- Backdrop is non-dismissible (no outside-click close, no ESC). Locks body scroll.
- Branded styling consistent with the rest of the site (gradient, soft shadow, large readable type for mobile).

Generated copy (inside the modal):
> **Adults Only — 18+**
>
> CallEscort24 is an adult directory containing explicit content, including nudity, sexually suggestive material, and listings for adult services provided by independent advertisers.
>
> By entering this site you confirm that:
> - You are at least 18 years old (or the age of majority in your jurisdiction, whichever is higher).
> - Viewing adult content is legal in your country, state, or region.
> - You will not share content from this site with anyone under 18.
> - You agree to our Terms of Service and Privacy Policy.
>
> CallEscort24 is a classified advertising platform only. We do not provide, broker, or endorse any services. All advertisers are independent third parties responsible for their own listings.

---

## 3. Terms, Privacy, Cookies — adult-directory rewrite
Update each route's content to match an adult classified-directory model (advertiser/visitor distinction, no endorsement, 18+, anti-trafficking, DMCA, 2257-style record-keeping disclaimer, payment terms, account termination, jurisdiction).

- `src/routes/terms.tsx` — rewrite sections: Eligibility (18+), Acceptable Use (no minors, no trafficking, no non-consensual content, no illegal services), Advertiser Responsibilities, Verification/KYC, Payments & Refunds (non-refundable credits), DMCA, Account Termination, Disclaimers, Jurisdiction.
- `src/routes/privacy.tsx` — rewrite: Data collected (account, KYC docs, payment metadata, device/IP), legal basis, retention, sharing (processors only), advertiser visibility, your rights (access/delete/export), cookies summary linking to /cookies, contact.
- `src/routes/cookies.tsx` — rewrite: Essential cookies (auth, CSRF, age-gate), Functional (city, theme), Analytics (only if user consents via existing `CookieConsent` banner), no third-party ad tracking, how to clear.

All three keep existing route metadata structure (head() title/description), updated copy only.

---

## 4. Light mode color polish
**File:** `src/styles.css`

Audit `:root` (light) tokens vs `.dark` and fix mismatches surfaced in screenshots:
- Page background slightly warmer off-white instead of pure white (less harsh on mobile OLED).
- Primary stays purple, but light-mode `--primary-foreground` raised to ensure WCAG AA contrast on gradient buttons.
- `--muted-foreground` darkened in light mode (currently too light on cards).
- `--border` darkened so card edges are visible on white.
- Bottom tab bar / glass surfaces: stronger backdrop tint in light mode (currently `bg-white/85` washes out — switch to a token).
- Verify by capturing `/`, `/search`, `/listings/:id`, `/dashboard` screenshots in light mode before vs after.

---

## 5. Mobile load performance
Targets: faster Time-to-Interactive on a mid-range phone. Concrete changes:

1. **Image optimization on the home page** — `src/routes/index.tsx` imports 9 raw `cat-*.jpg` files. Convert to `?format=webp&w=400` via `vite-imagetools` (already supported per perf knowledge) and add `loading="lazy" decoding="async" width height` on every `<ListingCard>` / category tile.
2. **Preload LCP image only** — add `<link rel="preload" as="image">` for the hero/featured image in the home route's `head().links`. Remove any sitewide image preloads from `__root.tsx`.
3. **Defer non-critical client queries** — on the home page, `useQuery(["site-stats"])` and pinned-listing query run on first paint. Lower priority by adding `staleTime` already in place, plus `placeholderData: keepPreviousData` and `notifyOnChangeProps: ['data']` to avoid re-renders.
4. **Lazy-load below-the-fold sections** — wrap `RecentlyViewedRail`, `TrendingInCityRail`, and the featured carousel in `React.lazy()` + `<Suspense fallback={null}>`. They never appear on first screen for a new mobile visitor.
5. **Reduce JS on initial route** — move the heavy `Carousel` (embla) import behind the lazy chunk above so embla doesn't ship in the home bundle for visitors who only see the hero.
6. **Font loading** — ensure all custom fonts in `src/styles.css` use `font-display: swap` (verify) and preconnect to the font host if external.
7. **Add `fetchpriority="high"`** to the first hero image and `loading="eager"` on it; everything else stays `loading="lazy"`.
8. **Service worker check** — confirm there is no stale SW caching old chunks; if present, the cache-bust action from Step 1 already covers it.

---

## Technical Details

### Files to add
- `src/components/AgeGateModal.tsx`
- `src/lib/age-gate.ts` (storage helpers)
- `src/lib/admin-cache.functions.ts` (server fn to bump `client_cache_version`)

### Files to edit
- `src/routes/__root.tsx` — mount `<AgeGateModal />`, read `client_cache_version` for reload check
- `src/routes/admin.maintenance.tsx` — add Cache & Cookies card
- `src/routes/terms.tsx`, `src/routes/privacy.tsx`, `src/routes/cookies.tsx` — copy rewrite
- `src/styles.css` — light-mode token tweaks + new keyframes if any
- `src/routes/index.tsx` — image format imports, lazy sections, preload tag, eager LCP image
- `src/components/ListingCard.tsx` — `loading`, `decoding`, `width`, `height` on `<img>`

### DB / config
One new row in `site_settings`: `client_cache_version` (integer, default 1). No schema change beyond that; existing `site_settings` table is reused.

### Out of scope
- No new analytics provider.
- No CDN reconfiguration (already on Cloudflare).
- No change to auth flow beyond admin sign-out on "clear my cache".

---

## Order of execution
1. Legal copy rewrite (no dependencies)
2. Age-gate modal + wire-up
3. Admin cache tools + DB row
4. Light-mode color polish + visual verification
5. Image/perf changes + verify with `browser--performance_profile` before/after
