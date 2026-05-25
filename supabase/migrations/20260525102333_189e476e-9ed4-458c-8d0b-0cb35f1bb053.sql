
-- 1. Extend wallet transaction enum
ALTER TYPE wallet_tx_type ADD VALUE IF NOT EXISTS 'adjustment';

-- 2. site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY DEFAULT 'global',
  featured_price_usd numeric(10,2) NOT NULL DEFAULT 9.99,
  bump_price_usd numeric(10,2) NOT NULL DEFAULT 2.99,
  featured_days integer NOT NULL DEFAULT 7,
  bump_days integer NOT NULL DEFAULT 1,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text NOT NULL DEFAULT 'We are performing maintenance. Please check back soon.',
  site_name text NOT NULL DEFAULT 'Marketly',
  support_email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_single CHECK (id = 'global')
);

INSERT INTO public.site_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage site settings" ON public.site_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER site_settings_updated_at BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log" ON public.audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. log_admin_action helper
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _actor uuid,
  _action text,
  _target_type text,
  _target_id text,
  _metadata jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (_actor, _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action(uuid, text, text, text, jsonb) FROM public, anon, authenticated;

-- 5. admin_adjust_wallet RPC (signed amount; positive = credit, negative = debit)
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  _user_id uuid,
  _amount numeric,
  _description text
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric(12,2);
BEGIN
  IF _amount = 0 THEN RAISE EXCEPTION 'amount must be non-zero'; END IF;

  INSERT INTO public.wallets(user_id, balance_usd) VALUES (_user_id, GREATEST(_amount, 0))
  ON CONFLICT (user_id) DO UPDATE
    SET balance_usd = wallets.balance_usd + _amount, updated_at = now()
  RETURNING balance_usd INTO new_balance;

  IF new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient funds';
  END IF;

  INSERT INTO public.wallet_transactions(user_id, type, amount_usd, balance_after, reference, description)
  VALUES (_user_id, 'adjustment', _amount, new_balance, 'admin', _description);

  RETURN new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM public, anon, authenticated;
