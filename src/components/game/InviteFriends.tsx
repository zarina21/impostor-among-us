import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, Send, Check, Users } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Friend {
  id: string;
  friendUserId: string;
  friendUsername: string;
}

interface InviteFriendsProps {
  user: SupabaseUser;
  lobbyCode: string;
  lobbyId: string;
  currentPlayerIds: string[];
}

const InviteFriends = ({
  user,
  lobbyCode,
  lobbyId,
  currentPlayerIds,
}: InviteFriendsProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchFriends = async () => {
      setLoading(true);

      // Fetch accepted friendships
      const { data: friendshipsData } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");

      if (friendshipsData && friendshipsData.length > 0) {
        // Get friend user IDs
        const friendUserIds = friendshipsData.map((f) =>
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        // Fetch profiles for friends
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", friendUserIds);

        const friendsList: Friend[] = friendshipsData.map((f) => {
          const friendId =
            f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const profile = profilesData?.find((p) => p.user_id === friendId);
          return {
            id: f.id,
            friendUserId: friendId,
            friendUsername: profile?.username || "Jugador",
          };
        });

        setFriends(friendsList);
      } else {
        setFriends([]);
      }

      setLoading(false);
    };

    fetchFriends();
  }, [user.id, open]);

  const handleInvite = async (friendUserId: string, friendUsername: string) => {
    // For now, we'll just copy the lobby code and show a message
    // In a full implementation, this would send a notification
    try {
      await navigator.clipboard.writeText(lobbyCode);
      setInvitedIds((prev) => new Set([...prev, friendUserId]));
      toast.success(
        `Código copiado. ¡Envíaselo a ${friendUsername}!`,
        {
          description: `Código de sala: ${lobbyCode}`,
        }
      );
    } catch {
      toast.info(`Envía el código ${lobbyCode} a ${friendUsername}`);
      setInvitedIds((prev) => new Set([...prev, friendUserId]));
    }
  };

  const availableFriends = friends.filter(
    (f) => !currentPlayerIds.includes(f.friendUserId)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invitar amigos
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-safe" />
            Invitar amigos
          </DialogTitle>
          <DialogDescription>
            Invita a tus amigos a unirse a la sala
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground animate-pulse">
            Cargando amigos...
          </div>
        ) : availableFriends.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {friends.length === 0
              ? "No tienes amigos aún. ¡Agrega jugadores desde una partida!"
              : "Todos tus amigos ya están en la sala"}
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {availableFriends.map((friend) => {
                const isInvited = invitedIds.has(friend.friendUserId);
                return (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <span className="font-medium">{friend.friendUsername}</span>
                    <Button
                      size="sm"
                      variant={isInvited ? "secondary" : "default"}
                      className={isInvited ? "" : "btn-safe"}
                      onClick={() =>
                        handleInvite(friend.friendUserId, friend.friendUsername)
                      }
                      disabled={isInvited}
                    >
                      {isInvited ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Invitado
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1" />
                          Invitar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriends;
