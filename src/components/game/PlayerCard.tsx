import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, X, UserPlus, Vote, Clock, Bot } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import LobbyActions from "./LobbyActions";
import CrewAvatar from "./CrewAvatar";

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
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.eq.${player.user_id}),and(requester_id.eq.${player.user_id},addressee_id.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending") toast.info("Ya hay una solicitud pendiente");
        else if (existing.status === "accepted") toast.info("Ya son amigos");
        setSendingRequest(false);
        return;
      }

      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id,
        addressee_id: player.user_id,
      });
      if (error) throw error;
      toast.success(`Solicitud enviada a ${player.profiles.username}`);
    } catch {
      toast.error("Error al enviar solicitud");
    } finally {
      setSendingRequest(false);
    }
  };

  const isVotedFor = myVote === player.user_id;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 animate-slide-in-right ${
        player.is_eliminated
          ? "bg-destructive/5 opacity-40"
          : isMe
          ? "bg-primary/10 border border-primary/20 shadow-lg"
          : isVotedFor
          ? "bg-gold/10 border border-gold/30"
          : "bg-muted/30 hover:bg-muted/50"
      }`}
      style={{ animationDelay: `${Math.random() * 0.2}s` }}
    >
      {/* Avatar */}
      <CrewAvatar
        name={player.profiles.username}
        size="md"
        isBot={player.is_bot}
        isEliminated={player.is_eliminated}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isHost && <Crown className="w-3.5 h-3.5 text-gold shrink-0" />}
          <span className={`font-display font-semibold text-sm truncate ${player.is_eliminated ? "line-through" : ""}`}>
            {player.profiles.username}
          </span>
          {isMe && (
            <Badge className="text-[10px] h-4 px-1.5 bg-primary/20 text-primary border-primary/30">
              Tú
            </Badge>
          )}
          {player.is_bot && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground border-muted-foreground/30">
              Bot
            </Badge>
          )}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1 mt-0.5">
          {friendStatus === "accepted" && !isMe && (
            <span className="text-[10px] text-safe">✦ Amigo</span>
          )}
          {friendStatus === "pending" && !isMe && (
            <span className="text-[10px] text-gold">⧖ Pendiente</span>
          )}
          {gamePhase !== "waiting" && player.points !== undefined && (
            <span className="text-[10px] font-display font-bold text-gold">
              {player.points} pts
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Ready indicator */}
        {gamePhase === "waiting" && (
          player.is_ready ? (
            <div className="w-6 h-6 rounded-full bg-safe/20 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-safe" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          )
        )}

        {/* Vote button */}
        {gamePhase === "voting" && !player.is_eliminated && !isMe && !myVote && (
          <Button
            size="sm"
            onClick={() => onVote?.(player.user_id)}
            className="btn-impostor h-8 text-xs px-3"
          >
            <Vote className="w-3 h-3 mr-1" />
            Votar
          </Button>
        )}

        {isVotedFor && (
          <Badge className="bg-gold/20 text-gold border-gold/30 text-[10px]">
            Tu voto
          </Badge>
        )}

        {/* Add friend */}
        {!isMe && friendStatus === "none" && !player.is_bot && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-safe/60 hover:text-safe hover:bg-safe/10"
            onClick={handleSendFriendRequest}
            disabled={sendingRequest}
          >
            <UserPlus className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Host actions */}
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
