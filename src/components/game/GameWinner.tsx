import { Trophy, Medal, Star, Home, Skull, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface GameWinnerProps {
  players: Player[];
  winner: Player;
  pointsToWin: number;
  onReturnToLobby: () => void;
}

const GameWinner = ({ players, winner, pointsToWin, onReturnToLobby }: GameWinnerProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center py-6">
      {/* Winner Celebration */}
      <div className="space-y-4 animate-bounce-in">
        <div className="relative">
          <CrewAvatar name={winner.profiles.username} size="xl" />
          <div className="absolute -top-3 -right-3">
            <Trophy
              className="w-10 h-10 text-gold animate-pulse"
              style={{ filter: "drop-shadow(0 0 15px hsl(42 95% 55% / 0.5))" }}
            />
          </div>
        </div>

        <div>
          <h2 className="font-display text-3xl font-bold bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">
            ¡{winner.profiles.username} gana!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Alcanzó {pointsToWin} puntos
          </p>
        </div>

        <Badge
          variant="outline"
          className={`text-sm px-4 py-1.5 ${
            winner.is_impostor
              ? "border-primary/50 text-primary"
              : "border-safe/50 text-safe"
          }`}
        >
          {winner.is_impostor ? (
            <><Skull className="w-3.5 h-3.5 mr-1" /> Impostor</>
          ) : (
            <><Shield className="w-3.5 h-3.5 mr-1" /> Tripulante</>
          )}
        </Badge>
      </div>

      {/* Final Standings */}
      <div className="w-full max-w-md space-y-3">
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Clasificación Final
        </h3>
        <div className="space-y-1.5">
          {sortedPlayers.map((player, index) => {
            const isWinner = player.id === winner.id;
            const medalEmojis = ["🥇", "🥈", "🥉"];

            return (
              <div
                key={player.id}
                className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
                  isWinner ? "bg-gold/10 border border-gold/30" : "bg-muted/30"
                }`}
              >
                <span className="w-6 text-center font-display">
                  {index < 3 ? medalEmojis[index] : `${index + 1}`}
                </span>
                <CrewAvatar name={player.profiles.username} size="sm" />
                <span className={`flex-1 text-left text-sm ${isWinner ? "font-display font-bold" : ""}`}>
                  {player.profiles.username}
                </span>
                <span className="font-display font-bold text-gold">{player.points}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Button onClick={onReturnToLobby} className="btn-safe px-8 py-5">
        <Home className="w-4 h-4 mr-2" />
        Volver al Lobby
      </Button>
    </div>
  );
};

export default GameWinner;
