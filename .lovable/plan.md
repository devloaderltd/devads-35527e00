## Goal

Let admin edit the homepage hero, the 4 bento tiles, and toggle which lower sections appear — without touching the rest of the page's behavior.

## What admin will control

**Hero band**
- Badge text (e.g. "Free to post · Free to browse")
- Title (supports a highlighted span via `{accent}…{/accent}` marker)
- Subtitle paragraph
- Primary CTA label + URL
- Secondary CTA label + URL

**Bento — 4 tiles**
1. *Featured tile (large)*: pin a specific listing UUID (optional — falls back to auto-pick from active listings) + override badge label (default "Featured").
2. *Electronics-style gradient tile*: title, subtitle, image, link URL, gradient preset (`primary`, `lavender→indigo`, `amber→coral`, `ocean`).
3. *Small tile A* (currently Furniture): title, subtitle, icon image, link URL, gradient preset.
4. *Small tile B* (currently Pets): same fields as tile A.

Each bento tile (2–4) gets an on/off toggle. If off, the slot collapses on mobile / hides on desktop (the grid uses CSS-only fallbacks so it still looks balanced — empty cells become a faint glass placeholder).

**Section visibility toggles**
On/off for: Trust stats, Category chip strip, Recently viewed rail, Trending-in-city rail, Featured row, Bumped/Trending now rail, Latest listings, City context banner. Hero + bento are always on.

## Where it lives in admin

New route `src/routes/admin.homepage-editor.tsx` (kept separate from the existing `/admin/homepage` which manages generic `homepage_slots` + `site_banners` rows). Sidebar entry: "Homepage editor" under the existing Homepage section.

The page has three stacked panels:
1. Hero
2. Bento tiles (4 sub-cards in a 2×2)
3. Section visibility (compact list of switches)

Each panel has a Save button. A sticky "Preview" link opens `/` in a new tab.

## Data model

Single-row config table `public.homepage_config` (id text default 'global'). One JSONB column per group keeps schema simple and avoids a migration per added field:

```text
homepage_config
- id                text PK default 'global'
- hero              jsonb   (badge, title, subtitle, cta1_label, cta1_url, cta2_label, cta2_url)
- bento_featured    jsonb   (pinned_listing_id, badge_label, enabled)
- bento_tile_2..4   jsonb   (title, subtitle, image_url, link_url, gradient, enabled)
- sections          jsonb   ({ trust_stats: bool, chip_strip: bool, recently_viewed: bool,
                              trending_rail: bool, featured_row: bool, bumped_rail: bool,
                              latest: bool, city_banner: bool })
- updated_at        timestamptz
```

RLS: public SELECT (homepage reads it anonymously); admin-only INSERT/UPDATE via `has_role(auth.uid(), 'admin')`. GRANT SELECT to anon + authenticated; ALL to service_role; UPDATE to authenticated.

A seed row is inserted in the same migration with the current hard-coded defaults so the homepage looks identical on day one.

## Server functions

`src/lib/homepage-config.functions.ts`:
- `getHomepageConfig()` — public read; returns the single row (creates default if missing).
- `saveHomepageConfig({ section, data })` — `requireAdmin` middleware; patches one of `hero | bento_featured | bento_tile_2 | bento_tile_3 | bento_tile_4 | sections` with Zod validation (string length caps, URL format, UUID for pinned listing).

## Homepage wiring (`src/routes/index.tsx`)

- Fetch config via `useQuery(['homepage-config'])` with `staleTime: 5min`. Falls back to current hard-coded defaults if the request fails (no blank page).
- Hero reads from `config.hero`. The `{accent}…{/accent}` marker is split client-side into a `gradient-text` span.
- Bento tile 1: if `pinned_listing_id` set, fetch that listing for hero card; else keep existing auto-pick.
- Bento tiles 2–4: read from `config.bento_tile_*`; hidden when `enabled=false`. Gradient applied via a preset map (no inline color editing — keeps the polished look).
- Each lower section wrapped in `{config.sections.X && (...)}`.

No changes to the auth flow, listing schema, or any other route.

## Out of scope

- Drag-to-reorder sections (user picked "toggles only").
- Adding new sections from admin (no page-builder).
- Editing the category chip strip from here — still managed in `/admin/categories`.
- Editing the Trust stats numbers (they're live counts).
- Custom color/gradient pickers — admin picks from 4 presets.

## Technical notes

- `homepage_config` uses single-row pattern (id default 'global') like `site_settings` / `smtp_settings` already in the project — same conventions, same `set_updated_at` trigger.
- Image fields accept any URL; admin can paste from Cloud storage (existing `branding` / `listing-images` buckets) or external. No new upload UI in this pass.
- The pinned-listing fetch reuses the same `select(...)` shape as the existing hero query so `ListingCard` / hero card rendering is unchanged.
- Config caching: 5-minute query staleTime on the public read; admin save calls `queryClient.invalidateQueries(['homepage-config'])` so editor preview updates immediately.
