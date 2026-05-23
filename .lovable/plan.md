
# Classifieds Marketplace — Build Plan

A country-wide, general-purpose classifieds site (think Craigslist-style) where anyone can browse, signed-in users can post, and sellers can pay to feature their listings.

## Core experience

**Public (no account needed)**
- Home: city picker, featured listings strip, category grid, recent listings, search bar
- City landing: `/c/:city` — listings scoped to that city
- Category landing: `/category/:slug` — with subcategory filters
- Listing detail: `/listing/:id` — photos, description, price, location, seller info, contact button, report button
- Search: keyword + filters (category, city, price range, condition, date)
- Static pages: About, Safety tips, Terms, Contact

**Account-gated**
- Sign up / Log in (email+password and Google)
- Post a listing (multi-step form: category → details → photos → location → review)
- My listings dashboard: edit, mark sold, delete, renew, promote
- Saved/favorited listings
- Inbox: simple buyer↔seller messaging on a listing
- Profile settings

**Admin**
- Moderation queue for reported listings
- Flag/remove listings, ban users
- Category management

## Categories (seeded)

For Sale, Vehicles, Housing/Real Estate, Jobs, Services, Community, Pets, Electronics, Furniture — each with subcategories.

## Monetization — Featured Listings

- Free tier: standard listing, ranks by recency, expires after 30 days
- Paid promotions purchased per listing:
  - **Featured (7 days)** — appears in home strip + top of category/city
  - **Bump (3 days)** — re-floats to top of recency sort
  - **Highlight (14 days)** — colored border + badge in lists
- Payment via Lovable's built-in payments — provider chosen via `recommend_payment_provider` after build-out begins (likely Stripe for a marketplace).

## Geography model

- Single country (you'll specify which during build). Seed ~30-50 major cities.
- Every listing requires a city. Browsing defaults to "All cities" but a sticky city picker scopes results.

## Trust & safety (built in from day one)

- Email verification required before first post
- Per-account rate limit on new listings (e.g. 5/day)
- Image upload virus/size limits, EXIF stripping
- Report button on every listing → moderation queue
- Phone number hidden by default, revealed via in-app messaging
- No adult/escort/illegal categories — enforced at category seed and signup terms

## Tech / architecture (technical section)

- **Stack:** TanStack Start (already scaffolded) + Lovable Cloud (Supabase) for DB, auth, storage
- **Routes:**
  - Public: `/`, `/c/$city`, `/category/$slug`, `/listing/$id`, `/search`, `/login`, `/signup`, `/about`, `/safety`, `/terms`
  - Authed (`_authenticated/`): `/post`, `/my-listings`, `/my-listings/$id/edit`, `/messages`, `/messages/$threadId`, `/favorites`, `/settings`
  - Admin (`_authenticated/_admin/`): `/admin/reports`, `/admin/users`, `/admin/categories`
  - API: `/api/public/payments/webhook` for payment confirmation
- **Data model (Supabase tables):**
  - `profiles` (id→auth.users, display_name, phone, city, avatar, verified_email_at)
  - `user_roles` (id, user_id, role enum: user|moderator|admin) — separate table per security rules
  - `categories` (id, slug, name, parent_id, icon, sort_order)
  - `cities` (id, slug, name, region)
  - `listings` (id, user_id, category_id, city_id, title, description, price, currency, condition, status enum: draft|active|sold|expired|removed, created_at, expires_at, search_tsv)
  - `listing_images` (id, listing_id, url, sort_order)
  - `listing_promotions` (id, listing_id, type enum: featured|bump|highlight, starts_at, ends_at, payment_id)
  - `favorites` (user_id, listing_id)
  - `message_threads` (id, listing_id, buyer_id, seller_id, last_message_at)
  - `messages` (id, thread_id, sender_id, body, created_at)
  - `reports` (id, listing_id, reporter_id, reason, status, created_at)
  - `payments` (id, user_id, listing_id, provider, provider_session_id, amount, currency, status, created_at)
- **RLS:** every user-data table enabled; `has_role()` SECURITY DEFINER function for admin checks; public-read policies only for `listings WHERE status='active'`, `categories`, `cities`
- **Server functions** (`createServerFn` + `requireSupabaseAuth`): create/update/delete listing, send message, favorite, report, purchase promotion, admin actions
- **Public data:** category/city/listing-detail reads via server fn using `supabaseAdmin` with explicit column projection (no PII)
- **Images:** Supabase Storage bucket `listing-images`, public read, authed write, max 8 per listing
- **Search:** Postgres full-text on title+description; filters via indexed columns
- **Payments:** enabled after listings flow works — `recommend_payment_provider` → `enable_*_payments` → product per promotion type → checkout server fn → webhook updates `payments` + creates `listing_promotions` row

## Build order

1. Design direction (let you pick a look)
2. Enable Lovable Cloud + auth (email + Google)
3. DB schema + RLS + seed categories/cities
4. Public browsing: home, category, city, listing detail, search
5. Posting flow + image upload + my-listings dashboard
6. Messaging + favorites + reports
7. Admin moderation
8. Payments + featured listings
9. Static pages, SEO meta on every route, polish

## What I'll ask you next, after you approve

- Which country and 1-2 example cities to seed first
- Whether to ask design-direction questions (palette / typography / layout) or you have a reference site in mind
- Whether Google sign-in should be enabled alongside email/password

This is a sizable build — I'll deliver it in the phases above rather than all at once, so you can review after each.
