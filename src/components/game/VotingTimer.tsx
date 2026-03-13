import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

const playBeep = (frequency: number, duration: number, volume = 0.15) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "square";
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {}
};

const playTick = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
    osc.onended = () => ctx.close();
  } catch {}
};

const playTimeUpSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    [440, 330, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = freq;
      osc.type = "square";
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.15);
      if (i === 2) osc.onended = () => ctx.close();
    });
  } catch {}
};

interface VotingTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isActive: boolean;
  label?: string;
}

const VotingTimer = ({ totalSeconds, onTimeUp, isActive, label = "Votación" }: VotingTimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  const alertsPlayedRef = useRef<Set<number>>(new Set());
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setRemaining(totalSeconds);
    alertsPlayedRef.current = new Set();
  }, [totalSeconds]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          playTimeUpSound();
          onTimeUpRef.current();
          return 0;
        }
        // Tick sound every second in the last 10 seconds
        if (prev <= 11) {
          playTick();
        }
        if (prev === 11 && !alertsPlayedRef.current.has(10)) {
          alertsPlayedRef.current.add(10);
          playBeep(880, 0.15);
        }
        if (prev === 6 && !alertsPlayedRef.current.has(5)) {
          alertsPlayedRef.current.add(5);
          playBeep(440, 0.25, 0.2);
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
        <span>{label}</span>
      </div>
    </div>
  );
};

export default VotingTimer;
