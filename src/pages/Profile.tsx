import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Trophy, Gamepad2, Target, Pencil } from "lucide-react";
import { toast } from "sonner";
import CrewAvatar from "@/components/game/CrewAvatar";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  username: string;
  games_played: number | null;
  games_won: number | null;
  avatar_url: string | null;
  created_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, games_played, games_won, avatar_url, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setNewUsername(data.username);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !newUsername.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      setProfile((prev) => prev ? { ...prev, username: newUsername.trim() } : prev);
      setEditing(false);
      toast.success("Nombre actualizado");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const winRate = profile?.games_played
    ? Math.round(((profile.games_won || 0) / profile.games_played) * 100)
    : 0;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long" })
    : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center space-bg">
        <div className="stars" />
        <p className="text-muted-foreground font-display animate-pulse">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-bg">
      <div className="stars" />
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        {/* Profile Card */}
        <Card className="card-game border-border overflow-hidden">
          {/* Header banner */}
          <div
            className="h-28 relative"
            style={{ background: "var(--gradient-mystery)" }}
          >
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
              <div className="rounded-full border-4 border-card">
                <CrewAvatar name={profile?.username || "?"} size="lg" />
              </div>
            </div>
          </div>

          <CardHeader className="pt-14 text-center">
            {editing ? (
              <div className="flex items-center gap-2 max-w-xs mx-auto">
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  maxLength={20}
                  className="bg-muted/50 border-border text-center font-display text-lg h-12 rounded-xl"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="btn-safe h-12 w-12 shrink-0"
                  onClick={handleSave}
                  disabled={saving || !newUsername.trim()}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="font-display text-2xl">
                  {profile?.username}
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            {memberSince && (
              <p className="text-xs text-muted-foreground mt-1">
                Miembro desde {memberSince}
              </p>
            )}
            {user?.is_anonymous && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] bg-muted text-muted-foreground mt-2">
                Invitado
              </span>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pb-8">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<Gamepad2 className="w-5 h-5" />}
                value={profile?.games_played ?? 0}
                label="Partidas"
                color="safe"
              />
              <StatCard
                icon={<Trophy className="w-5 h-5" />}
                value={profile?.games_won ?? 0}
                label="Victorias"
                color="gold"
              />
              <StatCard
                icon={<Target className="w-5 h-5" />}
                value={`${winRate}%`}
                label="Tasa de victoria"
                color="impostor"
              />
            </div>

            {/* Upgrade CTA for anonymous users */}
            {user?.is_anonymous && (
              <Button
                className="w-full btn-impostor py-5 text-base mt-4"
                onClick={() => navigate("/auth")}
              >
                Crear cuenta para guardar progreso
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: "safe" | "gold" | "impostor";
}

const StatCard = ({ icon, value, label, color }: StatCardProps) => {
  const colorMap = {
    safe: "text-safe bg-safe/10",
    gold: "text-gold bg-gold/10",
    impostor: "text-impostor bg-primary/10",
  };

  return (
    <div className="card-game p-4 text-center border border-border">
      <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="font-display text-xl font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
};

export default Profile;
