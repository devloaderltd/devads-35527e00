## Remove Lovable references from the app

Replace every user-facing/SEO mention of `devads.lovable.app` and "Lovable" with the new brand domain `callescort24.org`, and scrub copy that names Lovable Cloud.

### 1. Swap canonical domain → `https://callescort24.org`
Update the hard-coded URLs in:
- `src/routes/__root.tsx` (JSON-LD `url` and search `target`)
- `src/routes/index.tsx`, `search.tsx`, `about.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx`, `cookies.tsx`, `dmca.tsx`, `sellers.$id.tsx` (`og:url` + canonical)
- `src/routes/sitemap[.]xml.tsx` and `src/routes/api/public/sitemap[.]xml.ts` (`BASE` constant)

### 2. Scrub "Lovable" wording from legal/help copy
- `src/routes/privacy.tsx` — replace `devads.lovable.app` link text with `callescort24.org`; change "hosting (Lovable Cloud / Supabase)" to a neutral "hosting and infrastructure providers".
- `src/routes/terms.tsx` — replace the `devads.lovable.app` link/text with `callescort24.org`.
- `src/routes/cookies.tsx` — change "Lovable Cloud / Supabase session and auth tokens" to "session and authentication tokens".

### Out of scope (intentionally untouched)
- `src/integrations/supabase/*` (auto-generated, must not be edited).
- `vite.config.ts`, `bunfig.toml`, `package.json` — these reference the `@lovable.dev/*` build toolchain; they are required for the project to build and are never shown to end users.
- `.lovable/` internal files.
- Hosting/domain connection itself (done in Project Settings → Domains, not code).

### Verification
After edits, `rg -i "lovable" src/routes` should return zero matches.
