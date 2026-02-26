import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, LogIn, Gamepad2, Skull } from "lucide-react";
import { toast } from "sonner";

interface StartMenuProps {
  onClose?: () => void;
}

const StartMenu = ({ onClose }: StartMenuProps) => {
  const [mode, setMode] = useState<"menu" | "guest" | "login">("menu");
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGuestPlay = async () => {
    if (!guestName.trim()) {
      toast.error("Ingresa un nombre para continuar");
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      
      if (data.user) {
        // Create profile for the guest with their chosen name
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            user_id: data.user.id,
            username: guestName.trim(),
            games_played: 0,
            games_won: 0,
          }, { onConflict: 'user_id' });
          
        if (profileError) {
          throw profileError;
        }
        
        toast.success(`¡Bienvenido, ${guestName}!`);
        navigate("/lobby");
      }
    } catch (error: any) {
      toast.error(error.message || "Error al iniciar como invitado");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => navigate("/auth?mode=login");
  const handleGoToRegister = () => navigate("/auth");

  if (mode === "guest") {
    return (
      <Card className="card-game border-border w-full max-w-md animate-bounce-in">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{
            background: "var(--gradient-safe)",
            boxShadow: "var(--shadow-glow-green)",
          }}>
            <Gamepad2 className="w-10 h-10 text-accent-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Jugar como Invitado</CardTitle>
          <CardDescription>Elige tu nombre — es lo que verán los demás</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Tu nombre en el juego"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-muted/50 border-border text-center text-lg h-14 rounded-xl font-display"
            maxLength={20}
            autoFocus
          />
          <Button 
            className="w-full btn-safe py-5 text-base" 
            onClick={handleGuestPlay}
            disabled={loading || !guestName.trim()}
          >
            {loading ? "Cargando..." : "¡A jugar!"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-muted-foreground"
            onClick={() => setMode("menu")}
          >
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mode === "login") {
    return (
      <Card className="card-game border-border w-full max-w-md animate-bounce-in">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{
            background: "var(--gradient-impostor)",
            boxShadow: "var(--shadow-glow-red)",
          }}>
            <Users className="w-10 h-10 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">Cuenta de Usuario</CardTitle>
          <CardDescription>Guarda tu progreso y añade amigos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full btn-impostor py-5 text-base" onClick={handleGoToLogin}>
            <LogIn className="w-4 h-4 mr-2" />
            Iniciar Sesión
          </Button>
          <Button 
            variant="outline"
            className="w-full border-border hover:bg-muted py-5 text-base rounded-2xl" 
            onClick={handleGoToRegister}
          >
            <User className="w-4 h-4 mr-2" />
            Crear Cuenta
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setMode("menu")}>
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-game border-border w-full max-w-md animate-bounce-in">
      <CardHeader className="text-center">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{
          background: "var(--gradient-mystery)",
          boxShadow: "var(--shadow-glow-purple)",
        }}>
          <Skull className="w-10 h-10 text-primary-foreground" />
        </div>
        <CardTitle className="font-display text-2xl">¿Cómo quieres jugar?</CardTitle>
        <CardDescription>Elige una opción para continuar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          className="w-full btn-safe h-16 text-lg rounded-2xl" 
          onClick={() => setMode("guest")}
        >
          <Gamepad2 className="w-5 h-5 mr-2" />
          Jugar como Invitado
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground font-display">o</span>
          </div>
        </div>
        <Button 
          variant="outline"
          className="w-full h-16 text-lg border-border hover:bg-muted rounded-2xl" 
          onClick={() => setMode("login")}
        >
          <LogIn className="w-5 h-5 mr-2" />
          Iniciar Sesión / Registrarse
        </Button>
      </CardContent>
    </Card>
  );
};

export default StartMenu;
