import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, TrendingUp, Trophy, Skull, Shield } from "lucide-react";
import CrewAvatar from "./CrewAvatar";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  points: number;
  profiles: {
    username: string;
  };
}

interface VoteData {
  voted_for_id: string;
  voter_id: string;
}

interface PointChange {
  playerId: string;
  pointsGained: number;
  reason: string;
}

interface RoundResultsProps {
  players: Player[];
  votes: VoteData[];
  pointChanges: PointChange[];
  impostorCaught: boolean;
  caughtImpostor: Player | null;
  isHost: boolean;
  onNextRound: () => void;
  secretWord: string | null;
}

const RoundResults = ({
  players,
  votes,
  pointChanges,
  impostorCaught,
  caughtImpostor,
  isHost,
  onNextRound,
  secretWord,
}: RoundResultsProps) => {
  return (
    <div className="space-y-6 text-center">
      {/* Result Banner */}
      <div className="space-y-3">
        {impostorCaught ? (
          <div className="animate-bounce-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-safe/10 border-2 border-safe/30 mb-3">
              <Shield className="w-10 h-10 text-safe" />
            </div>
            <h2 className="font-display text-2xl font-bold text-safe text-glow-green">
              ¡Impostor descubierto!
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-display font-semibold text-foreground">{caughtImpostor?.profiles.username}</span>{" "}
              era el impostor. La palabra era:{" "}
              <span className="font-display font-bold text-safe">{secretWord}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Quienes votaron correctamente ganan 1 punto. El impostor recibe sus puntos acumulados.
            </p>
          </div>
        ) : (
          <div className="animate-bounce-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 mb-3">
              <Skull className="w-10 h-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-primary text-glow-red">
              ¡El impostor sobrevive!
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Los tripulantes no lograron descubrir al impostor. Sigue acumulando puntos en secreto...
            </p>
          </div>
        )}
      </div>

      {/* Vote Results */}
      <div className="space-y-2">
        <h3 className="font-display text-sm font-semibold text-muted-foreground">Votación</h3>
        <div className="grid gap-1.5">
          {players.map((player) => {
            const voteCount = votes.filter((v) => v.voted_for_id === player.user_id).length;
            const wasCaught = impostorCaught && caughtImpostor?.user_id === player.user_id;

            return (
              <div
                key={player.id}
                className={`p-3 rounded-xl flex items-center gap-3 ${
                  wasCaught ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
                }`}
              >
                <CrewAvatar name={player.profiles.username} size="sm" />
                <span className={`flex-1 text-left text-sm ${wasCaught ? "text-primary font-display font-semibold" : ""}`}>
                  {player.profiles.username}
                </span>
                {voteCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {voteCount} {voteCount === 1 ? "voto" : "votos"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Point Changes */}
      {pointChanges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold text-gold flex items-center justify-center gap-1.5">
            <Trophy className="w-4 h-4" />
            Puntos ganados
          </h3>
          <div className="grid gap-1.5">
            {pointChanges.map((change, index) => {
              const player = players.find((p) => p.user_id === change.playerId);
              return (
                <div key={index} className="p-3 rounded-xl bg-safe/5 border border-safe/20 flex items-center gap-3">
                  <CrewAvatar name={player?.profiles.username || "?"} size="sm" />
                  <span className="flex-1 text-left text-sm">{player?.profiles.username}</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-safe/20 text-safe border-safe/30 text-[10px]">
                      +{change.pointsGained} pts
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isHost && (
        <Button onClick={onNextRound} className="btn-impostor px-8 py-5">
          <Skull className="w-5 h-5 mr-2" />
          Siguiente Ronda
        </Button>
      )}
    </div>
  );
};

export default RoundResults;
