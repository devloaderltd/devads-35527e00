ALTER TABLE public.listings ALTER COLUMN bumped_at DROP DEFAULT;
ALTER TABLE public.listings ALTER COLUMN bumped_at DROP NOT NULL;
UPDATE public.listings SET bumped_at = NULL WHERE bumped_at IS NOT NULL AND bumped_at <= created_at + interval '2 seconds';