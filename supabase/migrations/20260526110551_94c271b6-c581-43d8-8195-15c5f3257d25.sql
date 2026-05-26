ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_group_id uuid;
UPDATE public.listings SET listing_group_id = id WHERE listing_group_id IS NULL;
CREATE INDEX IF NOT EXISTS listings_listing_group_id_idx ON public.listings(listing_group_id);