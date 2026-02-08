import { useMemo } from "react";

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
  profiles?: {
    username: string;
  };
}

interface UseTurnSystemProps {
  players: Player[];
  clues: Clue[];
  currentRound: number;
  currentUserId: string | undefined;
}

export const useTurnSystem = ({
  players,
  clues,
  currentRound,
  currentUserId,
}: UseTurnSystemProps) => {
  // Get active players sorted by join order (using id as proxy for order)
  const activePlayers = useMemo(() => {
    return players
      .filter((p) => !p.is_eliminated && p.is_ready)
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [players]);

  // Get clues for current round
  const currentRoundClues = useMemo(() => {
    return clues.filter((c) => c.round === currentRound);
  }, [clues, currentRound]);

  // Determine whose turn it is
  const currentTurnPlayer = useMemo(() => {
    const playersWhoSubmitted = new Set(currentRoundClues.map((c) => c.user_id));
    return activePlayers.find((p) => !playersWhoSubmitted.has(p.user_id)) || null;
  }, [activePlayers, currentRoundClues]);

  // Check if it's the current user's turn
  const isMyTurn = useMemo(() => {
    return currentTurnPlayer?.user_id === currentUserId;
  }, [currentTurnPlayer, currentUserId]);

  // Check if all players have submitted clues
  const allCluesSubmitted = useMemo(() => {
    return activePlayers.every((p) =>
      currentRoundClues.some((c) => c.user_id === p.user_id)
    );
  }, [activePlayers, currentRoundClues]);

  // Get the turn order with status
  const turnOrder = useMemo(() => {
    return activePlayers.map((player, index) => {
      const submittedClue = currentRoundClues.find(
        (c) => c.user_id === player.user_id
      );
      return {
        player,
        turnNumber: index + 1,
        hasSubmitted: !!submittedClue,
        clue: submittedClue?.clue || null,
        isCurrentTurn: currentTurnPlayer?.user_id === player.user_id,
        isCurrentUser: player.user_id === currentUserId,
      };
    });
  }, [activePlayers, currentRoundClues, currentTurnPlayer, currentUserId]);

  return {
    activePlayers,
    currentTurnPlayer,
    isMyTurn,
    allCluesSubmitted,
    turnOrder,
    currentRoundClues,
  };
};
