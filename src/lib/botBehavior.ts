import { supabase } from "@/integrations/supabase/client";

// Generic clues bots can use (vague enough to work for any word)
const BOT_CLUES = [
  "Interesante",
  "Común",
  "Conocido",
  "Normal",
  "Típico",
  "Obvio",
  "Familiar",
  "Popular",
  "Clásico",
  "Simple",
  "Cotidiano",
  "Básico",
  "Frecuente",
  "Usual",
  "Regular",
];

// Impostor clues (even more vague)
const IMPOSTOR_CLUES = [
  "Hmm...",
  "Curioso",
  "Pensando...",
  "Difícil",
  "Complejo",
  "Raro",
  "Único",
  "Especial",
  "Misterioso",
  "Abstracto",
];

export const getRandomBotClue = (isImpostor: boolean): string => {
  const clues = isImpostor ? IMPOSTOR_CLUES : BOT_CLUES;
  return clues[Math.floor(Math.random() * clues.length)];
};

export const submitBotClues = async (
  lobbyId: string,
  round: number,
  botPlayers: Array<{ user_id: string; is_impostor: boolean }>
) => {
  for (const bot of botPlayers) {
    // Check if bot already submitted a clue this round
    const { data: existingClue } = await supabase
      .from("round_clues")
      .select("id")
      .eq("lobby_id", lobbyId)
      .eq("round", round)
      .eq("user_id", bot.user_id)
      .maybeSingle();

    if (!existingClue) {
      const clue = getRandomBotClue(bot.is_impostor);
      
      // Add small delay to seem more natural
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 500));
      
      await supabase.from("round_clues").insert({
        lobby_id: lobbyId,
        round: round,
        user_id: bot.user_id,
        clue: clue,
      });
    }
  }
};

export const submitBotVotes = async (
  lobbyId: string,
  round: number,
  botPlayers: Array<{ user_id: string; is_impostor: boolean; is_eliminated: boolean }>,
  allPlayers: Array<{ user_id: string; is_impostor: boolean; is_eliminated: boolean; is_bot: boolean }>
) => {
  for (const bot of botPlayers) {
    if (bot.is_eliminated) continue;

    // Check if bot already voted this round
    const { data: existingVote } = await supabase
      .from("votes")
      .select("id")
      .eq("lobby_id", lobbyId)
      .eq("round", round)
      .eq("voter_id", bot.user_id)
      .maybeSingle();

    if (!existingVote) {
      // Get eligible players to vote for (not self, not eliminated)
      const eligiblePlayers = allPlayers.filter(
        (p) => p.user_id !== bot.user_id && !p.is_eliminated
      );

      if (eligiblePlayers.length > 0) {
        // Bots vote somewhat randomly, but impostor bots prefer non-impostors
        let targetPlayers = eligiblePlayers;
        
        if (bot.is_impostor) {
          // Impostor bots try to vote for non-impostors
          const nonImpostors = eligiblePlayers.filter((p) => !p.is_impostor);
          if (nonImpostors.length > 0) {
            targetPlayers = nonImpostors;
          }
        }

        const randomTarget = targetPlayers[Math.floor(Math.random() * targetPlayers.length)];
        
        // Add small delay to seem more natural
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 3000 + 1000));
        
        await supabase.from("votes").insert({
          lobby_id: lobbyId,
          round: round,
          voter_id: bot.user_id,
          voted_for_id: randomTarget.user_id,
        });
      }
    }
  }
};
