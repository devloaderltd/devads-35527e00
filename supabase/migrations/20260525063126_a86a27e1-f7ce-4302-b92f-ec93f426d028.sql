-- has_role is used inside RLS policies; RLS evaluation does NOT require the caller to hold EXECUTE.
-- Revoke from API roles so it can't be invoked via PostgREST.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;