
-- 1. Fix listing_promotions privilege escalation: restrict user policy to SELECT only
DROP POLICY IF EXISTS "Users view own promotions" ON public.listing_promotions;
CREATE POLICY "Users view own promotions"
ON public.listing_promotions
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_promotions.listing_id AND l.user_id = auth.uid()));

-- 2. Hide sensitive profile columns from anonymous visitors (phone, email_verified_at)
REVOKE SELECT (phone, email_verified_at) ON public.profiles FROM anon;

-- 3. Revoke EXECUTE on server-only SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
