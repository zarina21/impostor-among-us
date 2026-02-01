-- Profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Game lobbies table
CREATE TABLE public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  min_players INTEGER DEFAULT 5,
  max_players INTEGER DEFAULT 8,
  current_round INTEGER DEFAULT 0,
  impostor_count INTEGER DEFAULT 1,
  secret_word TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on lobbies
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;

-- Lobbies policies
CREATE POLICY "Lobbies are viewable by authenticated users"
  ON public.lobbies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Hosts can create lobbies"
  ON public.lobbies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their lobbies"
  ON public.lobbies FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their lobbies"
  ON public.lobbies FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Players in lobbies
CREATE TABLE public.lobby_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID REFERENCES public.lobbies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_impostor BOOLEAN DEFAULT false,
  is_eliminated BOOLEAN DEFAULT false,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(lobby_id, user_id)
);

-- Enable RLS on lobby_players
ALTER TABLE public.lobby_players ENABLE ROW LEVEL SECURITY;

-- Lobby players policies
CREATE POLICY "Lobby players viewable by authenticated users"
  ON public.lobby_players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can join lobbies"
  ON public.lobby_players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own player state"
  ON public.lobby_players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave lobbies"
  ON public.lobby_players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Votes table for elimination voting
CREATE TABLE public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID REFERENCES public.lobbies(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  voted_for_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(lobby_id, round, voter_id)
);

-- Enable RLS on votes
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Votes policies
CREATE POLICY "Votes viewable by lobby members"
  ON public.votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cast votes"
  ON public.votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_id);

-- Round clues table
CREATE TABLE public.round_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID REFERENCES public.lobbies(id) ON DELETE CASCADE NOT NULL,
  round INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clue TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(lobby_id, round, user_id)
);

-- Enable RLS on round_clues
ALTER TABLE public.round_clues ENABLE ROW LEVEL SECURITY;

-- Round clues policies
CREATE POLICY "Clues viewable by authenticated users"
  ON public.round_clues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can submit clues"
  ON public.round_clues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Word categories table
CREATE TABLE public.word_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  words TEXT[] NOT NULL
);

-- Enable RLS on word_categories
ALTER TABLE public.word_categories ENABLE ROW LEVEL SECURITY;

-- Word categories policies
CREATE POLICY "Word categories viewable by authenticated users"
  ON public.word_categories FOR SELECT
  TO authenticated
  USING (true);

-- Insert default word categories
INSERT INTO public.word_categories (name, words) VALUES
  ('Animales', ARRAY['Elefante', 'Delfín', 'Águila', 'Tigre', 'Serpiente', 'Canguro', 'Pulpo', 'Mariposa', 'Cocodrilo', 'Pingüino']),
  ('Comida', ARRAY['Pizza', 'Sushi', 'Hamburguesa', 'Tacos', 'Paella', 'Helado', 'Chocolate', 'Ensalada', 'Pasta', 'Sopa']),
  ('Lugares', ARRAY['Playa', 'Montaña', 'Museo', 'Estadio', 'Hospital', 'Biblioteca', 'Parque', 'Aeropuerto', 'Teatro', 'Mercado']),
  ('Profesiones', ARRAY['Doctor', 'Bombero', 'Chef', 'Piloto', 'Detective', 'Astronauta', 'Veterinario', 'Arquitecto', 'Músico', 'Fotógrafo']),
  ('Películas', ARRAY['Titanic', 'Avatar', 'Matrix', 'Gladiador', 'Joker', 'Inception', 'Frozen', 'Coco', 'Avengers', 'Jurassic Park']);

-- Enable realtime for game tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_clues;

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Jugador_' || LEFT(NEW.id::text, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate unique lobby code
CREATE OR REPLACE FUNCTION public.generate_lobby_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;