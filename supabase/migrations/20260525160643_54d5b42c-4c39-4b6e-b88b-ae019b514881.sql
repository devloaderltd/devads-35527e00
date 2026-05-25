DROP POLICY IF EXISTS "Public can log basic listing events" ON public.listing_events;

CREATE POLICY "Public can log basic listing events"
ON public.listing_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  type::text IN ('view', 'favorite', 'message', 'contact_reveal')
  AND (user_id IS NULL OR user_id = auth.uid())
);
