# Remaining Work — Marketly

The core marketplace (browsing, posting, messaging, favorites, reports, admin moderation) is live. Here is the plan for what's left.

## 1. Promotions & Payments (Stripe)

Goal: let sellers pay to **feature** a listing (homepage + top of search) or **bump** it (reset `bumped_at` so it returns to the top of recents).

- Run `recommend_payment_provider`, then enable **Lovable's built-in Stripe payments** (`enable_stripe_payments`). No user API key needed.
- Create two products via `batch_create_product`:
  - **Featured listing** — 7 days, ~$9.99
  - **Bump listing** — single bump, ~$2.99
- Server function `createPromotionCheckout({ listingId, type })`:
  - Verifies caller owns the listing (`requireSupabaseAuth`)
  - Inserts a `payments` row (status=pending)
  - Returns a Stripe Checkout session URL
- Webhook route at `src/routes/api/public/stripe-webhook.ts`:
  - Verifies signature, marks payment `succeeded`
  - Inserts `listing_promotions` row (featured: ends_at = now + 7d; bump: updates `listings.bumped_at = now()`)
- UI:
  - "Promote this listing" button in **My Listings** → dialog with two options → redirects to Stripe Checkout
  - Success/cancel routes (`/promote/success`, `/promote/cancel`)
  - Badge "Featured" on `ListingCard` when an active promotion exists
  - Home + search queries updated to surface featured listings first

## 2. Profile & Settings Page

- `_authenticated.settings.tsx` — edit display name, phone, avatar (upload to storage), default city
- Public seller profile route `users.$id.tsx` — shows display name, avatar, member since, and their active listings

## 3. Search & Browsing Polish

- Category landing routes (`categories.$slug.tsx`) using the existing categories table
- Sort options on `/search` (newest, price asc/desc, featured first)
- Price range filter + condition filter
- Pagination (load-more) — currently capped at default 1000-row limit
- Empty states and skeleton loaders across listing grids

## 4. Listing Lifecycle

- Mark as **sold** / **paused** from My Listings (UPDATE `status`)
- Auto-expire surfacing: filter `expires_at > now()` in public queries
- "Renew listing" action when expired (extends `expires_at` by 30d)

## 5. Notifications

- Unread message count badge on Header (Messages icon)
- Simple in-app toast when a new message arrives on any thread (realtime subscribe at root for signed-in users)

## 6. SEO & Metadata

- Per-listing `head()` with title, description, og:image (first listing image), JSON-LD `Product` schema
- Per-category and per-city head() metadata
- Sitemap route `api/public/sitemap.xml` generating URLs for active listings

## 7. Final Polish

- Mobile nav drawer in Header (search currently cramped on mobile)
- 404 / error states for missing listings
- Confirm-dialog on destructive actions (delete listing, dismiss report)
- Footer links: About, Safety tips, Terms, Contact (static routes)

## Technical Notes

- All payment writes go through the webhook (RLS blocks direct inserts to `payments` / `listing_promotions`)
- Featured ordering: `ORDER BY (has_active_promotion) DESC, bumped_at DESC` — implement as a SQL view or compose in the server function
- Stripe secret managed by Lovable's built-in integration; no manual `STRIPE_SECRET_KEY` needed

## Suggested Build Order

1. Payments + promotions (biggest revenue feature)
2. Listing lifecycle (sold/paused/renew)
3. Profile/settings + public seller pages
4. Search polish (sort, filters, pagination)
5. Notifications + unread badges
6. SEO + sitemap
7. Final UI polish

Reply **approve** to start with step 1, or tell me to reorder / drop sections.
