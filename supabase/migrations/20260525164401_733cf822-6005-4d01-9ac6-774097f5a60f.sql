
-- Client error logs
CREATE TABLE public.client_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  route text,
  message text NOT NULL,
  stack text,
  user_agent text,
  severity text NOT NULL DEFAULT 'error',
  resolved boolean NOT NULL DEFAULT false
);
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_client_error_logs_created ON public.client_error_logs (created_at DESC);
CREATE INDEX idx_client_error_logs_unresolved ON public.client_error_logs (created_at DESC) WHERE resolved = false;

CREATE POLICY "Anyone can report errors"
  ON public.client_error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(message) BETWEEN 1 AND 2000
    AND (stack IS NULL OR length(stack) <= 8000)
    AND (route IS NULL OR length(route) <= 500)
    AND (user_agent IS NULL OR length(user_agent) <= 500)
    AND severity IN ('info','warn','error','fatal')
  );

CREATE POLICY "Admins view client errors"
  ON public.client_error_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update client errors"
  ON public.client_error_logs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete client errors"
  ON public.client_error_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Server function logs
CREATE TABLE public.server_fn_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  fn_name text NOT NULL,
  user_id uuid,
  duration_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  error text
);
ALTER TABLE public.server_fn_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_server_fn_logs_created ON public.server_fn_logs (created_at DESC);
CREATE INDEX idx_server_fn_logs_errors ON public.server_fn_logs (created_at DESC) WHERE status <> 'ok';

CREATE POLICY "Admins view server fn logs"
  ON public.server_fn_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin broadcasts audit
CREATE TABLE public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid NOT NULL,
  audience text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  recipient_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_admin_broadcasts_created ON public.admin_broadcasts (created_at DESC);

CREATE POLICY "Admins view broadcasts"
  ON public.admin_broadcasts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
