-- Thread read state (server-backed unread tracking)
CREATE TABLE public.thread_reads (
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

ALTER TABLE public.thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own thread reads"
ON public.thread_reads FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_thread_reads_user ON public.thread_reads(user_id);

-- Per-user archive / mute on threads
ALTER TABLE public.message_threads
  ADD COLUMN IF NOT EXISTS archived_by uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS muted_by uuid[] NOT NULL DEFAULT '{}';

-- Allow participants to update only the per-user array columns
CREATE POLICY "Participants update own thread flags"
ON public.message_threads FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  email_on_message boolean NOT NULL DEFAULT true,
  email_on_expiring boolean NOT NULL DEFAULT true,
  email_on_offer boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification prefs"
ON public.notification_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_notification_prefs_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_reads;