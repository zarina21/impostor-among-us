-- Add is_bot field to lobby_players
ALTER TABLE public.lobby_players 
ADD COLUMN is_bot boolean DEFAULT false;

-- Add bot_name field to store the bot's display name
ALTER TABLE public.lobby_players 
ADD COLUMN bot_name text;