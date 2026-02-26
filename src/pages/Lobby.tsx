import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, LogIn, LogOut, Skull, Trophy, Target } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import FriendsList from "@/components/game/FriendsList";
import CrewAvatar from "@/components/game/CrewAvatar";

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
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      if (!session) { navigate("/"); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session) { navigate("/"); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    return () => { isMounted = false; subscription.unsubscribe(); };
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, games_played, games_won")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };

  const handleCreateLobby = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const code = generateCode();
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .insert({ code, host_id: user.id, min_players: 3, max_players: 8, impostor_count: 1 })
        .select()
        .single();
      if (lobbyError) throw lobbyError;

      const { error: playerError } = await supabase
        .from("lobby_players")
        .insert({ lobby_id: lobby.id, user_id: user.id, is_ready: true });
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
    if (!user || !lobbyCode.trim()) { toast.error("Ingresa un código de sala"); return; }
    setLoading(true);
    try {
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .select("*")
        .eq("code", lobbyCode.toUpperCase())
        .maybeSingle();

      if (lobbyError || !lobby) { toast.error("Sala no encontrada"); setLoading(false); return; }
      if (lobby.status !== "waiting") { toast.error("Esta sala ya está en partida"); setLoading(false); return; }

      const { count } = await supabase
        .from("lobby_players")
        .select("*", { count: "exact", head: true })
        .eq("lobby_id", lobby.id);
      if (count && count >= lobby.max_players) { toast.error("La sala está llena"); setLoading(false); return; }

      const { data: existingPlayer } = await supabase
        .from("lobby_players")
        .select("id")
        .eq("lobby_id", lobby.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingPlayer) { navigate(`/game/${lobbyCode.toUpperCase()}`); return; }

      const { error: playerError } = await supabase
        .from("lobby_players")
        .insert({ lobby_id: lobby.id, user_id: user.id });
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
  const winRate = profile && profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 space-bg">
      <div className="stars" />

      {/* User header */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <div className="flex items-center gap-2 card-game px-3 py-2 border border-border">
          <CrewAvatar name={profile?.username || "?"} size="sm" />
          <span className="font-display font-semibold text-sm">
            {profile?.username || "Cargando..."}
          </span>
          {isAnonymous && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Invitado</span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <div className="w-full max-w-4xl relative z-10">
        <div className="grid md:grid-cols-3 gap-5">
          {/* Left - Friends */}
          <div className="md:col-span-1 space-y-5">
            {user && !isAnonymous && <FriendsList user={user} />}
            {isAnonymous && (
              <div className="card-game border-border p-5 text-center space-y-3">
                <Skull className="w-8 h-8 text-primary mx-auto" />
                <p className="text-muted-foreground text-sm">
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

          {/* Right - Actions */}
          <div className="md:col-span-2 space-y-5">
            {/* Stats */}
            {profile && (
              <div className="card-game border-border p-5 animate-slide-up">
                <div className="flex justify-around text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Target className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-display font-bold">{profile.games_played}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Partidas</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-safe/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-safe" />
                    </div>
                    <p className="text-xl font-display font-bold text-safe">{profile.games_won}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Victorias</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                      <span className="text-gold font-display font-bold text-sm">%</span>
                    </div>
                    <p className="text-xl font-display font-bold text-gold">{winRate}%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
                  </div>
                </div>
              </div>
            )}

            {/* Create Lobby */}
            <div className="card-game border-border p-6 animate-slide-up space-y-4" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: "var(--gradient-safe)",
                  boxShadow: "var(--shadow-glow-green)",
                }}>
                  <Plus className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Crear Sala</h3>
                  <p className="text-xs text-muted-foreground">Crea una nueva sala y comparte el código</p>
                </div>
              </div>
              <Button
                className="w-full btn-safe py-5 text-base"
                onClick={handleCreateLobby}
                disabled={loading}
              >
                <Users className="w-4 h-4 mr-2" />
                Crear Nueva Sala
              </Button>
            </div>

            {/* Join Lobby */}
            <div className="card-game border-border p-6 animate-slide-up space-y-4" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: "var(--gradient-impostor)",
                  boxShadow: "var(--shadow-glow-red)",
                }}>
                  <LogIn className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Unirse a Sala</h3>
                  <p className="text-xs text-muted-foreground">Ingresa el código de la sala</p>
                </div>
              </div>
              <Input
                placeholder="CÓDIGO"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                className="bg-muted/50 border-border text-center text-xl font-mono tracking-[0.3em] h-14 rounded-xl"
                maxLength={6}
              />
              <Button
                className="w-full btn-impostor py-5 text-base"
                onClick={handleJoinLobby}
                disabled={loading || !lobbyCode.trim()}
              >
                Unirse a la Sala
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
