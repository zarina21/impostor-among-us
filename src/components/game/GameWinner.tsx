import { Trophy, Medal, Star, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  points: number;
  profiles: {
    username: string;
  };
}

interface GameWinnerProps {
  players: Player[];
  winner: Player;
  pointsToWin: number;
  onReturnToLobby: () => void;
}

const GameWinner = ({
  players,
  winner,
  pointsToWin,
  onReturnToLobby,
}: GameWinnerProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-8 text-center">
      {/* Winner Celebration */}
      <div className="space-y-4">
      <div className="relative inline-block">
          <Trophy
            className="w-24 h-24 mx-auto text-gold animate-pulse"
            style={{ filter: "drop-shadow(0 0 30px hsl(var(--gold) / 0.5))" }}
          />
          <Star
            className="absolute -top-2 -right-2 w-8 h-8 text-gold fill-current animate-bounce"
          />
        </div>
        <h2 className="font-display text-4xl bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">
          ¡{winner.profiles.username} gana!
        </h2>
        <p className="text-lg text-muted-foreground">
          Ha alcanzado {pointsToWin} puntos primero
        </p>
        <Badge
          variant="outline"
          className={`text-lg px-4 py-2 ${
            winner.is_impostor
              ? "border-primary text-primary"
              : "border-safe text-safe"
          }`}
        >
          {winner.is_impostor ? "Impostor" : "Tripulante"}
        </Badge>
      </div>

      {/* Final Standings */}
      <div className="space-y-4">
        <h3 className="font-display text-xl">Clasificación Final</h3>
        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const isWinner = player.id === winner.id;
            const medalColors = [
              "text-gold",
              "text-gray-400",
              "text-amber-700",
            ];

            return (
              <div
                key={player.id}
                className={`p-4 rounded-lg flex items-center justify-between transition-all ${
                  isWinner
                    ? "bg-gold/20 border-2 border-gold"
                    : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {index < 3 ? (
                    <Medal
                      className={`w-6 h-6 ${medalColors[index]}`}
                      style={index === 0 ? { filter: "drop-shadow(0 0 8px hsl(45 90% 55% / 0.5))" } : undefined}
                    />
                  ) : (
                    <span className="w-6 text-center text-muted-foreground font-mono">
                      {index + 1}
                    </span>
                  )}
                  <span className={isWinner ? "font-bold text-lg" : ""}>
                    {player.profiles.username}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      player.is_impostor
                        ? "border-primary/50 text-primary"
                        : "border-safe/50 text-safe"
                    }`}
                  >
                    {player.is_impostor ? "Impostor" : "Tripulante"}
                  </Badge>
                </div>
                <span className="font-display text-xl text-primary">
                  {player.points} pts
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={onReturnToLobby} className="btn-safe" size="lg">
        <Home className="w-4 h-4 mr-2" />
        Volver al Lobby
      </Button>
    </div>
  );
};

export default GameWinner;
