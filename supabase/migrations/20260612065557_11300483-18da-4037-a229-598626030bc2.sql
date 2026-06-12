CREATE OR REPLACE FUNCTION public.admin_get_user_sessions(_user_ids uuid[])
RETURNS TABLE(user_id uuid, last_ip text, last_user_agent text, last_event_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      (a.payload->'actor_id')::text::uuid AS uid,
      host(a.ip_address) AS ip,
      a.payload->'traits'->>'user_agent' AS ua_traits,
      a.created_at,
      row_number() OVER (PARTITION BY (a.payload->'actor_id')::text::uuid ORDER BY a.created_at DESC) AS rn
    FROM auth.audit_log_entries a
    WHERE (a.payload->'actor_id')::text::uuid = ANY(_user_ids)
      AND a.payload->>'action' IN ('login','signup','token_refreshed','user_modified','user_signedup')
  )
  SELECT r.uid, r.ip, r.ua_traits, r.created_at
  FROM ranked r
  WHERE r.rn = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_sessions(uuid[]) TO authenticated;