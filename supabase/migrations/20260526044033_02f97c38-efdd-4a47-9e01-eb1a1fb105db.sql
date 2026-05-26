-- Allow reports to target either a listing or a review
ALTER TABLE public.reports ALTER COLUMN listing_id DROP NOT NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES public.seller_reviews(id) ON DELETE CASCADE;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_target_check
  CHECK ((listing_id IS NOT NULL) OR (review_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_reports_review_id ON public.reports(review_id);

-- Public bucket for review photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for review-photos
DROP POLICY IF EXISTS "Review photos public read" ON storage.objects;
CREATE POLICY "Review photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

DROP POLICY IF EXISTS "Users upload own review photos" ON storage.objects;
CREATE POLICY "Users upload own review photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own review photos" ON storage.objects;
CREATE POLICY "Users delete own review photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  );