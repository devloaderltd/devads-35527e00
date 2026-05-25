
-- Wallets table
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance_usd >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.wallets FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER wallets_set_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transaction type enum
CREATE TYPE public.wallet_tx_type AS ENUM ('topup','spend','refund','adjustment');

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.wallet_tx_type NOT NULL,
  amount_usd numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  reference text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallet tx" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallet tx" ON public.wallet_transactions FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));

-- Crypto top-up status enum
CREATE TYPE public.crypto_topup_status AS ENUM ('waiting','confirming','confirmed','sending','partially_paid','finished','failed','expired','refunded');

CREATE TABLE public.crypto_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  np_invoice_id text,
  np_payment_id text,
  pay_currency text,
  pay_amount numeric(24,8),
  price_amount_usd numeric(12,2) NOT NULL,
  status public.crypto_topup_status NOT NULL DEFAULT 'waiting',
  credited boolean NOT NULL DEFAULT false,
  invoice_url text,
  raw_last_ipn jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crypto_topups_user ON public.crypto_topups(user_id, created_at DESC);
CREATE INDEX idx_crypto_topups_invoice ON public.crypto_topups(np_invoice_id);
ALTER TABLE public.crypto_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own topups" ON public.crypto_topups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all topups" ON public.crypto_topups FOR SELECT USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER crypto_topups_set_updated_at BEFORE UPDATE ON public.crypto_topups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Credit wallet
CREATE OR REPLACE FUNCTION public.credit_wallet(_user_id uuid, _amount numeric, _reference text, _description text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric(12,2);
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  INSERT INTO public.wallets(user_id, balance_usd) VALUES (_user_id, _amount)
    ON CONFLICT (user_id) DO UPDATE SET balance_usd = wallets.balance_usd + EXCLUDED.balance_usd, updated_at = now()
    RETURNING balance_usd INTO new_balance;
  INSERT INTO public.wallet_transactions(user_id, type, amount_usd, balance_after, reference, description)
    VALUES (_user_id, 'topup', _amount, new_balance, _reference, _description);
  RETURN new_balance;
END;
$$;

-- Debit wallet
CREATE OR REPLACE FUNCTION public.debit_wallet(_user_id uuid, _amount numeric, _reference text, _description text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance numeric(12,2);
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  UPDATE public.wallets SET balance_usd = balance_usd - _amount, updated_at = now()
    WHERE user_id = _user_id AND balance_usd >= _amount
    RETURNING balance_usd INTO new_balance;
  IF new_balance IS NULL THEN RAISE EXCEPTION 'insufficient funds'; END IF;
  INSERT INTO public.wallet_transactions(user_id, type, amount_usd, balance_after, reference, description)
    VALUES (_user_id, 'spend', -_amount, new_balance, _reference, _description);
  RETURN new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.debit_wallet(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;

-- Auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
