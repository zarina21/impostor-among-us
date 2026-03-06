
ALTER TABLE public.game_settings 
  ADD COLUMN IF NOT EXISTS voting_time_seconds integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS total_rounds integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.word_categories(id) ON DELETE SET NULL DEFAULT NULL;
