import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, LogIn, LogOut, User } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import FriendsList from "@/components/game/FriendsList";

interface Profile {
  username: string;
  games_played: number;
  games_won: number;
}

const Lobby = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lobbyCode, setLobbyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, games_played, games_won")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  const handleCreateLobby = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Generate a unique code
      const code = generateCode();

      // Create the lobby
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .insert({
          code,
          host_id: user.id,
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      // Add host as player
      const { error: playerError } = await supabase
        .from("lobby_players")
        .insert({
          lobby_id: lobby.id,
          user_id: user.id,
          is_ready: true,
        });

      if (playerError) throw playerError;

      toast.success(`¡Sala creada! Código: ${code}`);
      navigate(`/game/${code}`);
    } catch (error: any) {
      toast.error(error.message || "Error al crear la sala");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!user || !lobbyCode.trim()) {
      toast.error("Ingresa un código de sala");
      return;
    }
    setLoading(true);

    try {
      // Find the lobby
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .select("*")
        .eq("code", lobbyCode.toUpperCase())
        .maybeSingle();

      if (lobbyError || !lobby) {
        toast.error("Sala no encontrada");
        setLoading(false);
        return;
      }

      if (lobby.status !== "waiting") {
        toast.error("Esta sala ya está en partida");
        setLoading(false);
        return;
      }

      // Check player count
      const { count } = await supabase
        .from("lobby_players")
        .select("*", { count: "exact", head: true })
        .eq("lobby_id", lobby.id);

      if (count && count >= lobby.max_players) {
        toast.error("La sala está llena");
        setLoading(false);
        return;
      }

      // Check if already in lobby
      const { data: existingPlayer } = await supabase
        .from("lobby_players")
        .select("id")
        .eq("lobby_id", lobby.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingPlayer) {
        // Already in lobby, just navigate
        navigate(`/game/${lobbyCode.toUpperCase()}`);
        return;
      }

      // Join the lobby
      const { error: playerError } = await supabase
        .from("lobby_players")
        .insert({
          lobby_id: lobby.id,
          user_id: user.id,
        });

      if (playerError) throw playerError;

      toast.success("¡Te uniste a la sala!");
      navigate(`/game/${lobbyCode.toUpperCase()}`);
    } catch (error: any) {
      toast.error(error.message || "Error al unirse a la sala");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isAnonymous = user?.is_anonymous;

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-safe/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header with user info */}
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span className="font-medium text-foreground">
            {profile?.username || "Cargando..."}
            {isAnonymous && <span className="ml-1 text-xs text-muted-foreground">(Invitado)</span>}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Friends (only for registered users) */}
          <div className="md:col-span-1 space-y-6">
            {user && !isAnonymous && <FriendsList user={user} />}
            {isAnonymous && (
              <div className="card-game border-border p-6 text-center">
                <p className="text-muted-foreground text-sm mb-4">
                  Crea una cuenta para añadir amigos y guardar tu progreso
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-border"
                  onClick={() => navigate("/auth")}
                >
                  Crear Cuenta
                </Button>
              </div>
            )}
          </div>

          {/* Right Column - Lobby Actions */}
          <div className="md:col-span-2 space-y-6">
            {/* Stats Card */}
            {profile && (
              <Card className="card-game border-border animate-slide-up">
                <CardContent className="pt-6">
                  <div className="flex justify-around text-center">
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{profile.games_played}</p>
                      <p className="text-xs text-muted-foreground">Partidas</p>
                    </div>
                    <div className="w-px bg-border" />
                    <div>
                      <p className="text-2xl font-display font-bold text-safe">{profile.games_won}</p>
                      <p className="text-xs text-muted-foreground">Victorias</p>
                    </div>
                    <div className="w-px bg-border" />
                    <div>
                      <p className="text-2xl font-display font-bold text-gold">
                        {profile.games_played > 0 
                          ? Math.round((profile.games_won / profile.games_played) * 100) 
                          : 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Create Lobby Card */}
            <Card className="card-game border-border animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Plus className="w-5 h-5 text-safe" />
                  Crear Sala
                </CardTitle>
                <CardDescription>Crea una nueva sala y comparte el código</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full btn-safe" 
                  onClick={handleCreateLobby}
                  disabled={loading}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Crear Nueva Sala
                </Button>
              </CardContent>
            </Card>

            {/* Join Lobby Card */}
            <Card className="card-game border-border animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-primary" />
                  Unirse a Sala
                </CardTitle>
                <CardDescription>Ingresa el código de la sala</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="CÓDIGO"
                  value={lobbyCode}
                  onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                  className="bg-muted border-border text-center text-xl font-mono tracking-widest"
                  maxLength={6}
                />
                <Button 
                  className="w-full btn-impostor" 
                  onClick={handleJoinLobby}
                  disabled={loading || !lobbyCode.trim()}
                >
                  Unirse a la Sala
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
