import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "hsl(0 72% 51%)",    // Red
  "hsl(210 80% 50%)",  // Blue
  "hsl(120 60% 40%)",  // Green
  "hsl(45 95% 55%)",   // Yellow
  "hsl(280 60% 50%)",  // Purple
  "hsl(30 90% 55%)",   // Orange
  "hsl(185 70% 50%)",  // Cyan
  "hsl(330 70% 55%)",  // Pink
  "hsl(0 0% 70%)",     // White/Gray
  "hsl(160 50% 35%)",  // Dark Green
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface CrewAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  isImpostor?: boolean;
  isEliminated?: boolean;
  isBot?: boolean;
  className?: string;
}

const CrewAvatar = ({ name, size = "md", isImpostor, isEliminated, isBot, className }: CrewAvatarProps) => {
  const color = getColorForName(name);
  const initial = name.charAt(0).toUpperCase();

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-xl",
    xl: "w-20 h-20 text-3xl",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-display font-bold select-none transition-all duration-300",
        sizeClasses[size],
        isEliminated && "opacity-40 grayscale",
        className
      )}
      style={{
        backgroundColor: color,
        boxShadow: isImpostor ? `0 0 20px ${color}` : `0 0 10px ${color}40`,
      }}
    >
      {/* Visor */}
      <div
        className="absolute rounded-full visor"
        style={{
          width: "55%",
          height: "40%",
          top: "20%",
          right: "10%",
        }}
      />
      <span className="relative z-10 text-white drop-shadow-md">{initial}</span>
      {isBot && (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-muted border-2 border-background flex items-center justify-center">
          <span className="text-[8px]">🤖</span>
        </div>
      )}
    </div>
  );
};

export default CrewAvatar;
