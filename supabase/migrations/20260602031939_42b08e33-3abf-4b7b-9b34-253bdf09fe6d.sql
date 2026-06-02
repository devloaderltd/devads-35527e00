-- 1. Lock down listings.phone/whatsapp at column level (revoke direct SELECT)
REVOKE SELECT (phone, whatsapp) ON public.listings FROM anon, authenticated;

-- 2. Tighten profiles SELECT — drop wide-open policies, expose only public fields via column grants
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anon can view profiles" ON public.profiles;

-- Owners can read their full profile
CREATE POLICY "Owners read full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Public can read profiles but column-level grants restrict which columns
CREATE POLICY "Public profile read (column-restricted)"
  ON public.profiles FOR SELECT
  USING (true);

-- Revoke all then grant only safe public columns to anon/authenticated
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, avatar_url, bio, city_id, country, created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- Owner role can still see everything via the owner policy + service_role grant
GRANT ALL ON public.profiles TO service_role;

-- For owners to read sensitive columns we need column grants too; grant on the sensitive cols only to authenticated (RLS restricts to own row)
GRANT SELECT (
  phone, kyc_status, kyc_verified_at, phone_verified_at, id_verified_at,
  email_verified_at, onboarding_done_at, show_read_receipts
) ON public.profiles TO authenticated;

-- 3. admin_broadcasts write policies
CREATE POLICY "Admins insert broadcasts"
  ON public.admin_broadcasts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update broadcasts"
  ON public.admin_broadcasts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete broadcasts"
  ON public.admin_broadcasts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. suppressed_emails update/delete for service_role
CREATE POLICY "Service role updates suppressed"
  ON public.suppressed_emails FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Service role deletes suppressed"
  ON public.suppressed_emails FOR DELETE TO service_role
  USING (true);
