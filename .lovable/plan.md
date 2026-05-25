## Rebrand to CallEscort24

Replace remaining "Marketly" branding across the app with "CallEscort24", update the support email, and add a new logo + favicon. Domain wiring (`callescort24.org`) is a hosting step you do via Project Settings → Domains; nothing to change in code for that.

### 1. Text replacements (Marketly → CallEscort24)
Update all user-facing copy and `<head>` metadata:
- `src/routes/__root.tsx` — title, description, og/twitter tags, JSON-LD `name`, fallback site name (line 205)
- `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/CookieConsent.tsx`, `src/components/ReportDialog.tsx`, `src/components/admin/AdminSidebar.tsx`
- All per-route `head()` titles in `src/routes/_authenticated.*.tsx`, `about.tsx`, `admin.login.tsx`, `admin.tsx`, `contact.tsx`, `cookies.tsx`, `dmca.tsx`, and any other route files with "— Marketly" suffix (sweep the full list)
- Body copy in `about.tsx`, `cookies.tsx`, `dmca.tsx`, terms/privacy if present

### 2. Support email
Replace existing support address (e.g. on `contact.tsx`, `dmca.tsx`, footer, auth/transactional templates if any) with `support@callescort24.com`.

### 3. Seed / demo accounts
In `src/lib/seed-demo.server.ts` and `src/components/admin/SeedDemoButton.tsx`, change `@marketly.test` emails to `@callescort24.test` and update the displayed admin password label accordingly.

### 4. Storage keys
Rename localStorage namespaces so they don't leak the old brand:
- `src/lib/cookie-consent.ts`: `marketly.cookie-consent.v1` → `callescort24.cookie-consent.v1`, event name `marketly:consent-change` → `callescort24:consent-change` (keep `LEGACY_KEY` migration logic, add the old key to it so existing users aren't re-prompted)
- `src/lib/city-context.tsx`: `marketly.cityId` / `marketly.cityName` → `callescort24.cityId` / `callescort24.cityName` (read old keys once as fallback for migration)

### 5. Logo + favicon
- Generate a new logo with `imagegen` (premium tier, transparent PNG) saved to `src/assets/logo.png`, and use it in `Header.tsx`, `Footer.tsx`, `AdminSidebar.tsx`, and `admin.login.tsx` next to the wordmark.
- Generate a favicon to `public/favicon.png` (and overwrite `public/favicon.ico` via a 512×512 PNG referenced from `__root.tsx` `links`).
- Wire `<link rel="icon">` and `apple-touch-icon` in `__root.tsx`.

### 6. Domain in metadata
Leave canonical/og:url using the existing project URL pattern; switching to `callescort24.org` happens automatically once the custom domain is connected in Project Settings.

### Out of scope
- Connecting the actual `callescort24.org` domain (done in Project Settings → Domains, not code).
- Any database/site_settings row update (the `site_name` admin setting can be edited from the Admin UI after deploy).

### Verification
After edits, grep the repo for `Marketly` / `marketly` and confirm zero remaining matches outside auto-generated files.
