import { Badge } from "@/components/ui/badge";
import { Clock, Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface TurnIndicatorProps {
  turnOrder: TurnOrderItem[];
  showClues?: boolean;
}

const TurnIndicator = ({ turnOrder, showClues = true }: TurnIndicatorProps) => {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm text-muted-foreground mb-3">
        Orden de turnos
      </h3>
      <div className="space-y-2">
        {turnOrder.map((item) => (
          <div
            key={item.player.id}
            className={cn(
              "p-3 rounded-lg border transition-all duration-300",
              item.isCurrentTurn && !item.hasSubmitted
                ? "border-primary bg-primary/10 animate-pulse"
                : item.hasSubmitted
                ? "border-safe/50 bg-safe/10"
                : "border-border bg-muted/30"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs",
                    item.isCurrentTurn && !item.hasSubmitted
                      ? "border-primary text-primary"
                      : item.hasSubmitted
                      ? "border-safe text-safe"
                      : "border-muted-foreground"
                  )}
                >
                  {item.turnNumber}
                </Badge>
                <span
                  className={cn(
                    "font-medium",
                    item.isCurrentUser && "text-primary"
                  )}
                >
                  {item.player.profiles.username}
                  {item.isCurrentUser && " (Tú)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {item.hasSubmitted ? (
                  <Check className="w-4 h-4 text-safe" />
                ) : item.isCurrentTurn ? (
                  <Clock className="w-4 h-4 text-primary animate-pulse" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Show clue if submitted and showClues is true */}
            {item.hasSubmitted && showClues && item.clue && (
              <div className="mt-2 flex items-start gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="text-muted-foreground italic">
                  "{item.clue}"
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TurnIndicator;
