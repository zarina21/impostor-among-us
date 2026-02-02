import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  requester_profile?: { username: string };
  addressee_profile?: { username: string };
}

interface FriendsListProps {
  user: SupabaseUser;
}

const FriendsList = ({ user }: FriendsListProps) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = async () => {
    // Fetch accepted friendships
    const { data: friendshipsData } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");

    // Fetch pending requests where I'm the addressee
    const { data: pendingData } = await supabase
      .from("friendships")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (friendshipsData) {
      // Get profile info for each friend
      const friendsWithProfiles = await Promise.all(
        friendshipsData.map(async (f) => {
          const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", friendId)
            .maybeSingle();
          
          return {
            ...f,
            friend_profile: profile,
          };
        })
      );
      setFriends(friendsWithProfiles as any);
    }

    if (pendingData) {
      // Get profile info for pending requests
      const pendingWithProfiles = await Promise.all(
        pendingData.map(async (f) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("user_id", f.requester_id)
            .maybeSingle();
          
          return {
            ...f,
            requester_profile: profile,
          };
        })
      );
      setPendingRequests(pendingWithProfiles as any);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFriendships();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("friendships-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `requester_id=eq.${user.id}`,
        },
        () => fetchFriendships()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `addressee_id=eq.${user.id}`,
        },
        () => fetchFriendships()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user.id]);

  const handleAcceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      toast.error("Error al aceptar solicitud");
      return;
    }

    toast.success("¡Solicitud aceptada!");
  };

  const handleRejectRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast.error("Error al rechazar solicitud");
      return;
    }

    toast.success("Solicitud rechazada");
  };

  if (loading) {
    return (
      <Card className="card-game border-border">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground animate-pulse">
            Cargando amigos...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-game border-border">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-safe" />
          Amigos ({friends.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Solicitudes pendientes
            </h4>
            {pendingRequests.map((request: any) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-2 rounded-lg bg-warning/10 border border-warning/30"
              >
                <span className="text-sm font-medium">
                  {request.requester_profile?.username || "Usuario"}
                </span>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-safe hover:bg-safe/20"
                    onClick={() => handleAcceptRequest(request.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-primary hover:bg-primary/20"
                    onClick={() => handleRejectRequest(request.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        {friends.length === 0 && pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tienes amigos aún. ¡Agrega jugadores desde una partida!
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend: any) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <span className="text-sm font-medium">
                  {friend.friend_profile?.username || "Usuario"}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Amigo
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FriendsList;
