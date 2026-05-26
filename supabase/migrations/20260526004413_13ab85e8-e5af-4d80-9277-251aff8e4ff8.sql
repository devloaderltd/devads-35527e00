-- 1. Profiles: hide phone from anon and other authenticated users
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

-- 2. Listings: prevent owners from reassigning user_id
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
    (auth.uid() = user_id AND user_id = (SELECT user_id FROM public.listings WHERE id = listings.id))
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 3. client_error_logs: enforce user_id matches auth.uid() (or is null for anon)
DROP POLICY IF EXISTS "Anyone can report errors" ON public.client_error_logs;
CREATE POLICY "Anyone can report errors"
ON public.client_error_logs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (length(message) >= 1 AND length(message) <= 2000)
  AND (stack IS NULL OR length(stack) <= 8000)
  AND (route IS NULL OR length(route) <= 500)
  AND (user_agent IS NULL OR length(user_agent) <= 500)
  AND (severity = ANY (ARRAY['info'::text,'warn'::text,'error'::text,'fatal'::text]))
  AND (
    user_id IS NULL
    OR user_id = auth.uid()
  )
);

-- 4. Move pg_net out of public schema (drop + recreate in extensions schema)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;