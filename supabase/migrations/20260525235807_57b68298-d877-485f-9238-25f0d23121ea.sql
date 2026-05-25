ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.generate_listing_slug(_title text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  suffix text;
  candidate text;
  attempt int := 0;
BEGIN
  base := lower(coalesce(_title, ''));
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  base := substring(base from 1 for 60);
  base := regexp_replace(base, '-+$', '', 'g');
  IF base = '' OR base IS NULL THEN base := 'listing'; END IF;

  LOOP
    suffix := substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    candidate := base || '-' || suffix;
    IF NOT EXISTS (SELECT 1 FROM public.listings WHERE slug = candidate) THEN
      RETURN candidate;
    END IF;
    attempt := attempt + 1;
    IF attempt > 8 THEN
      RETURN candidate || '-' || floor(random() * 100000)::text;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_listing_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.generate_listing_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_set_slug ON public.listings;
CREATE TRIGGER trg_listings_set_slug
BEFORE INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.set_listing_slug();

UPDATE public.listings SET slug = public.generate_listing_slug(title) WHERE slug IS NULL OR slug = '';

ALTER TABLE public.listings ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_unique ON public.listings(slug);