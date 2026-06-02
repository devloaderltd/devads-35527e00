# Post-Deploy Upgrades

Six focused fixes. No major refactors.

## 1. Google OAuth on hosted Supabase (your new project)

Since the new DB is at supabase.com, no env/Docker work. Guide steps (also delivered as `GOOGLE_OAUTH_SETUP.md`):

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth Client ID → **Web application**.
2. Authorized JavaScript origins: `https://callescort24.org`
3. Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback` (copy this exact URL from Supabase → Auth → Providers → Google panel).
4. Copy Client ID + Client Secret.
5. **Supabase dashboard** → Authentication → Providers → Google → Enable, paste credentials, Save.
6. **Supabase dashboard** → Authentication → URL Configuration:
   - Site URL: `https://callescort24.org`
   - Redirect URLs: add `https://callescort24.org/**`
7. Test sign-in on the live site.

Code already uses `supabase.auth.signInWithOAuth({ provider: 'google' })`, so no app changes.

## 2. New listings not showing first

**File:** `src/routes/index.tsx` line 88.

Current sort: `.order("bumped_at", { ascending: false })` — new listings have `bumped_at = NULL` and Postgres sorts NULLs last, so they appear at the bottom.

Fix: replace with two orders so paid bumps still surface first, then newest:
```ts
.order("bumped_at", { ascending: false, nullsFirst: false })
.order("created_at", { ascending: false })
```

## 3. Featured posts → horizontal swipe carousel

**File:** `src/routes/index.tsx` lines 397–399.

Replace the static grid with the existing embla `Carousel` from `src/components/ui/carousel.tsx`:
- Options: `{ align: 'start', dragFree: true }`
- Item width: `basis-[80%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4` (mobile shows ~1.2 cards, swipeable)
- Show `CarouselPrevious`/`CarouselNext` arrows on `md+` only.

## 4. View counts not incrementing

App code is correct (`supabase.rpc('increment_listing_view', { _listing_id })`). On the new hosted Supabase project the function exists (from the restore) but EXECUTE may not be granted to anon/authenticated.

**Action:** run this one-off migration on the new project:
```sql
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated;
```
(Migration tool will surface for approval.)

## 5. Favicon — minimal monoline icon

- Generate a minimal monoline mark (single accent color on transparent) at 1024×1024 via imagegen.
- Export PNGs: `public/favicon.png` (192), `public/favicon-32.png` (32), `public/apple-touch-icon.png` (180).
- Wire `<link rel="icon">`, `<link rel="apple-touch-icon">`, and `<meta name="theme-color">` into `src/routes/__root.tsx` `head()`.

## 6. Deliverables

- Edit `src/routes/index.tsx` (sort + carousel)
- Edit `src/routes/__root.tsx` (favicon links)
- Add `public/favicon.png`, `public/favicon-32.png`, `public/apple-touch-icon.png`
- Migration: GRANT EXECUTE on `increment_listing_view`
- New file: `GOOGLE_OAUTH_SETUP.md`

## Not included (say the word and I'll do them)
- Custom email template redesign + Supabase SMTP/Auth template wiring
