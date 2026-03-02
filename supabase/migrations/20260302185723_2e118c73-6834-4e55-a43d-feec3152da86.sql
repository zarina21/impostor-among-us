
ALTER TABLE public.round_clues DROP CONSTRAINT IF EXISTS round_clues_user_id_fkey;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_voter_id_fkey;
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_voted_for_id_fkey;
