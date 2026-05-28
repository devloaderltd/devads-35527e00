
-- Server error logs
CREATE TABLE IF NOT EXISTS public.server_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  route TEXT,
  fn_name TEXT,
  user_id UUID,
  severity TEXT NOT NULL DEFAULT 'error',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.server_error_logs TO authenticated;
GRANT ALL ON public.server_error_logs TO service_role;

ALTER TABLE public.server_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read server errors"
  ON public.server_error_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_server_error_logs_created_at ON public.server_error_logs(created_at DESC);

-- Tag client errors by kind
ALTER TABLE public.client_error_logs
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'unhandled';

CREATE INDEX IF NOT EXISTS idx_client_error_logs_kind ON public.client_error_logs(kind);
CREATE INDEX IF NOT EXISTS idx_client_error_logs_created_at ON public.client_error_logs(created_at DESC);

-- Moderation actions with reason codes
DO $$ BEGIN
  CREATE TYPE public.moderation_reason AS ENUM (
    'spam', 'nudity', 'scam', 'harassment', 'illegal',
    'duplicate', 'underage', 'misleading', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user', 'review', 'message')),
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason_code public.moderation_reason NOT NULL,
  reason_note TEXT,
  notify_user BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read moderation actions"
  ON public.moderation_actions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON public.moderation_actions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON public.moderation_actions(created_at DESC);

-- Mirror moderation_actions into audit_log
CREATE OR REPLACE FUNCTION public.mirror_moderation_to_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_admin_action(
    NEW.actor_id,
    'mod.' || NEW.action,
    NEW.target_type,
    NEW.target_id,
    jsonb_build_object(
      'reason_code', NEW.reason_code,
      'reason_note', NEW.reason_note,
      'notify_user', NEW.notify_user
    )
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mirror_moderation ON public.moderation_actions;
CREATE TRIGGER trg_mirror_moderation
  AFTER INSERT ON public.moderation_actions
  FOR EACH ROW EXECUTE FUNCTION public.mirror_moderation_to_audit();
