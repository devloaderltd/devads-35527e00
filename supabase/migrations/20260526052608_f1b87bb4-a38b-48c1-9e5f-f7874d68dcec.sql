-- Ensure pg_cron + pg_net are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any pre-existing copy (idempotent re-runs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-promote-listings') THEN
    PERFORM cron.unschedule('auto-promote-listings');
  END IF;
END $$;

-- Daily at 03:15 UTC, hit the public cron endpoint to renew + bump listings
-- whose owners enabled auto_renew and which expire within 24h.
SELECT cron.schedule(
  'auto-promote-listings',
  '15 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4e817e8c-6b6f-4c13-a579-a3b9b7d44ed7.lovable.app/api/public/cron/auto-promote',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_xPs_zW3F62yZYbCtg8jXvQ_RHdbOGiy"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);