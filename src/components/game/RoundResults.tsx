import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, TrendingUp, Trophy } from "lucide-react";

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
      <div className="space-y-2">
        {impostorCaught ? (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-safe" />
            <h2 className="font-display text-2xl text-safe">
              ¡Impostor descubierto!
            </h2>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">
                {caughtImpostor?.profiles.username}
              </span>{" "}
              era el impostor. La palabra era:{" "}
              <span className="font-bold text-primary">{secretWord}</span>
            </p>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 mx-auto text-primary" />
            <h2 className="font-display text-2xl text-primary">
              ¡El impostor sobrevive!
            </h2>
            <p className="text-muted-foreground">
              Los tripulantes votaron a un inocente. El impostor gana un punto.
            </p>
          </>
        )}
      </div>

      {/* Vote Results */}
      <div className="space-y-2">
        <h3 className="font-semibold flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Resultados de la votación
        </h3>
        <div className="grid gap-2">
          {players.map((player) => {
            const voteCount = votes.filter(
              (v) => v.voted_for_id === player.user_id
            ).length;
            const wasCaught =
              impostorCaught && caughtImpostor?.user_id === player.user_id;

            return (
              <div
                key={player.id}
                className={`p-3 rounded-lg flex justify-between items-center ${
                  wasCaught
                    ? "bg-primary/20 border border-primary"
                    : "bg-muted/50"
                }`}
              >
                <span className={wasCaught ? "text-primary font-semibold" : ""}>
                  {player.profiles.username}
                </span>
                <Badge variant={voteCount > 0 ? "destructive" : "secondary"}>
                  {voteCount} votos
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Point Changes */}
      {pointChanges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center justify-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            Puntos ganados esta ronda
          </h3>
          <div className="grid gap-2">
            {pointChanges.map((change, index) => {
              const player = players.find((p) => p.user_id === change.playerId);
              return (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-safe/10 border border-safe/30 flex justify-between items-center"
                >
                  <span>{player?.profiles.username}</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-safe text-safe-foreground">
                      +{change.pointsGained} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {change.reason}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isHost && (
        <Button onClick={onNextRound} className="btn-impostor">
          Siguiente Ronda
        </Button>
      )}
    </div>
  );
};

export default RoundResults;
