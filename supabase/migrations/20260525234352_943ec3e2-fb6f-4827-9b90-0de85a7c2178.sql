CREATE POLICY "Sellers respond to received reviews"
ON public.seller_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);