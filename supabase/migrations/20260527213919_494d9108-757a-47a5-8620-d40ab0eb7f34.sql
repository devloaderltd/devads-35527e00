
-- 1) Restrict seller phone & whatsapp on listings to service_role only.
--    Anonymous / authenticated users must use the reveal_listing_contact RPC.
REVOKE SELECT (phone, whatsapp) ON public.listings FROM anon, authenticated, PUBLIC;

-- 2) Restrict SMTP credentials so even admin sessions cannot read the plaintext
--    password through the Data API. Server-side code uses the service_role
--    client (supabaseAdmin) which bypasses column grants.
REVOKE SELECT (auth_pass, auth_user, host, port, secure, from_email, from_name, reply_to)
  ON public.smtp_settings FROM anon, authenticated, PUBLIC;

-- 3) Remove the blanket public-read policy on seller_follows so the
--    follower graph is no longer exposed to anonymous visitors.
--    Aggregated follower counts are already returned via a server function
--    (getSellerFollowState) that uses the service-role client.
DROP POLICY IF EXISTS "Follows public read" ON public.seller_follows;

CREATE POLICY "Followers view own follows"
  ON public.seller_follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = follower_id);

-- 4) Remove the broad SELECT policy on the public `branding` bucket. Public
--    buckets serve individual files via their public URL without needing a
--    SELECT policy; the policy only enabled directory-style listing of all
--    files, which is what the storage linter flags.
DROP POLICY IF EXISTS "Branding public read" ON storage.objects;
