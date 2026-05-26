
-- 1. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;

-- 2. KYC submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('passport','id_card','drivers_license')),
  doc_front_url text NOT NULL,
  doc_back_url text,
  selfie_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_id uuid,
  review_note text,
  bonus_credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_kyc_user ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_submissions(status);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kyc"
  ON public.kyc_submissions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own kyc"
  ON public.kyc_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update kyc"
  ON public.kyc_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete kyc"
  ON public.kyc_submissions FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER kyc_set_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('kyc-documents','kyc-documents', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own kyc files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own kyc files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'))
  );

CREATE POLICY "Users update own kyc files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins delete kyc files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kyc-documents'
    AND public.has_role(auth.uid(),'admin')
  );

-- 4. Approve / reject functions
CREATE OR REPLACE FUNCTION public.approve_kyc(_submission_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_already_credited boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id, bonus_credited INTO v_user_id, v_already_credited
  FROM public.kyc_submissions WHERE id = _submission_id;

  IF v_user_id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.kyc_submissions
    SET status = 'approved',
        reviewer_id = auth.uid(),
        review_note = _note,
        reviewed_at = now()
    WHERE id = _submission_id;

  UPDATE public.profiles
    SET kyc_status = 'approved',
        kyc_verified_at = now(),
        id_verified_at = COALESCE(id_verified_at, now())
    WHERE id = v_user_id;

  -- One-time $5 bonus
  IF NOT v_already_credited THEN
    PERFORM public.credit_wallet(v_user_id, 5.00, 'kyc_bonus', 'KYC verification bonus');
    UPDATE public.kyc_submissions SET bonus_credited = true WHERE id = _submission_id;
  END IF;

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (v_user_id, 'kyc_approved', 'Verification approved 🎉',
            'You received a $5 bonus for verifying your identity.', '/wallet');

  PERFORM public.log_admin_action(auth.uid(), 'kyc.approve', 'kyc', _submission_id::text, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_kyc(_submission_id uuid, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO v_user_id FROM public.kyc_submissions WHERE id = _submission_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'submission not found'; END IF;

  UPDATE public.kyc_submissions
    SET status = 'rejected',
        reviewer_id = auth.uid(),
        review_note = _note,
        reviewed_at = now()
    WHERE id = _submission_id;

  UPDATE public.profiles SET kyc_status = 'rejected' WHERE id = v_user_id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (v_user_id, 'kyc_rejected', 'Verification needs attention',
            COALESCE(_note, 'Please review your submission and try again.'), '/verify');

  PERFORM public.log_admin_action(auth.uid(), 'kyc.reject', 'kyc', _submission_id::text,
                                  jsonb_build_object('note', _note));
END;
$$;
