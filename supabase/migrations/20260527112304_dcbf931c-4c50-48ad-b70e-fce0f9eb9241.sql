
CREATE OR REPLACE FUNCTION public.approve_kyc(_submission_id uuid, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_already_credited boolean;
  v_actor uuid;
BEGIN
  -- Allow callers without an auth.uid() (e.g. server-side admin functions
  -- using the service role) — they have already enforced admin auth.
  -- For end-user callers, still require the admin role.
  v_actor := auth.uid();
  IF v_actor IS NOT NULL AND NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id, bonus_credited INTO v_user_id, v_already_credited
  FROM public.kyc_submissions WHERE id = _submission_id;

  IF v_user_id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.kyc_submissions
    SET status = 'approved',
        reviewer_id = v_actor,
        review_note = _note,
        reviewed_at = now()
    WHERE id = _submission_id;

  UPDATE public.profiles
    SET kyc_status = 'approved',
        kyc_verified_at = now(),
        id_verified_at = COALESCE(id_verified_at, now())
    WHERE id = v_user_id;

  IF NOT v_already_credited THEN
    PERFORM public.credit_wallet(v_user_id, 5.00, 'kyc_bonus', 'KYC verification bonus');
    UPDATE public.kyc_submissions SET bonus_credited = true WHERE id = _submission_id;
  END IF;

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (v_user_id, 'kyc_approved', 'Verification approved 🎉',
            'You received a $5 bonus for verifying your identity.', '/wallet');

  PERFORM public.log_admin_action(v_actor, 'kyc.approve', 'kyc', _submission_id::text, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_kyc(_submission_id uuid, _note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NOT NULL AND NOT public.has_role(v_actor, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO v_user_id FROM public.kyc_submissions WHERE id = _submission_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.kyc_submissions
    SET status = 'rejected',
        reviewer_id = v_actor,
        review_note = _note,
        reviewed_at = now()
    WHERE id = _submission_id;

  UPDATE public.profiles SET kyc_status = 'rejected' WHERE id = v_user_id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (v_user_id, 'kyc_rejected', 'Verification needs attention',
            COALESCE(_note, 'Please review your submission and try again.'), '/verify');

  PERFORM public.log_admin_action(v_actor, 'kyc.reject', 'kyc', _submission_id::text,
                                  jsonb_build_object('note', _note));
END;
$function$;
