## Goal
Let admins upload a custom logo and favicon from the admin Site Settings page. Both should propagate live to the header and document head.

## Database
New migration:
- Add `logo_url text NOT NULL DEFAULT ''` and `favicon_url text NOT NULL DEFAULT ''` columns to `public.site_settings`.
- Create public storage bucket `branding` (public read) with RLS:
  - SELECT: public (anyone)
  - INSERT/UPDATE/DELETE: only `has_role(auth.uid(),'admin')`

## Server functions (`src/lib/admin.functions.ts`)
- Extend `siteSettingsSchema` with `logo_url` and `favicon_url` (string URL, max 500, allow empty to reset).
- Include both keys in the patch loop of `updateSiteSettings`.
- `getSiteSettings` already returns the row — no change needed beyond new columns being included.

## Admin UI (`src/routes/admin.settings.tsx`)
Add a new "Logo & Favicon" panel inside the Branding section with two uploaders:
- File `<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon">` for each.
- Client-side validation: logo ≤ 1 MB, favicon ≤ 256 KB.
- On select: upload to `branding/logo-{timestamp}.{ext}` / `branding/favicon-{timestamp}.{ext}` via the browser supabase client, get `getPublicUrl`, set in form state, mark dirty.
- Show current preview (img tag) + "Remove" button (clears the URL → empties field).
- Saved on the existing "Publish changes" flow.

## Public consumption
- `src/components/Header.tsx`: fetch site settings via existing `site-settings-public` query (already used elsewhere — verify and reuse); if `logo_url` is set, render it; otherwise fall back to the bundled `@/assets/logo.png`.
- `src/routes/__root.tsx`: convert the static favicon `<link>` entries to read from a loader that pulls `site_settings.favicon_url`. If empty, keep `/favicon.png` default. (Loader uses a public server fn that returns just `{ logo_url, favicon_url, site_name }` — no auth required.)

## Verification
1. Run migration; confirm columns + bucket exist.
2. As admin, upload a PNG logo and a .ico favicon; publish.
3. Reload the public site → header logo + browser tab favicon update.
4. Re-run security scan — bucket policies should pass (admin-only writes, public reads, same as `listing-images`).