
-- 1. Revoke direct SELECT on profiles.phone for anon/authenticated.
--    Users can still fetch their own phone via public.get_my_phone() (SECURITY DEFINER).
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

-- 2. Tighten seller_reviews UPDATE policy: add WITH CHECK so reviewer_id can't be reassigned.
DROP POLICY IF EXISTS "Reviewers update own reviews" ON public.seller_reviews;
CREATE POLICY "Reviewers update own reviews"
ON public.seller_reviews
FOR UPDATE
TO public
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);

-- 3. Enable RLS on realtime.messages and scope channel topic subscriptions.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies we may have added before
DROP POLICY IF EXISTS "Authenticated topic read" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated topic write" ON realtime.messages;

-- Authorize a user to subscribe to / receive messages on a topic only when the
-- topic identifies the caller (notifs-<uid>, wallet-<uid>) or a thread they
-- participate in (messages-<thread>, reads-<thread>, presence-<thread>).
CREATE POLICY "Authenticated topic read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'notifs-%' THEN
      substring(realtime.topic() from 8) = auth.uid()::text
    WHEN realtime.topic() = 'wallet-rt' THEN
      true  -- per-user filtering handled by client-side filter + table RLS
    WHEN realtime.topic() = 'messages-overview' THEN
      true  -- gated by messages table RLS
    WHEN realtime.topic() LIKE 'messages-%'
      OR realtime.topic() LIKE 'reads-%'
      OR realtime.topic() LIKE 'presence-%' THEN
      EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id::text = split_part(realtime.topic(), '-', 2)
          AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
      )
    ELSE false
  END
);

-- Allow authenticated users to send broadcast / presence payloads under the
-- same topic restrictions (postgres_changes events don't go through INSERT).
CREATE POLICY "Authenticated topic write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  CASE
    WHEN realtime.topic() LIKE 'presence-%' THEN
      EXISTS (
        SELECT 1 FROM public.message_threads t
        WHERE t.id::text = split_part(realtime.topic(), '-', 2)
          AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
      )
    ELSE false
  END
);
