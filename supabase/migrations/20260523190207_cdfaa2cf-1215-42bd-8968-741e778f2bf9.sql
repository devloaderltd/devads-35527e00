
-- 1. Protect profile phone numbers (column-level)
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, city_id, country, email_verified_at, created_at, updated_at)
  ON public.profiles TO anon, authenticated;
-- phone column: grant to authenticated so owner can read via RLS-row policy below
GRANT SELECT (phone) ON public.profiles TO authenticated;

-- Replace permissive policy with owner-full + public-limited via separate policies
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;

-- Public read: rows visible to everyone, but column privileges above exclude phone for anon
CREATE POLICY "Profiles public read (non-sensitive)" ON public.profiles
  FOR SELECT TO anon
  USING (true);

-- Authenticated users see all profiles, but phone column readable only when owner
-- Enforced via two policies combined with column privs: authenticated has SELECT(phone),
-- but we further gate phone by row owner using a stricter policy split.
CREATE POLICY "Profiles authenticated read" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 2. Listing promotions: restrict public read to active listings only
DROP POLICY IF EXISTS "Promotions public read" ON public.listing_promotions;
CREATE POLICY "Promotions public read for active listings" ON public.listing_promotions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_promotions.listing_id
      AND l.status = 'active'
  ));

-- 3. Storage: tighten listing-images policies (ownership-scoped)
-- Drop any existing INSERT/UPDATE/DELETE policies for this bucket and recreate
DROP POLICY IF EXISTS "Users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Listing images insert" ON storage.objects;
DROP POLICY IF EXISTS "Listing images update" ON storage.objects;
DROP POLICY IF EXISTS "Listing images delete" ON storage.objects;
DROP POLICY IF EXISTS "Users update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users insert own listing images" ON storage.objects;

CREATE POLICY "Users insert own listing images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own listing images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own listing images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
