
-- 1. Listings: pricing + verification
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS price numeric(12,2),
  ADD COLUMN IF NOT EXISTS is_negotiable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- 2. Profiles: verification flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_verified_at timestamptz;

-- 3. Listing price history
CREATE TABLE IF NOT EXISTS public.listing_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  price numeric(12,2) NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lph_listing ON public.listing_price_history(listing_id, changed_at DESC);

ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Price history public read" ON public.listing_price_history;
CREATE POLICY "Price history public read" ON public.listing_price_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_price_history.listing_id AND l.status = 'active')
    OR EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_price_history.listing_id AND l.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.track_listing_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price AND NEW.price IS NOT NULL THEN
    INSERT INTO public.listing_price_history(listing_id, price) VALUES (NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_listing_price_change ON public.listings;
CREATE TRIGGER trg_listing_price_change
AFTER UPDATE OF price ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.track_listing_price_change();

-- Seed initial price row when listing has a price set
CREATE OR REPLACE FUNCTION public.seed_listing_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.price IS NOT NULL THEN
    INSERT INTO public.listing_price_history(listing_id, price) VALUES (NEW.id, NEW.price);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_listing_price_seed ON public.listings;
CREATE TRIGGER trg_listing_price_seed
AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.seed_listing_price();

-- 4. Seller follows
CREATE TABLE IF NOT EXISTS public.seller_follows (
  follower_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, seller_id)
);
CREATE INDEX IF NOT EXISTS idx_sf_seller ON public.seller_follows(seller_id);

ALTER TABLE public.seller_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own follows" ON public.seller_follows;
CREATE POLICY "Users manage own follows" ON public.seller_follows
  FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Sellers view own followers" ON public.seller_follows;
CREATE POLICY "Sellers view own followers" ON public.seller_follows
  FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Follows public read" ON public.seller_follows;
CREATE POLICY "Follows public read" ON public.seller_follows
  FOR SELECT USING (true);

-- 5. User blocks
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own blocks" ON public.user_blocks;
CREATE POLICY "Users manage own blocks" ON public.user_blocks
  FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- 6. Seller review extras
ALTER TABLE public.seller_reviews
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response text,
  ADD COLUMN IF NOT EXISTS response_at timestamptz;

-- 7. Referral system
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Referral codes public read" ON public.referral_codes;
CREATE POLICY "Referral codes public read" ON public.referral_codes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create own referral code" ON public.referral_codes;
CREATE POLICY "Users create own referral code" ON public.referral_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_id),
  CHECK (status IN ('pending','credited','void'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own referrals" ON public.referrals;
CREATE POLICY "Users view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- 8. Auto-renew preferences on listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

-- 9. Scheduled bumps
CREATE TABLE IF NOT EXISTS public.scheduled_bumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  scheduled_for timestamptz NOT NULL,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sb_due ON public.scheduled_bumps(scheduled_for) WHERE executed_at IS NULL;
ALTER TABLE public.scheduled_bumps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own scheduled bumps" ON public.scheduled_bumps;
CREATE POLICY "Users manage own scheduled bumps" ON public.scheduled_bumps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. Recently viewed (server-backed)
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_rv_user ON public.recently_viewed(user_id, viewed_at DESC);
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recently viewed" ON public.recently_viewed;
CREATE POLICY "Users manage own recently viewed" ON public.recently_viewed
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
