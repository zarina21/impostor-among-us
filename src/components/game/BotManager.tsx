import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bot, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

const BOT_NAMES = [
  "RoBot_X",
  "CyberBot",
  "NeonBot",
  "PixelBot",
  "GlitchBot",
  "ShadowBot",
  "TurboBot",
  "ZenBot",
  "NovaBot",
  "VortexBot",
];

interface BotManagerProps {
  lobbyId: string;
  currentPlayerCount: number;
  maxPlayers: number;
  botCount: number;
  isHost: boolean;
  onRefresh: () => void;
}

const BotManager = ({
  lobbyId,
  currentPlayerCount,
  maxPlayers,
  botCount,
  isHost,
  onRefresh,
}: BotManagerProps) => {
  const [loading, setLoading] = useState(false);

  const getRandomBotName = async (): Promise<string> => {
    // Get existing bot names in the lobby
    const { data: existingBots } = await supabase
      .from("lobby_players")
      .select("bot_name")
      .eq("lobby_id", lobbyId)
      .eq("is_bot", true);

    const usedNames = existingBots?.map((b) => b.bot_name) || [];
    const availableNames = BOT_NAMES.filter((n) => !usedNames.includes(n));

    if (availableNames.length > 0) {
      return availableNames[Math.floor(Math.random() * availableNames.length)];
    }

    // If all names are used, add a number
    return `Bot_${Math.floor(Math.random() * 1000)}`;
  };

  const handleAddBot = async () => {
    if (currentPlayerCount >= maxPlayers) {
      toast.error("La sala está llena");
      return;
    }

    setLoading(true);
    try {
      const botName = await getRandomBotName();
      
      // Create a fake UUID for the bot (using a recognizable prefix)
      const botUserId = crypto.randomUUID();

      const { error } = await supabase.from("lobby_players").insert({
        lobby_id: lobbyId,
        user_id: botUserId,
        is_bot: true,
        bot_name: botName,
        is_ready: true, // Bots are always ready
      });

      if (error) throw error;

      toast.success(`${botName} se unió a la sala`);
      onRefresh();
    } catch (error: any) {
      console.error("Error adding bot:", error);
      toast.error("Error al añadir bot");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBot = async () => {
    if (botCount === 0) return;

    setLoading(true);
    try {
      // Get one bot to remove
      const { data: bots } = await supabase
        .from("lobby_players")
        .select("id, bot_name")
        .eq("lobby_id", lobbyId)
        .eq("is_bot", true)
        .limit(1);

      if (bots && bots.length > 0) {
        const { error } = await supabase
          .from("lobby_players")
          .delete()
          .eq("id", bots[0].id);

        if (error) throw error;

        toast.success(`${bots[0].bot_name} salió de la sala`);
        onRefresh();
      }
    } catch (error: any) {
      console.error("Error removing bot:", error);
      toast.error("Error al quitar bot");
    } finally {
      setLoading(false);
    }
  };

  if (!isHost) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border">
      <Bot className="w-5 h-5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground flex-1">
        Bots: <span className="font-semibold text-foreground">{botCount}</span>
      </span>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={handleRemoveBot}
          disabled={loading || botCount === 0}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={handleAddBot}
          disabled={loading || currentPlayerCount >= maxPlayers}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default BotManager;
