ALTER TABLE public.events 
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false,
ADD COLUMN tags text[] NOT NULL DEFAULT '{}'::text[];