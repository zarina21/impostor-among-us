-- Add points column to lobby_players
ALTER TABLE public.lobby_players 
ADD COLUMN points integer NOT NULL DEFAULT 0;

-- Create a game_settings table for configurable win conditions
CREATE TABLE public.game_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  points_to_win integer NOT NULL DEFAULT 10,
  impostor_points_per_round integer NOT NULL DEFAULT 1,
  crewmate_points_for_catch integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_settings
CREATE POLICY "Game settings viewable by authenticated users" 
ON public.game_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Hosts can create game settings" 
ON public.game_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = lobby_id AND host_id = auth.uid()
  )
);

CREATE POLICY "Hosts can update game settings" 
ON public.game_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies 
    WHERE id = lobby_id AND host_id = auth.uid()
  )
);

-- Enable realtime for lobby_players to track points in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_settings;