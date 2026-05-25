## Polish full website to chosen direction: Typographic Minimalist (dark + Sunset Blaze)

The user picked the **Typographic Minimalist** prototype: deep `#0a0a0c` / `#0f0f12` surfaces, glassmorphism layers (`bg-white/5 border-white/10`), Sunset Blaze accents (#ff6b35 / #f7931e / #e84393 / #6c5ce7), Space Grotesk display + DM Sans body, with subtle radial glows on primary buttons.

Scope is the **homepage + global design system** so the new look propagates to every page (search, listings, dashboard, admin, auth) via semantic tokens.

### 1. `src/styles.css` — swap the design system to dark Sunset Blaze
- Rewrite `:root` tokens to dark mode by default:
  - `--background: #0a0a0c`, `--card: #0f0f12`, `--foreground: white`, `--muted-foreground: white/70`
  - `--primary` = indigo `#6c5ce7`, `--secondary` = magenta `#e84393`, `--accent` = amber `#f7931e`, `--coral` = `#ff6b35`
  - `--border` / `--input` use `oklch(1 0 0 / 10%)` for glass strokes
- New gradient family using Sunset Blaze stops:
  - `--gradient-primary`: indigo → magenta
  - `--gradient-warm`: amber → coral → magenta
  - `--gradient-aurora`: full sunset sweep
  - `--gradient-page`: radial glows at four corners over the near-black background
- `--glass-bg: white/5`, `--glass-border: white/10`, deeper shadows + stronger primary glow.
- Collapse `.dark { … }` to just `color-scheme: dark` since the design is dark-first.

### 2. `src/components/Header.tsx` — dark glass nav
- Replace `bg-white/60` style backdrops with the new `glass-strong` (dark) variant.
- City pill: dark glass with amber pulse dot.
- "Post" button keeps `btn-gradient` (now indigo → magenta with primary glow).
- Sign-in button: white pill on dark, matching prototype.

### 3. `src/routes/index.tsx` — match prototype composition
- Hero section: dark glass card with two corner radial glows (magenta top-right, indigo bottom-left), pulsing amber chip, gradient-text headline that fades white → 60% white, sunset CTA + ghost glass "Browse all".
- Bento categories: full-width Electronics card with layered indigo/magenta gradient + blur, two square cards (Furniture amber, Pets coral) with icon tiles.
- Listing rails (Featured / Trending / Latest): keep current data flow, restyle section headings and skeletons to dark glass.
- City banner and empty-city CTA: dark glass + sunset gradient button.

### 4. Quick polish carried by tokens (no per-file edits)
- All shadcn components (Button, Card, Dialog, Sheet, Input, Sidebar, etc.) inherit the new dark Sunset Blaze tokens automatically.
- `glass`, `glass-strong`, `btn-gradient`, `gradient-text`, `hover-float` utilities keep their names so existing usage across `/search`, `/listings/$id`, `/post`, `/dashboard`, `/wallet`, `/admin/*` instantly adopts the new look.

### Out of scope
- No business-logic / data-fetching changes.
- No DB migrations.
- No rewrite of individual sub-pages — they re-skin themselves through the token swap.
- Light mode is removed (design direction is dark-first); the existing `ThemeToggle` stays but both states render dark for now.
