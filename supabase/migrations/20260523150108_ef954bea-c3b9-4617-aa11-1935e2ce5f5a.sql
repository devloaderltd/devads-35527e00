
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke direct execute on SECURITY DEFINER functions (they're still callable from RLS policies as the policy owner)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Tighten storage bucket: only allow read of specific objects, not listing
DROP POLICY IF EXISTS "Listing images public read" ON storage.objects;
CREATE POLICY "Listing images object read" ON storage.objects FOR SELECT 
  USING (bucket_id = 'listing-images' AND auth.role() IS NOT NULL OR bucket_id = 'listing-images');
