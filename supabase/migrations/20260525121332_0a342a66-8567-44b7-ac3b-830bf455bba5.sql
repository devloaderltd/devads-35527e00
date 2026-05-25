
-- listing_events
CREATE TYPE public.listing_event_type AS ENUM ('view','favorite','message','contact_reveal');

CREATE TABLE public.listing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  user_id uuid,
  type public.listing_event_type NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_listing_events_listing_created ON public.listing_events(listing_id, created_at DESC);
CREATE INDEX idx_listing_events_created ON public.listing_events(created_at DESC);
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert listing events"
  ON public.listing_events FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Listing owners view own events"
  ON public.listing_events FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_events.listing_id AND l.user_id = auth.uid()));

CREATE POLICY "Admins view all events"
  ON public.listing_events FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'admin'));

-- saved_searches
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  query text NOT NULL DEFAULT '',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved searches"
  ON public.saved_searches FOR ALL TO public
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT TO public
  USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO public
  USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE TO public
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all notifications"
  ON public.notifications FOR SELECT TO public
  USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- seller_reviews
CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  listing_id uuid,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seller_id, reviewer_id, listing_id)
);
CREATE INDEX idx_reviews_seller ON public.seller_reviews(seller_id);
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public read"
  ON public.seller_reviews FOR SELECT TO public USING (true);
CREATE POLICY "Reviewers create own reviews"
  ON public.seller_reviews FOR INSERT TO public
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id <> seller_id);
CREATE POLICY "Reviewers update own reviews"
  ON public.seller_reviews FOR UPDATE TO public
  USING (auth.uid() = reviewer_id);
CREATE POLICY "Reviewers delete own reviews"
  ON public.seller_reviews FOR DELETE TO public
  USING (auth.uid() = reviewer_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.seller_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- homepage_slots
CREATE TABLE public.homepage_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL CHECK (position IN ('hero','featured','banner')),
  listing_id uuid,
  image_url text,
  title text,
  subtitle text,
  cta_label text,
  cta_url text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.homepage_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Homepage slots public read"
  ON public.homepage_slots FOR SELECT TO public USING (active = true);
CREATE POLICY "Admins manage homepage slots"
  ON public.homepage_slots FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_homepage_slots_updated_at
  BEFORE UPDATE ON public.homepage_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- site_banners
CREATE TABLE public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  cta_label text,
  cta_url text,
  variant text NOT NULL DEFAULT 'info' CHECK (variant IN ('info','success','warning','promo')),
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Banners public read"
  ON public.site_banners FOR SELECT TO public
  USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "Admins manage banners"
  ON public.site_banners FOR ALL TO public
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON public.site_banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
