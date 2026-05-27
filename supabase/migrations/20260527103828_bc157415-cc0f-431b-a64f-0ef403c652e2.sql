CREATE TABLE public.smtp_settings (
  id text PRIMARY KEY DEFAULT 'global',
  enabled boolean NOT NULL DEFAULT false,
  provider_label text NOT NULL DEFAULT '',
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  auth_user text NOT NULL DEFAULT '',
  auth_pass text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT '',
  reply_to text,
  last_test_at timestamptz,
  last_test_status text,
  last_test_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT smtp_settings_single_row CHECK (id = 'global')
);

INSERT INTO public.smtp_settings(id) VALUES ('global') ON CONFLICT DO NOTHING;

GRANT SELECT, UPDATE ON public.smtp_settings TO authenticated;
GRANT ALL ON public.smtp_settings TO service_role;

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read smtp settings" ON public.smtp_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update smtp settings" ON public.smtp_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER smtp_settings_set_updated_at
  BEFORE UPDATE ON public.smtp_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();