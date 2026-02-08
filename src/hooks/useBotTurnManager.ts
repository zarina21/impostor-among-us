import { useEffect, useCallback, useRef } from "react";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  is_eliminated: boolean;
  is_ready: boolean;
  is_bot: boolean;
  bot_name: string | null;
  profiles: {
    username: string;
  };
}

interface Clue {
  id: string;
  round: number;
  user_id: string;
  clue: string;
}

interface UseBotTurnManagerProps {
  players: Player[];
  clues: Clue[];
  currentRound: number;
  lobbyId: string | undefined;
  gamePhase: string;
}

export const useBotTurnManager = ({
  players,
  clues,
  currentRound,
  lobbyId,
  gamePhase,
}: UseBotTurnManagerProps) => {
  // Track if we've already triggered bots to prevent duplicate calls
  const triggeredBotsRef = useRef<Set<string>>(new Set());
  const lastClueCountRef = useRef(0);

  // Get sorted active players (same order as turn system)
  const getActivePlayers = useCallback(() => {
    return players
      .filter((p) => !p.is_eliminated && p.is_ready)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [players]);

  // Trigger bot clue if it's a bot's turn
  const triggerBotTurnIfNeeded = useCallback(async () => {
    if (gamePhase !== "clue" || !lobbyId || currentRound <= 0) return;

    const activePlayers = getActivePlayers();
    const currentRoundClues = clues.filter((c) => c.round === currentRound);
    const playersWhoSubmitted = new Set(currentRoundClues.map((c) => c.user_id));

    // Find next player who hasn't submitted
    const nextPlayer = activePlayers.find((p) => !playersWhoSubmitted.has(p.user_id));

    if (nextPlayer && nextPlayer.is_bot) {
      // Check if we already triggered this bot
      const botKey = `${nextPlayer.user_id}-${currentRound}`;
      if (triggeredBotsRef.current.has(botKey)) return;
      
      triggeredBotsRef.current.add(botKey);

      // Add a small delay before triggering
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      import("@/lib/botBehavior").then(({ submitBotClue }) => {
        submitBotClue(lobbyId, currentRound, nextPlayer.user_id, nextPlayer.is_impostor);
      });
    }

    // Check if all clues are submitted - trigger bot votes
    if (currentRoundClues.length >= activePlayers.length) {
      const botPlayers = players
        .filter((p) => p.is_bot && !p.is_eliminated)
        .map((p) => ({
          user_id: p.user_id,
          is_impostor: p.is_impostor,
          is_eliminated: p.is_eliminated,
          is_bot: p.is_bot,
        }));

      const allPlayersData = players.map((p) => ({
        user_id: p.user_id,
        is_impostor: p.is_impostor,
        is_eliminated: p.is_eliminated,
        is_bot: p.is_bot,
      }));

      if (botPlayers.length > 0) {
        import("@/lib/botBehavior").then(({ submitBotVotes }) => {
          submitBotVotes(lobbyId, currentRound, botPlayers, allPlayersData);
        });
      }
    }
  }, [gamePhase, lobbyId, currentRound, clues, getActivePlayers, players]);

  // Reset triggered bots when round changes
  useEffect(() => {
    triggeredBotsRef.current = new Set();
    lastClueCountRef.current = 0;
  }, [currentRound]);

  // Watch for changes in clues and trigger bot turns
  useEffect(() => {
    // Only trigger if clue count increased
    if (clues.length > lastClueCountRef.current) {
      lastClueCountRef.current = clues.length;
      triggerBotTurnIfNeeded();
    }
  }, [clues.length, triggerBotTurnIfNeeded]);

  // Initial trigger when game phase changes to clue
  useEffect(() => {
    if (gamePhase === "clue") {
      triggerBotTurnIfNeeded();
    }
  }, [gamePhase, triggerBotTurnIfNeeded]);

  return {
    triggerBotTurnIfNeeded,
  };
};

