-- 1. Fix BROKEN_OWNERSHIP_CHECK on listings UPDATE
DROP POLICY IF EXISTS "Users update own listings" ON public.listings;
CREATE POLICY "Users update own listings"
ON public.listings
FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (
    auth.uid() = user_id
    AND user_id = (SELECT l.user_id FROM public.listings l WHERE l.id = listings.id)
  )
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Explicitly REVOKE phone column on profiles for anon + authenticated
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

-- 3. Remove broad SELECT policies on public storage buckets (listing enumeration).
--    Public buckets remain readable via their direct public URL.
DROP POLICY IF EXISTS "Listing images object read" ON storage.objects;
DROP POLICY IF EXISTS "Review photos public read" ON storage.objects;

-- 4. Lock search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;