## Goal

Two things in one pass:
1. Push the existing Vapor Chrome design further — more color, more polish, tighter interactions across every page.
2. Seed the marketplace with realistic demo content so the homepage, search, and detail pages have something to show: 100 listings, 20 featured (premium), 30 bumped, owned by a handful of personas, with on-brand AI-generated photos.

---

## Part 1 — Colorful & polished UI pass

### 1.1 Design tokens (`src/styles.css`)
- Boost saturation on `--primary`, `--accent`, `--secondary`; add `--brand-coral`, `--brand-mint`, `--brand-amber` as *sub-accents* (still inside the Vapor family) used only on category tiles and badges so the palette stays cohesive.
- Add gradient tokens: `--gradient-primary`, `--gradient-aurora` (animated multi-stop), `--gradient-warm`, `--gradient-cool`, `--gradient-mesh` (used on hero + featured cards).
- New shadow tokens: `--shadow-glow-primary`, `--shadow-glow-accent`, `--shadow-float-lg`.
- New keyframes: `gradient-pan` (slow CTA shimmer), `aurora-shift` (background mesh), `float-y`, `pulse-glow`, `shimmer-sweep`.
- Utility classes: `.btn-gradient`, `.btn-gradient-warm`, `.chip-glass`, `.iridescent-border`, `.card-float`, `.hover-lift`, `.text-gradient`.

### 1.2 Sitewide chrome
- `__root.tsx`: animated aurora mesh on `<body>` (low-opacity, fixed, behind content) so every page feels alive without affecting readability.
- `Header.tsx`: stronger glass, gradient logo tile with pulse-glow, gradient "Post ad" CTA, animated active-link underline.
- New `SiteFooter.tsx` polish: gradient divider, brand mark, small nav.

### 1.3 Homepage (`src/routes/index.tsx`)
- Hero: bigger animated gradient headline, eyebrow chip with shimmer, two CTAs (gradient primary + glass outline), trust strip ("100+ live listings · 9 categories · across the US").
- Bento grid: 4-col desktop / 2-col tablet / 1-col mobile. Tiles:
  - 1 large **Featured** showcase (rotates real featured listing with price chip + "Premium" gradient badge).
  - 6 category tiles each tinted with its own sub-accent (Electronics=cyan, Vehicles=coral, Housing=mint, Furniture=lavender, Pets=amber, Jobs=indigo).
  - 1 promo tile linking to "Post your ad" with gradient mesh background.
- "Trending now" rail: horizontal scroll of bumped listings (chip = "Just bumped"), `ListingCard` reused.
- "Latest listings" grid below.

### 1.4 Cards & shared components
- `ListingCard.tsx`: stronger float shadow on hover, gradient price chip, "Featured" gradient badge when listing has an active promotion, "Bumped" small chip when `bumped_at` is recent.
- `CategoryTile.tsx` (new): icon, label, color-tinted glass background, hover lift.
- `Badge` variants extended: `featured` (gradient), `bumped` (mint chip).

### 1.5 Other routes
- `listings.tsx` (browse/search), `listings.$id.tsx` (detail), `_authenticated.post.tsx`, `_authenticated.my-listings.tsx`, `_authenticated.favorites.tsx`, `_authenticated.messages.*`, `login.tsx`, `signup.tsx`, `checkout.return.tsx`: pass through using the same tokens — glass panels, gradient CTAs, polished empty states. No logic changes.

### 1.6 SEO + responsive QA
- Per-route `head()` with unique title/description, og tags, canonical (already mostly in place — fill any gaps).
- Verify mobile (393px): bento collapses to 1 col, header search collapses to icon, all tap targets ≥44px.

---

## Part 2 — Seed demo listings

### 2.1 Demo personas (5 profiles)
Insert 5 rows directly into `public.profiles` with synthetic UUIDs (table has no FK to `auth.users`, schema permits it). Names: **Anna Park**, **Ravi Mehta**, **Sofia Cruz**, **Marcus Chen**, **Elena Rossi**. Each gets a display_name, avatar URL (DiceBear), and a city.

### 2.2 AI-generated images (one hero per category)
Generate 9 on-brand listing photos using the agent's `imagegen` tool — one per category (Electronics, Vehicles, Housing, Jobs, Services, For Sale, Furniture, Pets, Community). Style prompt: "bright editorial product photography, soft Vapor Chrome lighting (lavender + cyan rim light), clean background, premium feel, 16:9". Save to `/tmp/seed-<slug>.jpg`, then upload each to the `listing-images` Storage bucket under `seed/<slug>.jpg` via `supabase--storage_upload`, capturing the resulting public URLs.

### 2.3 Listings + images (100 rows)
Build a single SQL seed (run via `supabase--insert`) that:
- Inserts 100 listings spread across the 9 categories and ~30 different cities, owned by the 5 demo personas roughly evenly.
- Titles + descriptions are realistic per-category (e.g. "iPhone 15 Pro — 256GB, Mint", "2019 Honda Civic LX — Low miles", "Studio apt downtown Austin, utilities included", "Senior React developer — remote", "Golden Retriever puppies — vet-checked"…). Generated as a static list in the seed script (no runtime AI).
- Prices, currency=USD, condition per category, `bumped_at` and `created_at` spread across last 30 days.
- For each listing, insert 1 `listing_images` row pointing to its category's hero image URL.

### 2.4 Premium (featured) + bumped distribution
- Pick 20 listings → insert `listing_promotions` rows with `type='featured'`, `starts_at=now()`, `ends_at=now()+7 days`. The homepage will surface these in the featured slot and the "Premium" badge on cards.
- Pick another 30 listings → set `bumped_at = now() - random(0..24h)` so they appear first in date-sorted feeds and get the "Bumped" chip.
- Remaining 50 stay as regular active listings.

### 2.5 Status sanity
All seeded listings: `status='active'`, `expires_at = now()+30 days`. RLS already allows public read for active listings, public read of their images, and (after the recent security migration) public read of promotions tied to active listings — so nothing else needs to change.

---

## Technical notes
- No DB schema changes; only data inserts (`supabase--insert` + `supabase--storage_upload`). No new packages. No server-function or auth changes.
- All color/visual changes live in `src/styles.css` + component files; tokens drive everything so dark mode + other routes inherit automatically.
- Image generation happens once at seed time (9 images total), not at runtime — keeps the app fast and avoids per-request AI costs.
- Seed is idempotent-ish: each insert uses fixed UUIDs for personas so re-running won't duplicate them; listings get fresh UUIDs each run (acceptable for a demo dataset).

## What you'll see after build
- A more vivid, animated homepage with a real featured listing, color-tinted category bento tiles, and a trending rail of bumped posts.
- Browse / search pages populated with 100 listings across categories and cities, "Featured" gradient badges on premium ones, "Bumped" chips on recently-bumped ones.
- Listing detail pages with proper hero images and seller personas.
