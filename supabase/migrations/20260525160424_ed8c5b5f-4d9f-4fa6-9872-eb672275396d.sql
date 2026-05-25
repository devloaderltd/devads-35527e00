-- 1) Lock down SECURITY DEFINER helpers: only service_role may execute
REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, text, jsonb) TO service_role;

-- 2) Tighten listing_events insert: restrict allowed event types instead of WITH CHECK (true)
DROP POLICY IF EXISTS "Anyone can insert listing events" ON public.listing_events;

CREATE POLICY "Public can log basic listing events"
ON public.listing_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  type::text IN ('view', 'contact', 'share', 'favorite')
  AND (user_id IS NULL OR user_id = auth.uid())
);
