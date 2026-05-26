
-- 1. Listing contact reveal: hide phone/whatsapp from anon, expose via logged RPC
REVOKE SELECT (phone, whatsapp) ON public.listings FROM anon;

CREATE OR REPLACE FUNCTION public.reveal_listing_contact(_listing_id uuid)
RETURNS TABLE (phone text, whatsapp text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_phone text;
  v_whatsapp text;
  v_owner uuid;
  v_status listing_status;
  v_profile_phone text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT l.phone, l.whatsapp, l.user_id, l.status
    INTO v_phone, v_whatsapp, v_owner, v_status
    FROM public.listings l
   WHERE l.id = _listing_id;

  IF v_owner IS NULL OR v_status <> 'active' THEN
    phone := NULL; whatsapp := NULL; RETURN NEXT; RETURN;
  END IF;

  IF v_phone IS NULL THEN
    SELECT p.phone INTO v_profile_phone FROM public.profiles p WHERE p.id = v_owner;
    v_phone := v_profile_phone;
  END IF;

  INSERT INTO public.listing_events(listing_id, user_id, type, metadata)
    VALUES (_listing_id, v_user, 'contact_reveal', '{}'::jsonb);

  phone := v_phone;
  whatsapp := v_whatsapp;
  RETURN NEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reveal_listing_contact(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reveal_listing_contact(uuid) TO authenticated, service_role;

-- 2. Referral codes: drop public read, only owner can read own row
DROP POLICY IF EXISTS "Referral codes public read" ON public.referral_codes;
CREATE POLICY "Users view own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
REVOKE SELECT ON public.referral_codes FROM anon;

-- 3. Realtime channels: per-user topic scoping
DROP POLICY IF EXISTS "Authenticated topic read" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated topic write" ON realtime.messages;

CREATE POLICY "Authenticated topic read"
  ON realtime.messages FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'notifs-%' THEN
        substring(realtime.topic() from 8) = auth.uid()::text
      WHEN realtime.topic() LIKE 'wallet-%' THEN
        substring(realtime.topic() from 8) = auth.uid()::text
      WHEN realtime.topic() LIKE 'messages-overview-%' THEN
        substring(realtime.topic() from 19) = auth.uid()::text
      WHEN realtime.topic() LIKE 'messages-%'
        OR realtime.topic() LIKE 'reads-%'
        OR realtime.topic() LIKE 'presence-%' THEN
        EXISTS (
          SELECT 1 FROM public.message_threads t
          WHERE t.id::text = split_part(realtime.topic(), '-', 2)
            AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        )
      ELSE false
    END
  );

CREATE POLICY "Authenticated topic write"
  ON realtime.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    CASE
      WHEN realtime.topic() LIKE 'presence-%' THEN
        EXISTS (
          SELECT 1 FROM public.message_threads t
          WHERE t.id::text = split_part(realtime.topic(), '-', 2)
            AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        )
      ELSE false
    END
  );

-- 4. Lock down SECURITY DEFINER EXECUTE grants
-- Keep callable from Data API: has_role, get_my_phone, increment_listing_view, reveal_listing_contact
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.credit_wallet(uuid,numeric,text,text)',
    'public.debit_wallet(uuid,numeric,text,text)',
    'public.admin_adjust_wallet(uuid,numeric,text)',
    'public.approve_kyc(uuid,text)',
    'public.reject_kyc(uuid,text)',
    'public.enqueue_email(text,jsonb)',
    'public.read_email_batch(text,integer,integer)',
    'public.delete_email(text,bigint)',
    'public.move_to_dlq(text,text,bigint,jsonb)',
    'public.log_admin_action(uuid,text,text,text,jsonb)',
    'public.handle_new_user()',
    'public.track_listing_price_change()',
    'public.seed_listing_price()',
    'public.set_listing_slug()',
    'public.generate_listing_slug(text)',
    'public.set_updated_at()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;

-- Keep these callable from the Data API
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO anon, authenticated, service_role;
