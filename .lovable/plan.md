# Seed Marketly with realistic users, listings & images

## What you'll get

- **6 demo users** with real auth accounts (sign-in works), display names, avatars, and home cities
- **12 listings** spread across categories (Vehicles, Housing, Electronics, Furniture, Pets, For Sale) in US / UK / CA cities
- **1 AI-generated photo per listing** (12 images), uploaded to the existing `listing-images` storage bucket
- 2 of the 12 listings flagged as **Featured** so the "Featured listings" row on the home page lights up

## Sample listings (titles, prices)

| Category | Title | City | Price |
|---|---|---|---|
| Vehicles | 2019 Trek Marlin 7 mountain bike — like new | Brooklyn, NY | $480 |
| Vehicles | 2017 Honda Civic LX, 62k miles, clean title | Austin, TX | $13,900 |
| Housing | Sunny 1BR apartment, Northern Quarter | Manchester, UK | £950/mo |
| Housing | Cozy studio near McGill, all-inclusive | Montréal, CA | C$1,250/mo |
| Electronics | MacBook Air M2, 16GB / 512GB, AppleCare till 2026 | San Francisco, CA | $1,100 |
| Electronics | Sony WH-1000XM5 headphones, sealed box | London, UK | £260 |
| Furniture | Mid-century walnut sideboard | Toronto, CA | C$420 |
| Furniture | West Elm Andes 3-seat sofa, charcoal | Chicago, IL | $700 |
| Pets | Adopt: 2yo tabby cat, fully vetted | Bristol, UK | Free |
| Pets | Rehoming aquarium setup, 40 gal complete | Seattle, WA | $180 |
| For Sale | Vintage Polaroid SX-70 + film | Vancouver, CA | C$220 |
| For Sale | Peloton Bike+ with shoes (size 10) | Boston, MA | $1,650 |

Two are marked Featured: the Trek bike and the MacBook Air.

## How it'll be built

```text
1. Create 6 auth users via admin API (server script)
   └─ handle_new_user trigger auto-creates profiles + 'user' role
2. Update each profile with display_name, avatar_url, city_id
3. Pick a random matching city per listing
4. Insert 12 listings (one-off SQL insert, owner = one of the 6 users)
5. For each listing:
   ├─ Generate a realistic product/place photo (1024×1024)
   ├─ Upload to listing-images bucket at <user_id>/<listing_id>/0.jpg
   └─ Insert listing_images row pointing at the public URL
6. Insert 2 listing_promotions rows (type=featured, ends_at=+7d) for the
   two Featured items
```

### Technical details

- **Users**: created via `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })` from a one-off Node script run via `bun`. Emails like `mia.chen@demo.marketly.app`, password `Demo123!` so they're visible in the demo. Existing `handle_new_user` trigger handles profile + role.
- **Avatars**: 6 generated portrait illustrations saved to `src/assets/` (not uploaded to storage — referenced by the seed script as data URLs uploaded to `listing-images` bucket under an `avatars/` prefix, since that bucket is public).
- **Listing images**: generated via the agent's `imagegen--generate_image` tool to `/tmp/seed/*.jpg`, then uploaded to the `listing-images` public bucket through the admin client. Each gets a sensible prompt (e.g. "Photo of a red Trek Marlin 7 mountain bike leaning on a brick wall, natural light").
- **Cities**: queried at seed time from the existing `cities` table by name+country so we don't hardcode UUIDs.
- **Idempotency**: the seed script checks for an existing user by email before creating, and short-circuits if all 6 demo users already exist, so running it twice won't duplicate data.

## What I won't touch

- No schema changes — uses existing tables, RLS, triggers, and the existing `listing-images` bucket
- No changes to the home page, listing card, or detail page (those were just updated)
- No real customer data — every email ends in `@demo.marketly.app`

Approve and I'll generate the images and run the seed.