import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Eye, MessageCircle, Vote, Trophy } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center px-4 py-16 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-mystery/20 to-transparent rounded-full blur-3xl animate-pulse-slow" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
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

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Link to="/auth">
              <Button size="lg" className="btn-impostor text-lg px-8 py-6 w-full sm:w-auto">
                Comenzar a Jugar
              </Button>
            </Link>
            <Link to="/auth?mode=login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-border hover:bg-muted w-full sm:w-auto">
                Ya tengo cuenta
              </Button>
            </Link>
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
