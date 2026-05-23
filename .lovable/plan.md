## Unfinished / weak spots found

- **Seller info is minimal** — listing detail only shows `display_name`. No avatar, member-since, location, other listings, or a way to view the seller's profile.
- **No public seller profile page** — clicking a seller name goes nowhere.
- **No "bio" field on profiles** — sellers can't introduce themselves.
- **No favorites toggle** on listing cards or detail page — `favorites` table exists, route exists, but nothing writes to it.
- **No image carousel** on listing detail — only the first image is large; the rest are thumbnails with no click behavior.
- **No share button** on listings.
- **No profile edit page** — users can't change their display_name, avatar, phone, city, or bio.
- **No "Other listings by this seller"** rail on listing pages.
- **No view-count increment** — `listings.view_count` exists but never increments.

## Plan

### 1. DB additions (single migration)
- Add `bio text` and `created_at` is already there. Add `bio` only.
- Add SQL function `increment_listing_view(listing_id uuid)` (SECURITY DEFINER) that increments `listings.view_count`. Grant execute to `anon` and `authenticated` so public viewers can bump it. RLS already restricts row visibility — the function just bumps a counter on active listings.
- No other schema changes.

### 2. New route — public seller profile (`src/routes/sellers.$id.tsx`)
- Hero card: avatar, display_name, city + country, member-since, bio, listing count.
- "Active listings" grid (uses `ListingCard`).
- SEO `head()` with seller name + canonical URL.
- Linkable from listing detail and message threads.

### 3. New route — edit profile (`src/routes/_authenticated.profile.tsx`)
- Form: display_name, bio (textarea), phone, city select, avatar upload (uses `listing-images` bucket under `avatars/<uid>/…`).
- Save updates `profiles` row. Toast on success.
- Header dropdown gets a "Profile" link.

### 4. Listing detail enrichments (`src/routes/listings.$id.tsx`)
- Replace plain seller block with a glass card: avatar, name (linked to `/sellers/$id`), member-since, city, listing count badge, **View profile** button next to Message seller.
- **Image carousel**: clicking a thumbnail swaps the hero; left/right arrows; keyboard nav; lightbox modal on click.
- **Favorite button** (heart) in the seller card — toggles `favorites` row for the current user; shows count of favorites for the listing.
- **Share button** — uses Web Share API where available, falls back to copy-to-clipboard with toast.
- **"More from this seller" rail** — 4 of the seller's other active listings as `ListingCard`s.
- Fire `increment_listing_view` RPC once on mount.

### 5. Favorites toggle on cards (`src/components/ListingCard.tsx`)
- Small heart button (top-right corner, under the price chip) — toggles favorite for logged-in users; redirects to `/login` if anonymous.
- Optimistic update via TanStack Query mutation; invalidates `favorites` and `listing-favorites` keys.

### 6. Small polish
- Header dropdown: add **Profile** link before **My listings**.
- Search results: each card uses the new favorite toggle.
- Messages thread header: link the other party name to their `/sellers/$id` page.

## Technical notes
- All new pages follow the established Vapor glass/gradient tokens — no new design tokens needed.
- Public seller profile + listing detail stay public (no auth required), so loaders query Supabase directly using the browser client (RLS already allows `profiles` public read and active listings public read).
- View-count RPC is fire-and-forget — failure is silently ignored.
- No edge functions, no new packages.

## Out of scope
- Seller ratings/reviews (would need new table + moderation).
- Verification badges.
- Following sellers.
- Saved searches.
