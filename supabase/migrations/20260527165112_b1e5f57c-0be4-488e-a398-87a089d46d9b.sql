
REVOKE EXECUTE ON FUNCTION public.apply_paid_bump(uuid, uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_bumps() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_paid_bump(uuid, uuid, numeric, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_bumps() TO service_role;
