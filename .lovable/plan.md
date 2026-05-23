## Remaining work

The design overhaul and 100-listing seed are in place, but several routes and shared pieces still use the old chrome, and the homepage isn't yet pulling the seeded Featured/Bumped data into dedicated rails.

### 1. Homepage data wiring (`src/routes/index.tsx`)
- Add a **Featured showcase** that queries listings joined with `listing_promotions` where `ends_at > now()`, surfacing 1 large hero card + 3 secondary featured cards with the iridescent/Premium treatment.
- Add a **"Trending now" rail** — horizontal scroll of the 12 most recently `bumped_at` listings, using `ListingCard` with the Bumped chip.
- Keep the existing Bento category tiles and Latest listings grid below.

### 2. Header polish (`src/components/Header.tsx`)
- Gradient logo tile with pulse-glow, glass background with stronger blur, gradient "Post ad" CTA, animated active-link underline, mobile search collapses to icon at <640px.

### 3. Remaining authenticated routes
Apply glass panels + gradient CTAs + polished empty states (no logic changes) to:
- `_authenticated.my-listings.tsx`
- `_authenticated.favorites.tsx`
- `_authenticated.messages.tsx` / `.index.tsx` / `.$threadId.tsx`
- `_authenticated.admin.tsx`
- `checkout.return.tsx`

### 4. Shared components
- `PromoteDialog.tsx`: gradient option cards (Featured = iridescent, Bump = warm gradient), price chips, glass dialog surface.
- `PaymentTestModeBanner.tsx`: subtle gradient strip instead of flat color.
- New `CategoryTile.tsx` extracted from index for reuse on a future browse-by-category view (optional this pass).

### 5. SEO + responsive QA
- Verify per-route `head()` titles/descriptions are unique on every route touched.
- Mobile (393px) check: bento collapses to 1 col, trending rail scrolls horizontally, header tap targets ≥44px, glass panels don't blow out contrast.

### 6. Verification
- Load `/` and confirm Featured + Bumped rails render with seeded data.
- Load `/search` and confirm Premium badges appear on the 20 featured rows and Bumped chips on the 30 recently-bumped rows.
- Spot-check a listing detail page to confirm the seeded persona + category image render.

### Out of scope
- No DB schema changes, no new packages, no auth/business-logic changes.
- No new seed data — the existing 100 listings / 9 images stay as-is.
