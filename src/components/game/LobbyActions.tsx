import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreVertical, UserMinus, Crown, Ban } from "lucide-react";
import { toast } from "sonner";

interface LobbyActionsProps {
  playerId: string;
  playerUserId: string;
  playerUsername: string;
  lobbyId: string;
  isHost: boolean;
  onRefresh: () => void;
}

const LobbyActions = ({
  playerId,
  playerUserId,
  playerUsername,
  lobbyId,
  isHost,
  onRefresh,
}: LobbyActionsProps) => {
  const [showKickDialog, setShowKickDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKickPlayer = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("lobby_players")
        .delete()
        .eq("id", playerId);

      if (error) throw error;

      toast.success(`${playerUsername} ha sido expulsado de la sala`);
      setShowKickDialog(false);
      onRefresh();
    } catch (error: any) {
      toast.error("Error al expulsar jugador");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferHost = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("lobbies")
        .update({ host_id: playerUserId })
        .eq("id", lobbyId);

      if (error) throw error;

      toast.success(`${playerUsername} ahora es el anfitrión`);
      setShowTransferDialog(false);
      onRefresh();
    } catch (error: any) {
      toast.error("Error al transferir anfitrión");
    } finally {
      setLoading(false);
    }
  };

  if (!isHost) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border">
          <DropdownMenuItem
            onClick={() => setShowTransferDialog(true)}
            className="cursor-pointer"
          >
            <Crown className="w-4 h-4 mr-2 text-gold" />
            Transferir anfitrión
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowKickDialog(true)}
            className="cursor-pointer text-primary focus:text-primary"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Expulsar jugador
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Kick Player Dialog */}
      <Dialog open={showKickDialog} onOpenChange={setShowKickDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-primary" />
              Expulsar jugador
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres expulsar a{" "}
              <span className="font-semibold text-foreground">{playerUsername}</span>{" "}
              de la sala?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowKickDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="btn-impostor"
              onClick={handleKickPlayer}
              disabled={loading}
            >
              {loading ? "Expulsando..." : "Expulsar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Host Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" />
              Transferir anfitrión
            </DialogTitle>
            <DialogDescription>
              ¿Quieres hacer a{" "}
              <span className="font-semibold text-foreground">{playerUsername}</span>{" "}
              el nuevo anfitrión de la sala?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowTransferDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="btn-safe"
              onClick={handleTransferHost}
              disabled={loading}
            >
              {loading ? "Transfiriendo..." : "Transferir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LobbyActions;
