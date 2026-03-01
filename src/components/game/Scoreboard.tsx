import { Trophy } from "lucide-react";
import CrewAvatar from "./CrewAvatar";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  is_bot: boolean;
  bot_name: string | null;
  points: number;
  hidden_points?: number;
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
  // For display: hide impostor's hidden_points (don't add them to visible score)
  // Only show the "points" field which is the officially revealed score
  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-gold" />
          Puntuación
        </h3>
        <span className="text-[10px] text-gold font-display">Meta: {pointsToWin}</span>
      </div>

      <div className="space-y-1.5">
        {sortedPlayers.map((player, index) => {
          const isMe = player.user_id === currentUserId;
          const displayPoints = player.points;
          const progressPercent = Math.min((displayPoints / pointsToWin) * 100, 100);

          return (
            <div key={player.id} className={`flex items-center gap-2 p-2 rounded-lg ${isMe ? "bg-primary/5" : ""}`}>
              <CrewAvatar name={player.profiles.username} size="sm" isBot={player.is_bot} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-display truncate">
                    {player.profiles.username}
                    {isMe && <span className="text-primary ml-1">(Tú)</span>}
                  </span>
                  <span className="text-xs font-display font-bold text-gold">{displayPoints}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${progressPercent}%`,
                      background: index === 0 && displayPoints > 0
                        ? "var(--gradient-safe)"
                        : "hsl(var(--muted-foreground) / 0.3)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scoreboard;
