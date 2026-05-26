
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS favicon_url text NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Branding public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins upload branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete branding"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));
