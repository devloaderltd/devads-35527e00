
CREATE OR REPLACE FUNCTION public.admin_list_public_tables()
RETURNS text[] LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT array_agg(tablename ORDER BY tablename)
  FROM pg_tables WHERE schemaname='public';
$$;

CREATE OR REPLACE FUNCTION public.admin_truncate_all_public()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; stmt text := '';
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    stmt := stmt || format('TRUNCATE TABLE public.%I CASCADE;', r.tablename);
  END LOOP;
  IF stmt <> '' THEN EXECUTE stmt; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_replica_mode(_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF _on THEN
    EXECUTE 'SET session_replication_role = ''replica''';
  ELSE
    EXECUTE 'SET session_replication_role = ''origin''';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_public_tables() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_truncate_all_public() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_replica_mode(boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_public_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_truncate_all_public() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_replica_mode(boolean) TO service_role;
