import { Trophy, Star, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  is_bot: boolean;
  bot_name: string | null;
  points: number;
  profiles: {
    username: string;
  };
}

interface ScoreboardProps {
  players: Player[];
  pointsToWin: number;
  currentUserId: string;
}

const Scoreboard = ({ players, pointsToWin, currentUserId }: ScoreboardProps) => {
  // Sort players by points (descending)
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
  const leader = sortedPlayers[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          Puntuación
        </h3>
        <Badge variant="outline" className="text-gold border-gold">
          <Target className="w-3 h-3 mr-1" />
          Meta: {pointsToWin} pts
        </Badge>
      </div>

      <div className="space-y-3">
        {sortedPlayers.map((player, index) => {
          const isMe = player.user_id === currentUserId;
          const isLeader = player.id === leader?.id && player.points > 0;
          const progressPercent = (player.points / pointsToWin) * 100;

          return (
            <div
              key={player.id}
              className={`p-3 rounded-lg transition-all ${
                isMe
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-sm">
                    #{index + 1}
                  </span>
                  {isLeader && (
                    <Star className="w-4 h-4 text-gold fill-gold" />
                  )}
                  <span className={isMe ? "font-semibold" : ""}>
                    {player.profiles.username}
                  </span>
                  {isMe && (
                    <Badge variant="secondary" className="text-xs">
                      Tú
                    </Badge>
                  )}
                </div>
                <span className="font-display text-lg text-primary">
                  {player.points} pts
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scoreboard;
