
-- Quick replies
CREATE TABLE IF NOT EXISTS public.message_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quick replies"
  ON public.message_quick_replies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_qr_user ON public.message_quick_replies(user_id, created_at DESC);

CREATE TRIGGER trg_qr_updated_at
  BEFORE UPDATE ON public.message_quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_read_receipts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_done_at timestamptz;
