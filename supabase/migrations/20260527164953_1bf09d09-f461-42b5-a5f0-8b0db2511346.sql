
-- 1. Bump audit log table
CREATE TABLE public.bump_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  listing_id uuid,
  wallet_transaction_id uuid,
  payment_id uuid,
  outcome text NOT NULL CHECK (outcome IN ('paid','unauthorized','insufficient_funds','reconciled','error')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bump_audit_outcome ON public.bump_audit_log(outcome, created_at DESC);
CREATE INDEX idx_bump_audit_listing ON public.bump_audit_log(listing_id);
CREATE INDEX idx_bump_audit_user ON public.bump_audit_log(user_id);

GRANT SELECT ON public.bump_audit_log TO authenticated;
GRANT ALL ON public.bump_audit_log TO service_role;

ALTER TABLE public.bump_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view bump audit"
  ON public.bump_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners view own bump audit"
  ON public.bump_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Guard trigger: only allow bumped_at changes when session flag is set
CREATE OR REPLACE FUNCTION public.guard_listing_bump()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text;
BEGIN
  IF NEW.bumped_at IS DISTINCT FROM OLD.bumped_at THEN
    allowed := current_setting('app.allow_bump', true);
    IF allowed IS DISTINCT FROM 'true' THEN
      INSERT INTO public.bump_audit_log(user_id, listing_id, outcome, details)
      VALUES (
        auth.uid(),
        NEW.id,
        'unauthorized',
        jsonb_build_object(
          'old_bumped_at', OLD.bumped_at,
          'new_bumped_at', NEW.bumped_at,
          'attempted_by_role', current_user
        )
      );
      RAISE EXCEPTION 'bumped_at can only be set via paid bump flow';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_listing_bump ON public.listings;
CREATE TRIGGER trg_guard_listing_bump
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_listing_bump();

-- 3. apply_paid_bump: atomic debit + payment + bump
CREATE OR REPLACE FUNCTION public.apply_paid_bump(
  _user_id uuid,
  _listing_id uuid,
  _amount numeric,
  _description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_balance numeric;
  v_tx_id uuid;
  v_payment_id uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.listings WHERE id = _listing_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'listing not found';
  END IF;
  IF v_owner <> _user_id THEN
    RAISE EXCEPTION 'not your listing';
  END IF;

  -- Debit wallet (raises 'insufficient funds' if balance too low)
  BEGIN
    v_balance := public.debit_wallet(_user_id, _amount, _listing_id::text, _description);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.bump_audit_log(user_id, listing_id, outcome, details)
    VALUES (_user_id, _listing_id, 'insufficient_funds', jsonb_build_object('error', SQLERRM, 'amount', _amount));
    RAISE;
  END;

  -- Fetch the just-inserted wallet transaction id (most recent spend for this reference)
  SELECT id INTO v_tx_id
  FROM public.wallet_transactions
  WHERE user_id = _user_id AND reference = _listing_id::text AND type = 'spend'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Record payment
  INSERT INTO public.payments(user_id, listing_id, promotion_type, provider, amount, currency, status)
  VALUES (_user_id, _listing_id, 'bump', 'wallet', _amount, 'USD', 'completed')
  RETURNING id INTO v_payment_id;

  -- Allow the guarded update for this transaction only
  PERFORM set_config('app.allow_bump', 'true', true);
  UPDATE public.listings SET bumped_at = now() WHERE id = _listing_id;

  INSERT INTO public.bump_audit_log(user_id, listing_id, wallet_transaction_id, payment_id, outcome, details)
  VALUES (_user_id, _listing_id, v_tx_id, v_payment_id, 'paid', jsonb_build_object('amount', _amount));

  RETURN jsonb_build_object('ok', true, 'payment_id', v_payment_id, 'wallet_transaction_id', v_tx_id, 'balance', v_balance);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_paid_bump(uuid, uuid, numeric, text) TO service_role;

-- 4. Reconciliation function: clears orphan bumped_at and logs
CREATE OR REPLACE FUNCTION public.reconcile_bumps()
RETURNS TABLE(listing_id uuid, cleared boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT l.id, l.user_id, l.bumped_at
    FROM public.listings l
    WHERE l.bumped_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.listing_id = l.id
          AND p.promotion_type = 'bump'
          AND p.status = 'completed'
          AND p.created_at <= l.bumped_at + interval '2 minutes'
          AND p.created_at >= l.bumped_at - interval '2 minutes'
      )
  LOOP
    PERFORM set_config('app.allow_bump', 'true', true);
    UPDATE public.listings SET bumped_at = NULL WHERE id = r.id;

    INSERT INTO public.bump_audit_log(user_id, listing_id, outcome, details)
    VALUES (r.user_id, r.id, 'reconciled',
      jsonb_build_object('cleared_bumped_at', r.bumped_at, 'reason', 'no matching paid bump payment'));

    INSERT INTO public.notifications(user_id, type, title, body, link, metadata)
    VALUES (r.user_id, 'bump_reconciled', 'Bump removed',
      'A bump on one of your listings was removed because no matching payment was found.',
      '/my-listings', jsonb_build_object('listing_id', r.id));

    listing_id := r.id;
    cleared := true;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_bumps() TO service_role;
