import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, Eye, MessageCircle, Vote, LogOut, User, Plus, LogIn } from "lucide-react";
import StartMenu from "@/components/game/StartMenu";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  username: string;
  games_played: number;
  games_won: number;
}

const Index = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const handleCreateLobby = () => {
    navigate("/lobby");
  };

  const isAnonymous = user?.is_anonymous;

  return (
    <div className="min-h-screen flex flex-col">
      {/* User header when logged in */}
      {user && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
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
      )}

      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-mystery/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {showStartMenu ? (
            <div className="flex flex-col items-center">
              <StartMenu />
              <Button 
                variant="ghost" 
                className="mt-4 text-muted-foreground"
                onClick={() => setShowStartMenu(false)}
              >
                Volver al inicio
              </Button>
            </div>
          ) : (
            <>
              {/* Logo/Title */}
              <div className="animate-float mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-pink-600 mb-6 shadow-lg" style={{ boxShadow: "var(--shadow-glow-red)" }}>
                  <Eye className="w-12 h-12 text-primary-foreground" />
                </div>
              </div>

              <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 text-glow-red animate-slide-up">
                Adivina el <span className="text-primary">Impostor</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
                ¿Podrás descubrir quién es el impostor antes de que sea demasiado tarde?
              </p>

              {/* CTA Buttons based on auth state */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                {checkingAuth ? (
                  <Button size="lg" className="btn-impostor text-lg px-8 py-6" disabled>
                    Cargando...
                  </Button>
                ) : user ? (
                  // Logged in user options
                  <>
                    <Button size="lg" className="btn-safe text-lg px-8 py-6" onClick={handleCreateLobby}>
                      <Plus className="w-5 h-5 mr-2" />
                      Crear / Unirse a Sala
                    </Button>
                    {isAnonymous && (
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="text-lg px-8 py-6 border-border hover:bg-muted"
                        onClick={() => navigate("/auth")}
                      >
                        <LogIn className="w-5 h-5 mr-2" />
                        Crear Cuenta Permanente
                      </Button>
                    )}
                  </>
                ) : (
                  // Not logged in
                  <Button 
                    size="lg" 
                    className="btn-impostor text-lg px-8 py-6"
                    onClick={() => setShowStartMenu(true)}
                  >
                    Comenzar a Jugar
                  </Button>
                )}
              </div>

              {/* How to Play */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <HowToPlayCard
                  icon={<Users className="w-8 h-8" />}
                  title="Únete"
                  description="5-8 jugadores reciben una palabra secreta"
                  color="safe"
                />
                <HowToPlayCard
                  icon={<Eye className="w-8 h-8" />}
                  title="Impostor"
                  description="Uno o más no conocen la palabra"
                  color="impostor"
                />
                <HowToPlayCard
                  icon={<MessageCircle className="w-8 h-8" />}
                  title="Pistas"
                  description="Da pistas sin revelar demasiado"
                  color="mystery"
                />
                <HowToPlayCard
                  icon={<Vote className="w-8 h-8" />}
                  title="Vota"
                  description="Elimina al impostor para ganar"
                  color="gold"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-muted-foreground text-sm border-t border-border">
        <p>Un juego de deducción social para jugar con amigos</p>
      </footer>
    </div>
  );
};

interface HowToPlayCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "safe" | "impostor" | "mystery" | "gold";
}

const HowToPlayCard = ({ icon, title, description, color }: HowToPlayCardProps) => {
  const colorClasses = {
    safe: "text-safe border-safe/30 hover:border-safe/50",
    impostor: "text-impostor border-impostor/30 hover:border-impostor/50",
    mystery: "text-mystery border-mystery/30 hover:border-mystery/50",
    gold: "text-gold border-gold/30 hover:border-gold/50",
  };

  return (
    <div className={`card-game p-6 border-2 ${colorClasses[color]} transition-all duration-300 hover:-translate-y-1`}>
      <div className="mb-3">{icon}</div>
      <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
