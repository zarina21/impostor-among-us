import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Settings, Clock, RotateCcw, Trophy, Swords, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  words: string[];
}

interface GameSettings {
  voting_time_seconds: number;
  total_rounds: number;
  points_to_win: number;
  impostor_points_per_round: number;
  crewmate_points_for_catch: number;
  category_id: string | null;
}

interface LobbySettingsProps {
  lobbyId: string;
  isHost: boolean;
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onSettingsChange: (settings: GameSettings) => void;
}

const DEFAULT_SETTINGS: GameSettings = {
  voting_time_seconds: 60,
  total_rounds: 10,
  points_to_win: 10,
  impostor_points_per_round: 1,
  crewmate_points_for_catch: 1,
  category_id: null,
};

const LobbySettings = ({
  lobbyId,
  isHost,
  categories,
  selectedCategory,
  onCategoryChange,
  onSettingsChange,
}: LobbySettingsProps) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("game_settings")
        .select("*")
        .eq("lobby_id", lobbyId)
        .maybeSingle();

      if (data) {
        const s: GameSettings = {
          voting_time_seconds: data.voting_time_seconds ?? 60,
          total_rounds: data.total_rounds ?? 10,
          points_to_win: data.points_to_win,
          impostor_points_per_round: data.impostor_points_per_round,
          crewmate_points_for_catch: data.crewmate_points_for_catch,
          category_id: data.category_id ?? null,
        };
        setSettings(s);
        onSettingsChange(s);
        if (s.category_id) onCategoryChange(s.category_id);
      } else if (isHost) {
        // Create default settings
        const { data: created } = await supabase
          .from("game_settings")
          .insert({ lobby_id: lobbyId })
          .select()
          .single();
        if (created) {
          onSettingsChange(DEFAULT_SETTINGS);
        }
      }
    };
    fetchSettings();
  }, [lobbyId]);

  const updateSetting = async <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);

    if (key === "category_id") {
      onCategoryChange(value as string | null);
    }

    setSaving(true);
    await supabase
      .from("game_settings")
      .update({ [key]: value })
      .eq("lobby_id", lobbyId);
    setSaving(false);
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="w-full space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="font-display font-semibold text-sm">Configuración</span>
          {saving && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Guardando...</span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4 animate-slide-up">
          {/* Category */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-display uppercase tracking-wider flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5" />
              Modo de juego
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => isHost && updateSetting("category_id", null)}
                className={`text-xs ${selectedCategory === null ? "btn-safe" : "border-border"} ${!isHost ? "pointer-events-none" : ""}`}
              >
                Todas
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => isHost && updateSetting("category_id", cat.id)}
                  className={`text-xs ${selectedCategory === cat.id ? "btn-impostor" : "border-border"} ${!isHost ? "pointer-events-none" : ""}`}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Voting Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Tiempo de votación
              </p>
              <span className="text-sm font-display font-bold text-foreground">
                {formatTime(settings.voting_time_seconds)}
              </span>
            </div>
            {isHost ? (
              <Slider
                value={[settings.voting_time_seconds]}
                onValueChange={([v]) => updateSetting("voting_time_seconds", v)}
                min={15}
                max={180}
                step={15}
                className="w-full"
              />
            ) : (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/50"
                  style={{ width: `${(settings.voting_time_seconds / 180) * 100}%` }}
                />
              </div>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>15s</span>
              <span>3m</span>
            </div>
          </div>

          {/* Points to Win */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Puntos para ganar
              </p>
              <span className="text-sm font-display font-bold text-gold">
                {settings.points_to_win}
              </span>
            </div>
            {isHost ? (
              <Slider
                value={[settings.points_to_win]}
                onValueChange={([v]) => updateSetting("points_to_win", v)}
                min={5}
                max={30}
                step={1}
                className="w-full"
              />
            ) : (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold/50"
                  style={{ width: `${(settings.points_to_win / 30) * 100}%` }}
                />
              </div>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5</span>
              <span>30</span>
            </div>
          </div>

          {/* Impostor Points per Round */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-wider flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5" />
                Pts impostor / ronda
              </p>
              <span className="text-sm font-display font-bold text-primary">
                {settings.impostor_points_per_round}
              </span>
            </div>
            {isHost ? (
              <Slider
                value={[settings.impostor_points_per_round]}
                onValueChange={([v]) => updateSetting("impostor_points_per_round", v)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            ) : (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/50"
                  style={{ width: `${(settings.impostor_points_per_round / 5) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Crewmate Points for Catch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-display uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Pts tripulante al atrapar
              </p>
              <span className="text-sm font-display font-bold text-safe">
                {settings.crewmate_points_for_catch}
              </span>
            </div>
            {isHost ? (
              <Slider
                value={[settings.crewmate_points_for_catch]}
                onValueChange={([v]) => updateSetting("crewmate_points_for_catch", v)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            ) : (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-safe/50"
                  style={{ width: `${(settings.crewmate_points_for_catch / 5) * 100}%` }}
                />
              </div>
            )}
          </div>

          {!isHost && (
            <p className="text-[10px] text-muted-foreground text-center italic">
              Solo el anfitrión puede modificar la configuración
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LobbySettings;
