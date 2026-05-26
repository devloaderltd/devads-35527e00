
REVOKE EXECUTE ON FUNCTION public.approve_kyc(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_kyc(uuid, text) FROM PUBLIC, anon, authenticated;
