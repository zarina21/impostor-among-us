import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

export const useFriendships = (user: SupabaseUser | null) => {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (data) {
      setFriendships(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchFriendships();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`friendships-${user.id}`)
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
  }, [user, fetchFriendships]);

  const getFriendStatus = useCallback(
    (otherUserId: string): "none" | "pending" | "accepted" => {
      const friendship = friendships.find(
        (f) =>
          (f.requester_id === user?.id && f.addressee_id === otherUserId) ||
          (f.addressee_id === user?.id && f.requester_id === otherUserId)
      );

      if (!friendship) return "none";
      return friendship.status as "pending" | "accepted";
    },
    [friendships, user]
  );

  return { friendships, loading, getFriendStatus, refetch: fetchFriendships };
};
