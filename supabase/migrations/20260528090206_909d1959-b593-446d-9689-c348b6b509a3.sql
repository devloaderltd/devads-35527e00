-- Lock down sensitive contact columns at the column-grant level.
REVOKE SELECT (phone, whatsapp) ON public.listings FROM anon, authenticated;
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

-- Owner-only helper to read your own listing contact (for the edit form / duplicate flow).
CREATE OR REPLACE FUNCTION public.get_my_listing_contact(_listing_id uuid)
RETURNS TABLE(phone text, whatsapp text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.phone, l.whatsapp
  FROM public.listings l
  WHERE l.id = _listing_id
    AND l.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_listing_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_listing_contact(uuid) TO authenticated;