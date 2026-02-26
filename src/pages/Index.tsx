import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, Eye, MessageCircle, Vote, LogOut, User, Plus, LogIn, Shield, Skull } from "lucide-react";
import StartMenu from "@/components/game/StartMenu";
import CrewAvatar from "@/components/game/CrewAvatar";
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
      setCheckingAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) fetchProfile(session.user.id);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, games_played, games_won")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAnonymous = user?.is_anonymous;

  return (
    <div className="min-h-screen flex flex-col space-bg">
      <div className="stars" />

      {/* User header */}
      {user && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 card-game px-3 py-2">
            <CrewAvatar name={profile?.username || "?"} size="sm" />
            <span className="font-display font-semibold text-sm">
              {profile?.username || "Cargando..."}
            </span>
            {isAnonymous && (
              <Badge className="text-[10px] h-4 px-1.5 bg-muted text-muted-foreground">
                Invitado
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {showStartMenu ? (
            <div className="flex flex-col items-center animate-bounce-in">
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
              {/* Logo */}
              <div className="animate-float mb-8">
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full mb-6" style={{
                  background: "var(--gradient-impostor)",
                  boxShadow: "0 0 60px hsl(0 72% 51% / 0.4), 0 0 120px hsl(0 72% 51% / 0.15)",
                }}>
                  <Eye className="w-14 h-14 text-primary-foreground" />
                </div>
              </div>

              <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 text-glow-red animate-slide-up">
                Adivina el <span className="text-primary">Impostor</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
                ¿Podrás descubrir quién es el impostor antes de que sea demasiado tarde?
              </p>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                {checkingAuth ? (
                  <Button size="lg" className="btn-impostor text-lg px-8 py-6" disabled>
                    Cargando...
                  </Button>
                ) : user ? (
                  <>
                    <Button size="lg" className="btn-safe text-lg px-10 py-7 rounded-2xl" onClick={() => navigate("/lobby")}>
                      <Plus className="w-5 h-5 mr-2" />
                      Crear / Unirse a Sala
                    </Button>
                    {isAnonymous && (
                      <Button
                        size="lg"
                        variant="outline"
                        className="text-lg px-8 py-7 border-border hover:bg-muted rounded-2xl"
                        onClick={() => navigate("/auth")}
                      >
                        <LogIn className="w-5 h-5 mr-2" />
                        Crear Cuenta
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    size="lg"
                    className="btn-impostor text-lg px-10 py-7 rounded-2xl"
                    onClick={() => setShowStartMenu(true)}
                  >
                    <Skull className="w-5 h-5 mr-2" />
                    Comenzar a Jugar
                  </Button>
                )}
              </div>

              {/* How to Play - Among Us style */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left animate-fade-in" style={{ animationDelay: "0.3s" }}>
                <StepCard
                  step={1}
                  icon={<Users className="w-7 h-7" />}
                  title="Únete"
                  description="3-8 jugadores reciben una palabra secreta"
                  color="safe"
                />
                <StepCard
                  step={2}
                  icon={<Skull className="w-7 h-7" />}
                  title="Impostor"
                  description="Uno o más no conocen la palabra"
                  color="impostor"
                />
                <StepCard
                  step={3}
                  icon={<MessageCircle className="w-7 h-7" />}
                  title="Pistas"
                  description="Da pistas sin revelar demasiado"
                  color="mystery"
                />
                <StepCard
                  step={4}
                  icon={<Vote className="w-7 h-7" />}
                  title="Vota"
                  description="Atrapa al impostor y gana puntos"
                  color="gold"
                />
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="py-6 text-center text-muted-foreground text-xs border-t border-border/50 relative z-10">
        <p>Un juego de deducción social para jugar con amigos 🚀</p>
      </footer>
    </div>
  );
};

// Badge component inline for the page
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${className}`}>
    {children}
  </span>
);

interface StepCardProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "safe" | "impostor" | "mystery" | "gold";
}

const StepCard = ({ step, icon, title, description, color }: StepCardProps) => {
  const colorMap = {
    safe: { text: "text-safe", border: "border-safe/20 hover:border-safe/40", bg: "bg-safe/10", glow: "var(--shadow-glow-green)" },
    impostor: { text: "text-impostor", border: "border-impostor/20 hover:border-impostor/40", bg: "bg-primary/10", glow: "var(--shadow-glow-red)" },
    mystery: { text: "text-mystery", border: "border-mystery/20 hover:border-mystery/40", bg: "bg-secondary/10", glow: "var(--shadow-glow-purple)" },
    gold: { text: "text-gold", border: "border-gold/20 hover:border-gold/40", bg: "bg-gold/10", glow: "" },
  };
  const c = colorMap[color];

  return (
    <div className={`card-game p-5 border ${c.border} transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center text-xs font-display font-bold ${c.text}`}>
          {step}
        </div>
        <div className={c.text}>{icon}</div>
      </div>
      <h3 className="font-display text-base font-semibold mb-1 text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
};

export default Index;
