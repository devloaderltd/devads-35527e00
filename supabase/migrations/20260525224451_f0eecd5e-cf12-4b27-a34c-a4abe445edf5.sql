SELECT cron.schedule(
  'match-saved-searches-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4e817e8c-6b6f-4c13-a579-a3b9b7d44ed7.lovable.app/api/public/cron/match-saved-searches',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_xPs_zW3F62yZYbCtg8jXvQ_RHdbOGiy"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);