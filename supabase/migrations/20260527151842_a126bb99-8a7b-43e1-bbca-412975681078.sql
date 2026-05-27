CREATE TABLE public.homepage_config (
  id text PRIMARY KEY DEFAULT 'global',
  hero jsonb NOT NULL DEFAULT '{}'::jsonb,
  bento_featured jsonb NOT NULL DEFAULT '{}'::jsonb,
  bento_tile_2 jsonb NOT NULL DEFAULT '{}'::jsonb,
  bento_tile_3 jsonb NOT NULL DEFAULT '{}'::jsonb,
  bento_tile_4 jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homepage_config_singleton CHECK (id = 'global')
);

GRANT SELECT ON public.homepage_config TO anon, authenticated;
GRANT ALL ON public.homepage_config TO service_role;
GRANT UPDATE, INSERT ON public.homepage_config TO authenticated;

ALTER TABLE public.homepage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Homepage config public read" ON public.homepage_config
  FOR SELECT USING (true);

CREATE POLICY "Admins manage homepage config" ON public.homepage_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER homepage_config_set_updated_at
  BEFORE UPDATE ON public.homepage_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.homepage_config (id, hero, bento_featured, bento_tile_2, bento_tile_3, bento_tile_4, sections) VALUES (
  'global',
  '{"badge":"Free to post · Free to browse","title":"Buy & sell locally — {accent}across the country.{/accent}","subtitle":"From vintage bikes in Brooklyn to apartments in Manchester — find what''s near you, or post your own in under a minute.","cta1_label":"Post a listing","cta1_url":"/post","cta2_label":"Browse all","cta2_url":"/search"}'::jsonb,
  '{"pinned_listing_id":null,"badge_label":"Featured","enabled":true}'::jsonb,
  '{"title":"Electronics","subtitle":"Latest gadgets, phones & tech gear","image_url":"","link_url":"/search?category=electronics","gradient":"primary","enabled":true}'::jsonb,
  '{"title":"Furniture","subtitle":"Browse home goods","image_url":"","link_url":"/search?category=furniture","gradient":"lavender","enabled":true}'::jsonb,
  '{"title":"Pets","subtitle":"Find a new friend","image_url":"","link_url":"/search?category=pets","gradient":"amber","enabled":true}'::jsonb,
  '{"trust_stats":true,"chip_strip":true,"recently_viewed":true,"trending_rail":true,"featured_row":true,"bumped_rail":true,"latest":true,"city_banner":true}'::jsonb
);