## Redesign Marketly — Vapor Glass

Locked direction: light iridescent backdrop, glassmorphic cards, soft 3D shadows, animated gradient CTAs. Mobile-first. Per-route SEO.

### 1. Design tokens (`src/styles.css`)

Replace the theme with the Vapor Chrome palette:

- `--background` ≈ #f8fafc with sitewide radial gradient (lavender top-right, cyan bottom-left)
- `--foreground` deep indigo (#1e1b4b)
- `--primary` indigo #818cf8, `--accent` cyan #67e8f9, `--secondary` lavender #c4b5fd, `--ice` #a5f3fc
- Add semantic tokens: `--gradient-primary` (indigo→cyan), `--gradient-hero`, `--glass-bg` (white/40), `--glass-border` (white/60), `--shadow-soft`, `--shadow-float` (multi-layered)
- Add `--font-display: 'Space Grotesk'`, `--font-body: 'DM Sans'`
- Add keyframes: `gradient-shift` (animated CTA), `float`, `shimmer`; utility classes `.btn-gradient`, `.glass-card`, `.iridescent-border`
- Load Google Fonts in `__root.tsx` head

Dark mode tokens kept consistent.

### 2. Shared chrome

- `src/components/SiteHeader.tsx` — new sticky floating glass nav (logo gradient tile, search pill, post button, sign-in). Mobile: collapse search into icon, show drawer for menu.
- `src/components/SiteFooter.tsx` — minimal glass footer with links + brand.
- `src/components/ListingCard.tsx` — redesign as rounded-[1.5rem] glass card with image, price chip, location, hover-float shadow.
- `src/components/CategoryTile.tsx` — small/medium bento tile variants (icon + label, optional gradient bg).

### 3. Homepage (`src/routes/index.tsx`)

Replace current hero + grid with:
- Hero band: gradient-glass card, eyebrow chip, large headline (gradient span on accent phrase), subhead, two CTAs (solid indigo + glass outline).
- Bento grid (md:grid-cols-4, 2 rows on desktop, single column mobile): large featured listing tile (image + price chip), medium gradient category tile (Electronics), small glass category tiles (Furniture, Pets) — pulled from existing categories + featured listings.
- Below: "Latest listings" section using `ListingCard` grid (existing data query kept).
- Categories strip + city filter retained, restyled as glass chips.

### 4. Other routes — apply theme

Restyle (tokens only, no logic changes):
- `src/routes/listings.tsx` (browse), `src/routes/listings.$id.tsx`, `src/routes/listings.new.tsx`
- `src/routes/auth.*`, `src/routes/account.*`, `src/routes/checkout.return.tsx`
- `src/components/PaymentTestModeBanner.tsx`, `PromoteDialog.tsx`

All pages use `SiteHeader` + sitewide radial-gradient body background.

### 5. SEO

- `__root.tsx`: viewport, charset, og:site_name, default Organization JSON-LD, no canonical here.
- Per-route `head()`: unique title (<60ch), description (<160ch), og:title/description/url, canonical (leaf only). Use `https://devads.lovable.app` base.
- Single H1 per page, semantic `<header>/<main>/<section>/<footer>`, alt text on listing images, lazy loading already in place.
- Add `BreadcrumbList` JSON-LD on listing detail; `Product` JSON-LD on `listings.$id` from loader data.
- Verify `public/robots.txt` allows crawling; `sitemap.xml` lists `/`, `/listings`, `/auth`.

### 6. Responsive QA

Mobile viewport (393px) is the design target. Tap targets ≥44px, no horizontal scroll, bento collapses to single column, header search collapses to icon.

### Technical notes

- No DB / server-fn / auth changes. Pure presentation.
- Keep existing TanStack Query loaders and routing intact.
- Tokens live in `src/styles.css` only — components reference `bg-primary`, `bg-accent`, `text-foreground`, custom utility classes. No raw hex in TSX.
- Animation via Tailwind keyframes + CSS, no new libs.
