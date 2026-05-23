GRANT SELECT (id, display_name, avatar_url, bio, country, city_id, created_at, updated_at, email_verified_at) ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;