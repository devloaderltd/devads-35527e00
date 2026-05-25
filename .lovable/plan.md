## Goals

1. Listings should support a real photo gallery, not just one image.
2. Cap uploads at 5 photos per listing.
3. Seed extra photos for the existing demo listings (which only have 1 each).
4. Show the seller's avatar on the listing page (avatars are currently empty).
5. Show the seller's contact info (phone + email) on the listing page.

## What's already there

- The listing detail page (`src/routes/listings.$id.tsx`) already renders a carousel + thumbnails + lightbox — the gallery UI works, it just has no extra images to show.
- The post form (`src/routes/_authenticated.post.tsx`) already accepts up to 8 photos with previews — needs to be reduced to 5.
- The seller card on the listing page already shows an avatar slot — but `profiles.avatar_url` is `null` for every seeded user, so it always falls back to initials.
- `profiles.phone` exists but is empty; email lives in `auth.users`, not in `profiles`.

## Plan

### 1. Post form — cap at 5 photos
- Change the limit in `_authenticated.post.tsx` from 8 → 5 (slice, guard, and the "Photos (up to 8)" label).

### 2. Seed photos for demo listings
- Generate 4 extra marketplace-style stock images per existing listing using `imagegen` (themed roughly by category: electronics, furniture, vehicles, fashion, etc.) and upload them to the `listing-images` bucket, then insert rows in `listing_images` with `sort_order` 1–4 so the existing cover stays as `sort_order: 0`.
- This makes the gallery + thumbnails + lightbox visible on every demo listing.

### 3. Avatars for demo sellers
- Generate a clean avatar portrait for each of the 6 seeded profiles, upload to `listing-images/avatars/<user_id>.jpg`, and update `profiles.avatar_url`.
- The listing detail seller card and the seller profile page already read `avatar_url`, so no UI change needed.

### 4. Contact info on the listing
- Add `phone` and a public-contact opt-in to the post form, and write phone to `profiles.phone` on first post (or via the profile edit page — already exists).
- Seed `phone` for the 6 demo profiles so listings have something to show.
- On the listing detail page, add a compact "Contact" block inside the seller card:
  - **Phone:** click-to-call `tel:` link (only shown if `profile.phone` is set).
  - **Email:** click-to-mail `mailto:` link.

  Email source: read it via a small server function (`getSellerContact(listingId)`) that uses `supabaseAdmin` to look up `auth.users.email` for the listing's `user_id`, gated by `requireSupabaseAuth` so only signed-in users see it. This avoids exposing emails to anonymous scrapers while still letting real buyers contact the seller. Anonymous visitors see a "Sign in to see contact info" prompt instead.

### 5. Profile edit polish
- The existing `/profile` route already edits `display_name`, `bio`, `phone`, `city`, avatar — confirm phone is wired and add a small helper text explaining it shows on their listings.

## Out of scope

- Reordering photos after upload, image cropping, public seller email without sign-in, SMS verification of phone numbers.
