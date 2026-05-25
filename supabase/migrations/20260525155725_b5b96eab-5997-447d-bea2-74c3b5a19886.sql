CREATE INDEX IF NOT EXISTS idx_listing_events_listing_created ON public.listing_events (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listing_events_type_created ON public.listing_events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON public.payments (status, created_at DESC);