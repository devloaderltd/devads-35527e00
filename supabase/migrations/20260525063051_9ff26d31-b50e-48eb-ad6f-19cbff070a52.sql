-- 1. Remove duplicate broad INSERT policy on listing-images bucket
DROP POLICY IF EXISTS "Authenticated users upload listing images" ON storage.objects;

-- 2. listing_promotions: lock down writes (only admins can write; server should use service_role)
CREATE POLICY "Admins manage promotions"
ON public.listing_promotions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update promotions"
ON public.listing_promotions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete promotions"
ON public.listing_promotions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. payments: prevent client-side writes entirely; only admins can mutate.
-- Payment rows must be created by trusted server code (service_role bypasses RLS).
CREATE POLICY "Admins insert payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete payments"
ON public.payments
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Lock down SECURITY DEFINER functions exposed via PostgREST.
-- handle_new_user and set_updated_at are trigger-only functions: nobody should call them directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role is used by RLS policies (executes as caller via SECURITY DEFINER); keep callable.
-- increment_listing_view is called from the client; keep callable by authenticated + anon (read-only counter).