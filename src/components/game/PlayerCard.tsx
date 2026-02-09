import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, X, UserPlus, Vote, Clock, Bot } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import LobbyActions from "./LobbyActions";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  is_eliminated: boolean;
  is_ready: boolean;
  is_bot: boolean;
  bot_name: string | null;
  points?: number;
  profiles: {
    username: string;
  };
}

interface PlayerCardProps {
  player: Player;
  user: SupabaseUser;
  hostId: string;
  lobbyId: string;
  gamePhase: "waiting" | "clue" | "voting" | "results" | "finished";
  myVote: string | null;
  onVote?: (userId: string) => void;
  onRefresh?: () => void;
  friendStatus?: "none" | "pending" | "accepted";
}

const PlayerCard = ({
  player,
  user,
  hostId,
  lobbyId,
  gamePhase,
  myVote,
  onVote,
  onRefresh,
  friendStatus = "none",
}: PlayerCardProps) => {
  const [sendingRequest, setSendingRequest] = useState(false);
  const isMe = player.user_id === user.id;
  const isHost = hostId === player.user_id;
  const amIHost = hostId === user.id;

  const handleSendFriendRequest = async () => {
    setSendingRequest(true);

    try {
      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${player.user_id}),and(requester_id.eq.${player.user_id},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending") {
          toast.info("Ya hay una solicitud pendiente");
        } else if (existing.status === "accepted") {
          toast.info("Ya son amigos");
        }
        setSendingRequest(false);
        return;
      }

      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: player.user_id,
      });

      if (error) throw error;

      toast.success(`Solicitud enviada a ${player.profiles.username}`);
    } catch (error: any) {
      toast.error("Error al enviar solicitud");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
        player.is_eliminated
          ? "bg-destructive/10 opacity-50"
          : isMe
          ? "bg-primary/10 border border-primary/30"
          : "bg-muted/50 hover:bg-muted/70"
      }`}
    >
      <div className="flex items-center gap-2">
        {isHost && <Crown className="w-4 h-4 text-gold" />}
        {player.is_bot && <Bot className="w-4 h-4 text-muted-foreground" />}
        <span className={player.is_eliminated ? "line-through" : ""}>
          {player.profiles.username}
        </span>
        {isMe && (
          <Badge variant="secondary" className="text-xs">
            Tú
          </Badge>
        )}
        {player.is_bot && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground">
            Bot
          </Badge>
        )}
        {friendStatus === "accepted" && !isMe && (
          <Badge variant="outline" className="text-xs text-safe border-safe">
            Amigo
          </Badge>
        )}
        {friendStatus === "pending" && !isMe && (
          <Badge variant="outline" className="text-xs text-gold border-gold">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )}
        {/* Show points during game */}
        {gamePhase !== "waiting" && player.points !== undefined && (
          <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
            {player.points} pts
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Ready indicator in waiting phase */}
        {gamePhase === "waiting" &&
          (player.is_ready ? (
            <Check className="w-4 h-4 text-safe" />
          ) : (
            <X className="w-4 h-4 text-muted-foreground" />
          ))}

        {/* Vote button in voting phase */}
        {gamePhase === "voting" &&
          !player.is_eliminated &&
          !isMe &&
          !myVote && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVote?.(player.user_id)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Vote className="w-3 h-3" />
            </Button>
          )}

        {/* Add friend button */}
        {!isMe && friendStatus === "none" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-safe hover:bg-safe/20"
            onClick={handleSendFriendRequest}
            disabled={sendingRequest}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        )}

        {/* Host actions for other players */}
        {!isMe && amIHost && gamePhase === "waiting" && (
          <LobbyActions
            playerId={player.id}
            playerUserId={player.user_id}
            playerUsername={player.profiles.username}
            lobbyId={lobbyId}
            isHost={amIHost}
            onRefresh={onRefresh || (() => {})}
          />
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
