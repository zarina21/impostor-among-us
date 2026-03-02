
-- Allow host to insert bots into lobby_players
CREATE POLICY "Host can add bots to lobby"
ON public.lobby_players
FOR INSERT
TO authenticated
WITH CHECK (
  is_bot = true
  AND EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE lobbies.id = lobby_players.lobby_id
    AND lobbies.host_id = auth.uid()
  )
);

-- Allow host to delete bots from lobby_players
CREATE POLICY "Host can remove bots from lobby"
ON public.lobby_players
FOR DELETE
TO authenticated
USING (
  is_bot = true
  AND EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE lobbies.id = lobby_players.lobby_id
    AND lobbies.host_id = auth.uid()
  )
);

-- Allow host to update any player in their lobby (for game state: impostor, eliminated, points)
CREATE POLICY "Host can update players in their lobby"
ON public.lobby_players
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.lobbies
    WHERE lobbies.id = lobby_players.lobby_id
    AND lobbies.host_id = auth.uid()
  )
);

-- Allow host to submit clues on behalf of bots
CREATE POLICY "Host can submit bot clues"
ON public.round_clues
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobby_players lp
    JOIN public.lobbies l ON l.id = lp.lobby_id
    WHERE lp.user_id = round_clues.user_id
    AND lp.lobby_id = round_clues.lobby_id
    AND lp.is_bot = true
    AND l.host_id = auth.uid()
  )
);

-- Allow host to submit votes on behalf of bots
CREATE POLICY "Host can submit bot votes"
ON public.votes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lobby_players lp
    JOIN public.lobbies l ON l.id = lp.lobby_id
    WHERE lp.user_id = votes.voter_id
    AND lp.lobby_id = votes.lobby_id
    AND lp.is_bot = true
    AND l.host_id = auth.uid()
  )
);
