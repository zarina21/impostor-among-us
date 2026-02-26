import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Eye, Clock, Skull, Shield } from "lucide-react";
import TurnIndicator from "./TurnIndicator";
import CrewAvatar from "./CrewAvatar";

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

interface TurnOrderItem {
  player: {
    id: string;
    user_id: string;
    profiles: {
      username: string;
    };
  };
  turnNumber: number;
  hasSubmitted: boolean;
  clue: string | null;
  isCurrentTurn: boolean;
  isCurrentUser: boolean;
}

interface CluePhaseProps {
  currentRound: number;
  isImpostor: boolean;
  secretWord: string | null;
  isMyTurn: boolean;
  currentTurnPlayer: Player | null;
  turnOrder: TurnOrderItem[];
  onSubmitClue: (clue: string) => Promise<void>;
}

const CluePhase = ({
  currentRound,
  isImpostor,
  secretWord,
  isMyTurn,
  currentTurnPlayer,
  turnOrder,
  onSubmitClue,
}: CluePhaseProps) => {
  const [currentClue, setCurrentClue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentClue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await onSubmitClue(currentClue.trim());
    setCurrentClue("");
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Round header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/50 border border-border text-xs font-display mb-4">
          Ronda {currentRound}
        </div>

        {/* Role info */}
        {isImpostor ? (
          <div className="p-5 rounded-2xl bg-primary/10 border border-primary/30 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 border border-primary/30 mb-2">
              <Skull className="w-7 h-7 text-primary" />
            </div>
            <p className="text-lg text-primary font-display font-bold text-glow-red">
              ¡Eres el Impostor!
            </p>
            <p className="text-sm text-muted-foreground">
              No conoces la palabra. ¡Finge que la sabes!
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-safe/10 border border-safe/30 space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-safe/20 border border-safe/30 mb-2">
              <Shield className="w-7 h-7 text-safe" />
            </div>
            <p className="text-sm font-display font-semibold text-safe">La palabra secreta es:</p>
            <p className="text-3xl font-display font-bold text-glow-green">{secretWord}</p>
          </div>
        )}
      </div>

      {/* Turn indicator */}
      <div className="bg-muted/30 rounded-lg p-4">
        <TurnIndicator turnOrder={turnOrder} showClues={true} />
      </div>

      {/* Current turn info */}
      {isMyTurn ? (
        <div className="space-y-4">
          <div className="text-center p-3 rounded-lg bg-primary/20 border border-primary">
            <p className="font-semibold text-primary flex items-center justify-center gap-2">
              <Eye className="w-5 h-5" />
              ¡Es tu turno!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Da una pista que haga referencia a la palabra sin revelarla
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Tu pista..."
              value={currentClue}
              onChange={(e) => setCurrentClue(e.target.value)}
              className="bg-muted border-border"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={isSubmitting}
              autoFocus
            />
            <Button
              onClick={handleSubmit}
              className="btn-safe"
              disabled={!currentClue.trim() || isSubmitting}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : currentTurnPlayer ? (
        <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground mb-2 animate-pulse" />
          <p className="text-muted-foreground">
            Esperando a que{" "}
            <span className="font-semibold text-foreground">
              {currentTurnPlayer.profiles.username}
            </span>{" "}
            dé su pista...
          </p>
        </div>
      ) : (
        <div className="text-center p-4 rounded-lg bg-safe/20 border border-safe">
          <p className="text-safe font-semibold">
            ¡Todos han dado sus pistas!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Esperando a que comience la votación...
          </p>
        </div>
      )}
    </div>
  );
};

export default CluePhase;
