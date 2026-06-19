
-- Defense-in-depth: explicit SELECT policies for the two public buckets.
DROP POLICY IF EXISTS "Public read listing-images" ON storage.objects;
CREATE POLICY "Public read listing-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-images');

DROP POLICY IF EXISTS "Public read review-photos" ON storage.objects;
CREATE POLICY "Public read review-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

-- Remove redundant authenticated-full-read on profiles; the column-restricted
-- public policy still permits the cross-user reads the app relies on, and
-- column-level grants continue to keep phone out of the Data API.
DROP POLICY IF EXISTS "Profiles authenticated read" ON public.profiles;
