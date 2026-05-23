ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

CREATE OR REPLACE FUNCTION public.increment_listing_view(_listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings
  SET view_count = view_count + 1
  WHERE id = _listing_id AND status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated;