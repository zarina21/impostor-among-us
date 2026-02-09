import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import PlayerCard from "@/components/game/PlayerCard";
import InviteFriends from "@/components/game/InviteFriends";
import BotManager from "@/components/game/BotManager";
import CluePhase from "@/components/game/CluePhase";
import Scoreboard from "@/components/game/Scoreboard";
import RoundResults from "@/components/game/RoundResults";
import GameWinner from "@/components/game/GameWinner";
import { useFriendships } from "@/hooks/useFriendships";
import { useTurnSystem } from "@/hooks/useTurnSystem";
import { useBotTurnManager } from "@/hooks/useBotTurnManager";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  is_eliminated: boolean;
  is_ready: boolean;
  is_bot: boolean;
  bot_name: string | null;
  points: number;
  profiles: {
    username: string;
  };
}

interface PointChange {
  playerId: string;
  pointsGained: number;
  reason: string;
}

interface Lobby {
  id: string;
  code: string;
  host_id: string;
  status: string;
  min_players: number;
  max_players: number;
  current_round: number;
  secret_word: string | null;
  impostor_count: number;
}

interface Clue {
  id: string;
  round: number;
  user_id: string;
  clue: string;
  profiles?: {
    username: string;
  };
}

interface VoteData {
  voted_for_id: string;
  voter_id: string;
}

const Game = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<"waiting" | "clue" | "voting" | "results" | "finished">("waiting");
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [pointsToWin] = useState(10);
  const [pointChanges, setPointChanges] = useState<PointChange[]>([]);
  const [impostorCaught, setImpostorCaught] = useState(false);
  const [caughtImpostor, setCaughtImpostor] = useState<Player | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const { getFriendStatus } = useFriendships(user);

  // Turn system hook
  const { isMyTurn, currentTurnPlayer, turnOrder, allCluesSubmitted } = useTurnSystem({
    players,
    clues,
    currentRound: lobby?.current_round || 0,
    currentUserId: user?.id,
  });

  // Bot turn manager - automatically triggers bot turns
  useBotTurnManager({
    players,
    clues,
    currentRound: lobby?.current_round || 0,
    lobbyId: lobby?.id,
    gamePhase,
  });

  // Fetch game data
  const fetchGameData = useCallback(async () => {
    if (!code || !user) return;

    // Fetch lobby
    const { data: lobbyData, error: lobbyError } = await supabase
      .from("lobbies")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (lobbyError || !lobbyData) {
      toast.error("Sala no encontrada");
      navigate("/lobby");
      return;
    }

    setLobby(lobbyData);

    // Fetch players (including bot fields and points)
    const { data: playersData } = await supabase
      .from("lobby_players")
      .select("id, user_id, is_impostor, is_eliminated, is_ready, is_bot, bot_name, points")
      .eq("lobby_id", lobbyData.id);

    if (playersData && playersData.length > 0) {
      // Separate bots and real players
      const realPlayerIds = playersData
        .filter((p) => !p.is_bot)
        .map((p) => p.user_id);

      // Fetch profiles only for real players
      let profilesMap = new Map<string, string>();
      if (realPlayerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", realPlayerIds);

        profilesMap = new Map(
          profilesData?.map((p) => [p.user_id, p.username]) || []
        );
      }

      const formattedPlayers = playersData.map((p) => ({
        ...p,
        is_bot: p.is_bot || false,
        bot_name: p.bot_name || null,
        points: p.points || 0,
        profiles: {
          username: p.is_bot
            ? p.bot_name || "Bot"
            : profilesMap.get(p.user_id) || "Jugador",
        },
      }));
      setPlayers(formattedPlayers);
      setMyPlayer(formattedPlayers.find((p: Player) => p.user_id === user.id) || null);
    } else {
      setPlayers([]);
      setMyPlayer(null);
    }

    // Fetch clues for current round
    let fetchedClues: typeof clues = [];
    let fetchedVotes: typeof votes = [];
    
    if (lobbyData.current_round > 0) {
      const { data: cluesData } = await supabase
        .from("round_clues")
        .select("id, round, user_id, clue")
        .eq("lobby_id", lobbyData.id)
        .eq("round", lobbyData.current_round);

      if (cluesData && cluesData.length > 0) {
        // Fetch profiles for clue authors
        const clueUserIds = cluesData.map((c) => c.user_id);
        const { data: clueProfilesData } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", clueUserIds);

        const clueProfilesMap = new Map(
          clueProfilesData?.map((p) => [p.user_id, p.username]) || []
        );

        fetchedClues = cluesData.map((c) => ({
          ...c,
          profiles: { username: clueProfilesMap.get(c.user_id) || "Jugador" },
        }));
        setClues(fetchedClues);
      } else {
        setClues([]);
      }

      // Fetch votes
      const { data: votesData } = await supabase
        .from("votes")
        .select("voted_for_id, voter_id")
        .eq("lobby_id", lobbyData.id)
        .eq("round", lobbyData.current_round);

      if (votesData) {
        fetchedVotes = votesData;
        setVotes(votesData);
        const myVoteData = votesData.find((v) => v.voter_id === user.id);
        if (myVoteData) {
          setMyVote(myVoteData.voted_for_id);
        }
      }
    }

    // Determine game phase based on turn system
    if (lobbyData.status === "waiting") {
      setGamePhase("waiting");
    } else if (lobbyData.status === "finished") {
      setGamePhase("finished");
    } else if (lobbyData.status === "playing") {
      // Get active players for this round
      const activePlayersInRound = playersData?.filter(
        (p) => !p.is_eliminated && p.is_ready
      ) || [];
      
      // Check if all active players have submitted clues
      const allPlayersSubmittedClues = activePlayersInRound.every((p) =>
        fetchedClues.some((c) => c.user_id === p.user_id)
      );

      if (!allPlayersSubmittedClues) {
        // Still in clue phase (turn-based)
        setGamePhase("clue");
      } else {
        // All clues submitted, check voting
        const myVoteExists = fetchedVotes.find((v) => v.voter_id === user.id);
        if (!myVoteExists) {
          setGamePhase("voting");
        } else {
          setGamePhase("results");
        }
      }
    }

    setLoading(false);
  }, [code, user, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });
  }, [navigate]);

  useEffect(() => {
    if (user && code) {
      fetchGameData();
    }
  }, [user, code, fetchGameData]);

  // Setup realtime subscription
  useEffect(() => {
    if (!lobby) return;

    const realtimeChannel = supabase
      .channel(`game-${lobby.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobby_players", filter: `lobby_id=eq.${lobby.id}` },
        () => fetchGameData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobbies", filter: `id=eq.${lobby.id}` },
        () => fetchGameData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_clues", filter: `lobby_id=eq.${lobby.id}` },
        () => fetchGameData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes", filter: `lobby_id=eq.${lobby.id}` },
        () => fetchGameData()
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [lobby?.id, fetchGameData]);

  const handleReady = async () => {
    if (!myPlayer) return;

    await supabase
      .from("lobby_players")
      .update({ is_ready: !myPlayer.is_ready })
      .eq("id", myPlayer.id);
  };

  const handleStartGame = async () => {
    if (!lobby || !user || lobby.host_id !== user.id) return;

    const readyPlayers = players.filter((p) => p.is_ready);
    if (readyPlayers.length < lobby.min_players) {
      toast.error(`Se necesitan al menos ${lobby.min_players} jugadores listos`);
      return;
    }

    // Get random word
    const { data: categories } = await supabase
      .from("word_categories")
      .select("words");

    if (!categories || categories.length === 0) {
      toast.error("Error al obtener palabras");
      return;
    }

    const allWords = categories.flatMap((c) => c.words);
    const randomWord = allWords[Math.floor(Math.random() * allWords.length)];

    // Assign impostors randomly
    const shuffledPlayers = [...readyPlayers].sort(() => Math.random() - 0.5);
    const impostorIds = shuffledPlayers.slice(0, lobby.impostor_count).map((p) => p.id);

    // Update players
    for (const player of readyPlayers) {
      await supabase
        .from("lobby_players")
        .update({ is_impostor: impostorIds.includes(player.id) })
        .eq("id", player.id);
    }

    // Start the game
    await supabase
      .from("lobbies")
      .update({ 
        status: "playing", 
        current_round: 1,
        secret_word: randomWord 
      })
      .eq("id", lobby.id);

    toast.success("¡La partida ha comenzado!");

    // For turn-based system: only trigger first bot's clue if they're first in turn order
    const sortedPlayers = [...readyPlayers].sort((a, b) => a.id.localeCompare(b.id));
    const firstPlayer = sortedPlayers[0];
    
    if (firstPlayer && firstPlayer.is_bot) {
      const isFirstPlayerImpostor = impostorIds.includes(firstPlayer.id);
      import("@/lib/botBehavior").then(({ submitBotClue }) => {
        submitBotClue(lobby.id, 1, firstPlayer.user_id, isFirstPlayerImpostor);
      });
    }
  };

  const handleSubmitClue = async (clue: string) => {
    if (!lobby || !user || !clue.trim()) return;

    const { error } = await supabase.from("round_clues").insert({
      lobby_id: lobby.id,
      round: lobby.current_round,
      user_id: user.id,
      clue: clue.trim(),
    });

    if (error) {
      toast.error("Error al enviar pista");
      return;
    }

    toast.success("¡Pista enviada!");
    
    // The useBotTurnManager hook will automatically trigger the next bot's turn
    // when the clues state updates via realtime subscription
  };

  const handleVote = async (votedForId: string) => {
    if (!lobby || !user || myVote) return;

    const { error } = await supabase.from("votes").insert({
      lobby_id: lobby.id,
      round: lobby.current_round,
      voter_id: user.id,
      voted_for_id: votedForId,
    });

    if (error) {
      toast.error("Error al votar");
      return;
    }

    setMyVote(votedForId);
    toast.success("¡Voto registrado!");
  };

  const handleProcessVotes = async () => {
    if (!lobby || !user || lobby.host_id !== user.id) return;

    // Count votes
    const voteCounts: Record<string, number> = {};
    votes.forEach((v) => {
      voteCounts[v.voted_for_id] = (voteCounts[v.voted_for_id] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(voteCounts));
    const votedPlayerId = Object.keys(voteCounts).find((id) => voteCounts[id] === maxVotes);
    const votedPlayer = players.find((p) => p.user_id === votedPlayerId);

    const changes: PointChange[] = [];
    let caught = false;
    let caughtPlayer: Player | null = null;

    if (votedPlayer) {
      if (votedPlayer.is_impostor) {
        // Crewmates caught the impostor - each crewmate gets 1 point
        caught = true;
        caughtPlayer = votedPlayer;
        
        const crewmates = players.filter((p) => !p.is_impostor);
        for (const crewmate of crewmates) {
          await supabase
            .from("lobby_players")
            .update({ points: crewmate.points + 1 })
            .eq("id", crewmate.id);
          
          changes.push({
            playerId: crewmate.user_id,
            pointsGained: 1,
            reason: "Descubrió al impostor",
          });
        }
      } else {
        // Impostor survives - gets 1 point
        const impostor = players.find((p) => p.is_impostor);
        if (impostor) {
          await supabase
            .from("lobby_players")
            .update({ points: impostor.points + 1 })
            .eq("id", impostor.id);
          
          changes.push({
            playerId: impostor.user_id,
            pointsGained: 1,
            reason: "Sobrevivió la ronda",
          });
        }
      }
    }

    setPointChanges(changes);
    setImpostorCaught(caught);
    setCaughtImpostor(caughtPlayer);
    setGamePhase("results");
  };

  const handleNextRound = async () => {
    if (!lobby || !user || lobby.host_id !== user.id) return;

    // Check if anyone has won
    const updatedPlayers = await supabase
      .from("lobby_players")
      .select("id, user_id, is_impostor, points")
      .eq("lobby_id", lobby.id);

    if (updatedPlayers.data) {
      const winningPlayer = updatedPlayers.data.find((p) => p.points >= pointsToWin);
      if (winningPlayer) {
        await supabase.from("lobbies").update({ status: "finished" }).eq("id", lobby.id);
        const fullWinner = players.find((p) => p.id === winningPlayer.id);
        if (fullWinner) {
          setWinner({ ...fullWinner, points: winningPlayer.points });
        }
        setGamePhase("finished");
        return;
      }
    }

    // Get a new word for the next round
    const { data: categories } = await supabase
      .from("word_categories")
      .select("words");

    if (categories && categories.length > 0) {
      const allWords = categories.flatMap((c) => c.words);
      const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
      
      await supabase
        .from("lobbies")
        .update({ 
          current_round: lobby.current_round + 1,
          secret_word: randomWord 
        })
        .eq("id", lobby.id);
    } else {
      await supabase
        .from("lobbies")
        .update({ current_round: lobby.current_round + 1 })
        .eq("id", lobby.id);
    }

    // Reassign impostor for next round
    const readyPlayers = players.filter((p) => p.is_ready);
    const shuffledPlayers = [...readyPlayers].sort(() => Math.random() - 0.5);
    const newImpostorIds = shuffledPlayers.slice(0, lobby.impostor_count).map((p) => p.id);

    for (const player of readyPlayers) {
      await supabase
        .from("lobby_players")
        .update({ is_impostor: newImpostorIds.includes(player.id) })
        .eq("id", player.id);
    }

    setMyVote(null);
    setClues([]);
    setVotes([]);
    setPointChanges([]);
    setImpostorCaught(false);
    setCaughtImpostor(null);
  };

  const handleLeaveLobby = async () => {
    if (!lobby || !user || !myPlayer) return;

    // If host is leaving, transfer host to another player
    if (lobby.host_id === user.id) {
      const otherPlayers = players.filter((p) => p.user_id !== user.id && !p.is_eliminated);
      if (otherPlayers.length > 0) {
        // Transfer host to first available player
        await supabase
          .from("lobbies")
          .update({ host_id: otherPlayers[0].user_id })
          .eq("id", lobby.id);
      } else {
        // No other players, delete the lobby
        await supabase.from("lobbies").delete().eq("id", lobby.id);
      }
    }

    await supabase.from("lobby_players").delete().eq("id", myPlayer.id);
    navigate("/lobby");
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Código copiado");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const isHost = user && lobby && lobby.host_id === user.id;
  const activePlayers = players.filter((p) => !p.is_eliminated);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleLeaveLobby} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Salir
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg font-mono tracking-widest px-4 py-2">
              {code}
            </Badge>
            <Button variant="ghost" size="icon" onClick={copyCode}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Game Content */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Players List */}
          <Card className="card-game border-border md:col-span-1">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Users className="w-5 h-5" />
                Jugadores ({activePlayers.length}/{lobby?.max_players})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  user={user!}
                  hostId={lobby?.host_id || ""}
                  lobbyId={lobby?.id || ""}
                  gamePhase={gamePhase}
                  myVote={myVote}
                  onVote={handleVote}
                  onRefresh={fetchGameData}
                  friendStatus={getFriendStatus(player.user_id)}
                />
              ))}

              {/* Invite friends and bot manager in waiting phase */}
              {gamePhase === "waiting" && user && lobby && (
                <div className="pt-2 border-t border-border mt-4 space-y-2">
                  <InviteFriends
                    user={user}
                    lobbyCode={lobby.code}
                    lobbyId={lobby.id}
                    currentPlayerIds={players.map((p) => p.user_id)}
                  />
                  <BotManager
                    lobbyId={lobby.id}
                    currentPlayerCount={players.length}
                    maxPlayers={lobby.max_players}
                    botCount={players.filter((p) => p.is_bot).length}
                    isHost={lobby.host_id === user.id}
                    onRefresh={fetchGameData}
                  />
                </div>
              )}

              {/* Scoreboard during game */}
              {gamePhase !== "waiting" && user && (
                <div className="pt-4 border-t border-border mt-4">
                  <Scoreboard
                    players={players}
                    pointsToWin={pointsToWin}
                    currentUserId={user.id}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Game Area */}
          <Card className="card-game border-border md:col-span-2">
            <CardContent className="pt-6">
              {/* Waiting Phase */}
              {gamePhase === "waiting" && (
                <div className="text-center space-y-6">
                  <div className="animate-float">
                    <Eye className="w-16 h-16 mx-auto text-primary" style={{ filter: "drop-shadow(0 0 20px hsl(0 72% 51% / 0.5))" }} />
                  </div>
                  <h2 className="font-display text-2xl">Esperando jugadores...</h2>
                  <p className="text-muted-foreground">
                    {players.filter((p) => p.is_ready).length}/{lobby?.min_players} jugadores listos
                  </p>
                  
                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={handleReady}
                      className={myPlayer?.is_ready ? "btn-safe" : "btn-impostor"}
                    >
                      {myPlayer?.is_ready ? "Listo ✓" : "Listo"}
                    </Button>
                    
                    {isHost && players.filter((p) => p.is_ready).length >= (lobby?.min_players || 5) && (
                      <Button onClick={handleStartGame} className="btn-impostor">
                        Iniciar Partida
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Clue Phase - Turn Based */}
              {gamePhase === "clue" && (
                <CluePhase
                  currentRound={lobby?.current_round || 1}
                  isImpostor={myPlayer?.is_impostor || false}
                  secretWord={lobby?.secret_word || null}
                  isMyTurn={isMyTurn}
                  currentTurnPlayer={currentTurnPlayer}
                  turnOrder={turnOrder}
                  onSubmitClue={handleSubmitClue}
                />
              )}

              {/* Voting Phase */}
              {gamePhase === "voting" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-2xl mb-2">¡Hora de votar!</h2>
                    <p className="text-muted-foreground">Elige quién crees que es el impostor</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Pistas de esta ronda:</h3>
                    {clues.map((clue) => (
                      <div key={clue.id} className="p-3 rounded-lg bg-muted/50 flex justify-between">
                        <span className="font-medium">{clue.profiles?.username}:</span>
                        <span className="text-muted-foreground">"{clue.clue}"</span>
                      </div>
                    ))}
                  </div>

                  {myVote ? (
                    <div className="space-y-4">
                      <p className="text-center text-muted-foreground">
                        Esperando a que todos voten... ({votes.length}/{activePlayers.length})
                      </p>
                      {isHost && votes.length === activePlayers.length && (
                        <div className="text-center">
                          <Button onClick={handleProcessVotes} className="btn-impostor">
                            Ver Resultados
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {gamePhase === "results" && (
                <RoundResults
                  players={players}
                  votes={votes}
                  pointChanges={pointChanges}
                  impostorCaught={impostorCaught}
                  caughtImpostor={caughtImpostor}
                  isHost={isHost || false}
                  onNextRound={handleNextRound}
                  secretWord={lobby?.secret_word || null}
                />
              )}

              {/* Finished Phase */}
              {gamePhase === "finished" && winner && (
                <GameWinner
                  players={players}
                  winner={winner}
                  pointsToWin={pointsToWin}
                  onReturnToLobby={() => navigate("/lobby")}
                />
              )}

              {/* Fallback finished state */}
              {gamePhase === "finished" && !winner && (
                <div className="space-y-6 text-center">
                  <h2 className="font-display text-3xl">¡Partida terminada!</h2>
                  
                  <div className="space-y-2">
                    <p className="text-lg">La palabra era: <strong>{lobby?.secret_word}</strong></p>
                    <div className="mt-4">
                      <p className="text-muted-foreground mb-2">Impostores:</p>
                      {players.filter((p) => p.is_impostor).map((p) => (
                        <Badge key={p.id} variant="destructive" className="mx-1">
                          {p.profiles.username}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button onClick={() => navigate("/lobby")} className="btn-safe">
                    Volver al Lobby
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Game;
