import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

interface VotingTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
}

const VotingTimer = ({ totalSeconds, onTimeUp, isActive }: VotingTimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`;

  const isUrgent = remaining <= 10;
  const isWarning = remaining <= 30 && !isUrgent;

  // Circle SVG parameters
  const size = 80;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={
              isUrgent
                ? "hsl(var(--primary))"
                : isWarning
                ? "hsl(var(--gold, 45 93% 47%))"
                : "hsl(var(--safe, 142 71% 45%))"
            }
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono font-bold text-lg ${
              isUrgent
                ? "text-primary animate-pulse"
                : isWarning
                ? "text-gold"
                : "text-foreground"
            }`}
          >
            {timeStr}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Clock className="w-3 h-3" />
        <span>Votación</span>
      </div>
    </div>
  );
};

export default VotingTimer;
