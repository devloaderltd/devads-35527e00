UPDATE public.homepage_config
SET
  hero = COALESCE(hero, '{}'::jsonb) || jsonb_build_object(
    'title', 'Independent Escorts Near You – {accent}Local Escort Directory.{/accent}',
    'subtitle', 'callescort24 is an escort directory for adult providers to advertise services, show rates and availability, and connect with paying clients.'
  ),
  updated_at = now()
WHERE id = 'global';