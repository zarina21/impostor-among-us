import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, ArrowLeft, Copy, Shield, Skull, Zap } from "lucide-react";
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
import CrewAvatar from "@/components/game/CrewAvatar";
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

  const { isMyTurn, currentTurnPlayer, turnOrder, allCluesSubmitted } = useTurnSystem({
    players,
    clues,
    currentRound: lobby?.current_round || 0,
    currentUserId: user?.id,
  });

  useBotTurnManager({
    players,
    clues,
    currentRound: lobby?.current_round || 0,
    lobbyId: lobby?.id,
    gamePhase,
  });

  const fetchGameData = useCallback(async () => {
    if (!code || !user) return;

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

    const { data: playersData } = await supabase
      .from("lobby_players")
      .select("id, user_id, is_impostor, is_eliminated, is_ready, is_bot, bot_name, points")
      .eq("lobby_id", lobbyData.id);

    if (playersData && playersData.length > 0) {
      const realPlayerIds = playersData
        .filter((p) => !p.is_bot)
        .map((p) => p.user_id);

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

    let fetchedClues: typeof clues = [];
    let fetchedVotes: typeof votes = [];
    
    if (lobbyData.current_round > 0) {
      const { data: cluesData } = await supabase
        .from("round_clues")
        .select("id, round, user_id, clue")
        .eq("lobby_id", lobbyData.id)
        .eq("round", lobbyData.current_round);

      if (cluesData && cluesData.length > 0) {
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

    if (lobbyData.status === "waiting") {
      setGamePhase("waiting");
    } else if (lobbyData.status === "finished") {
      setGamePhase("finished");
    } else if (lobbyData.status === "playing") {
      const activePlayersInRound = playersData?.filter(
        (p) => !p.is_eliminated && p.is_ready
      ) || [];
      
      const allPlayersSubmittedClues = activePlayersInRound.every((p) =>
        fetchedClues.some((c) => c.user_id === p.user_id)
      );

      if (!allPlayersSubmittedClues) {
        setGamePhase("clue");
      } else {
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

  useEffect(() => {
    if (!lobby) return;

    const realtimeChannel = supabase
      .channel(`game-${lobby.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_players", filter: `lobby_id=eq.${lobby.id}` }, () => fetchGameData())
      .on("postgres_changes", { event: "*", schema: "public", table: "lobbies", filter: `id=eq.${lobby.id}` }, () => fetchGameData())
      .on("postgres_changes", { event: "*", schema: "public", table: "round_clues", filter: `lobby_id=eq.${lobby.id}` }, () => fetchGameData())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `lobby_id=eq.${lobby.id}` }, () => fetchGameData())
      .subscribe();

    setChannel(realtimeChannel);
    return () => { realtimeChannel.unsubscribe(); };
  }, [lobby?.id, fetchGameData]);

  const handleReady = async () => {
    if (!myPlayer) return;
    await supabase.from("lobby_players").update({ is_ready: !myPlayer.is_ready }).eq("id", myPlayer.id);
  };

  const handleStartGame = async () => {
    if (!lobby || !user || lobby.host_id !== user.id) return;

    const readyPlayers = players.filter((p) => p.is_ready);
    if (readyPlayers.length < lobby.min_players) {
      toast.error(`Se necesitan al menos ${lobby.min_players} jugadores listos`);
      return;
    }

    const { data: categories } = await supabase.from("word_categories").select("words");
    if (!categories || categories.length === 0) {
      toast.error("Error al obtener palabras");
      return;
    }

    const allWords = categories.flatMap((c) => c.words);
    const randomWord = allWords[Math.floor(Math.random() * allWords.length)];

    const shuffledPlayers = [...readyPlayers].sort(() => Math.random() - 0.5);
    const impostorIds = shuffledPlayers.slice(0, lobby.impostor_count).map((p) => p.id);

    for (const player of readyPlayers) {
      await supabase.from("lobby_players").update({ is_impostor: impostorIds.includes(player.id) }).eq("id", player.id);
    }

    await supabase.from("lobbies").update({ status: "playing", current_round: 1, secret_word: randomWord }).eq("id", lobby.id);
    toast.success("¡La partida ha comenzado!");

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
      lobby_id: lobby.id, round: lobby.current_round, user_id: user.id, clue: clue.trim(),
    });
    if (error) { toast.error("Error al enviar pista"); return; }
    toast.success("¡Pista enviada!");
  };

  const handleVote = async (votedForId: string) => {
    if (!lobby || !user || myVote) return;
    const { error } = await supabase.from("votes").insert({
      lobby_id: lobby.id, round: lobby.current_round, voter_id: user.id, voted_for_id: votedForId,
    });
    if (error) { toast.error("Error al votar"); return; }
    setMyVote(votedForId);
    toast.success("¡Voto registrado!");
  };

  const handleProcessVotes = async () => {
    if (!lobby || !user || lobby.host_id !== user.id) return;

    const voteCounts: Record<string, number> = {};
    votes.forEach((v) => { voteCounts[v.voted_for_id] = (voteCounts[v.voted_for_id] || 0) + 1; });

    const maxVotes = Math.max(...Object.values(voteCounts));
    const votedPlayerId = Object.keys(voteCounts).find((id) => voteCounts[id] === maxVotes);
    const votedPlayer = players.find((p) => p.user_id === votedPlayerId);

    const changes: PointChange[] = [];
    let caught = false;
    let caughtPlayer: Player | null = null;

    if (votedPlayer) {
      if (votedPlayer.is_impostor) {
        caught = true;
        caughtPlayer = votedPlayer;
        const crewmates = players.filter((p) => !p.is_impostor);
        for (const crewmate of crewmates) {
          await supabase.from("lobby_players").update({ points: crewmate.points + 1 }).eq("id", crewmate.id);
          changes.push({ playerId: crewmate.user_id, pointsGained: 1, reason: "Descubrió al impostor" });
        }
      } else {
        const impostor = players.find((p) => p.is_impostor);
        if (impostor) {
          await supabase.from("lobby_players").update({ points: impostor.points + 1 }).eq("id", impostor.id);
          changes.push({ playerId: impostor.user_id, pointsGained: 1, reason: "Sobrevivió la ronda" });
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

    const updatedPlayers = await supabase.from("lobby_players").select("id, user_id, is_impostor, points").eq("lobby_id", lobby.id);
    if (updatedPlayers.data) {
      const winningPlayer = updatedPlayers.data.find((p) => p.points >= pointsToWin);
      if (winningPlayer) {
        await supabase.from("lobbies").update({ status: "finished" }).eq("id", lobby.id);
        const fullWinner = players.find((p) => p.id === winningPlayer.id);
        if (fullWinner) setWinner({ ...fullWinner, points: winningPlayer.points });
        setGamePhase("finished");
        return;
      }
    }

    const { data: categories } = await supabase.from("word_categories").select("words");
    if (categories && categories.length > 0) {
      const allWords = categories.flatMap((c) => c.words);
      const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
      await supabase.from("lobbies").update({ current_round: lobby.current_round + 1, secret_word: randomWord }).eq("id", lobby.id);
    } else {
      await supabase.from("lobbies").update({ current_round: lobby.current_round + 1 }).eq("id", lobby.id);
    }

    const readyPlayers = players.filter((p) => p.is_ready);
    const shuffledPlayers = [...readyPlayers].sort(() => Math.random() - 0.5);
    const newImpostorIds = shuffledPlayers.slice(0, lobby.impostor_count).map((p) => p.id);
    for (const player of readyPlayers) {
      await supabase.from("lobby_players").update({ is_impostor: newImpostorIds.includes(player.id) }).eq("id", player.id);
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
    if (lobby.host_id === user.id) {
      const otherPlayers = players.filter((p) => p.user_id !== user.id && !p.is_eliminated);
      if (otherPlayers.length > 0) {
        await supabase.from("lobbies").update({ host_id: otherPlayers[0].user_id }).eq("id", lobby.id);
      } else {
        await supabase.from("lobbies").delete().eq("id", lobby.id);
      }
    }
    await supabase.from("lobby_players").delete().eq("id", myPlayer.id);
    navigate("/lobby");
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("¡Código copiado!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center space-bg">
        <div className="stars" />
        <div className="relative z-10 text-center">
          <div className="animate-float mb-4">
            <Eye className="w-12 h-12 text-primary mx-auto" style={{ filter: "drop-shadow(0 0 20px hsl(0 72% 51% / 0.5))" }} />
          </div>
          <p className="text-muted-foreground font-display animate-pulse">Cargando partida...</p>
        </div>
      </div>
    );
  }

  const isHost = user && lobby && lobby.host_id === user.id;
  const activePlayers = players.filter((p) => !p.is_eliminated);
  const readyCount = players.filter((p) => p.is_ready).length;

  // Phase info
  const phaseConfig = {
    waiting: { label: "Sala de espera", icon: <Users className="w-4 h-4" />, color: "bg-muted/50 text-muted-foreground border-border" },
    clue: { label: `Ronda ${lobby?.current_round} — Pistas`, icon: <Eye className="w-4 h-4" />, color: "bg-safe/10 text-safe border-safe/30" },
    voting: { label: `Ronda ${lobby?.current_round} — Votación`, icon: <Skull className="w-4 h-4" />, color: "bg-primary/10 text-primary border-primary/30" },
    results: { label: "Resultados", icon: <Zap className="w-4 h-4" />, color: "bg-gold/10 text-gold border-gold/30" },
    finished: { label: "Partida terminada", icon: <Shield className="w-4 h-4" />, color: "bg-safe/10 text-safe border-safe/30" },
  };

  const phase = phaseConfig[gamePhase];

  return (
    <div className="min-h-screen p-4 md:p-6 space-bg">
      <div className="stars" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={handleLeaveLobby} className="text-muted-foreground hover:text-foreground gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>

          {/* Phase indicator */}
          <div className={`phase-pill border ${phase.color}`}>
            {phase.icon}
            {phase.label}
          </div>

          {/* Room code */}
          <button
            onClick={copyCode}
            className="flex items-center gap-2 card-game px-4 py-2 hover:bg-muted/50 transition-colors cursor-pointer border border-border"
          >
            <span className="text-xs text-muted-foreground">SALA</span>
            <span className="font-mono font-bold tracking-widest text-foreground">{code}</span>
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Main Layout */}
        <div className="grid md:grid-cols-12 gap-4">
          {/* Left Sidebar - Players */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="card-game border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Tripulación
                </h3>
                <span className="text-xs text-muted-foreground">{activePlayers.length}/{lobby?.max_players}</span>
              </div>

              <div className="space-y-1.5">
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
              </div>

              {/* Waiting phase actions */}
              {gamePhase === "waiting" && user && lobby && (
                <div className="pt-3 border-t border-border space-y-2">
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
                <div className="pt-3 border-t border-border">
                  <Scoreboard players={players} pointsToWin={pointsToWin} currentUserId={user.id} />
                </div>
              )}
            </div>
          </div>

          {/* Main Area */}
          <div className="md:col-span-8 lg:col-span-9">
            <div className="card-game border-border p-6 min-h-[400px] flex flex-col">
              {/* Waiting Phase */}
              {gamePhase === "waiting" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="animate-float">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto" style={{
                      background: "var(--gradient-impostor)",
                      boxShadow: "0 0 40px hsl(0 72% 51% / 0.3)",
                    }}>
                      <Eye className="w-12 h-12 text-primary-foreground" />
                    </div>
                  </div>

                  <div>
                    <h2 className="font-display text-3xl font-bold mb-2">Esperando jugadores</h2>
                    <p className="text-muted-foreground">
                      <span className="font-display font-bold text-foreground">{readyCount}</span>
                      <span className="mx-1">/</span>
                      <span>{lobby?.min_players} necesarios</span>
                    </p>
                  </div>

                  {/* Ready progress */}
                  <div className="w-full max-w-xs">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((readyCount / (lobby?.min_players || 3)) * 100, 100)}%`,
                          background: readyCount >= (lobby?.min_players || 3)
                            ? "var(--gradient-safe)"
                            : "var(--gradient-impostor)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleReady}
                      className={`${myPlayer?.is_ready ? "btn-safe" : "btn-impostor"} px-8 py-5 text-base`}
                    >
                      {myPlayer?.is_ready ? "✓ Listo" : "Estoy Listo"}
                    </Button>

                    {isHost && readyCount >= (lobby?.min_players || 3) && (
                      <Button onClick={handleStartGame} className="btn-impostor px-8 py-5 text-base animate-bounce-in">
                        <Skull className="w-5 h-5 mr-2" />
                        ¡Iniciar Partida!
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Clue Phase */}
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mb-4">
                      <Skull className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-1">¿Quién es el impostor?</h2>
                    <p className="text-sm text-muted-foreground">Revisa las pistas y vota por el sospechoso</p>
                  </div>

                  {/* Clues display */}
                  <div className="space-y-2">
                    <h3 className="font-display text-sm font-semibold text-muted-foreground">Pistas de esta ronda:</h3>
                    <div className="grid gap-2">
                      {clues.map((clue) => (
                        <div key={clue.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                          <CrewAvatar name={clue.profiles?.username || "?"} size="sm" />
                          <div className="flex-1 min-w-0">
                            <span className="font-display font-semibold text-sm">{clue.profiles?.username}</span>
                            <p className="text-sm text-muted-foreground">"{clue.clue}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vote on player cards in sidebar */}
                  {myVote ? (
                    <div className="text-center space-y-4">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-safe/10 border border-safe/30 text-safe text-sm">
                        <Shield className="w-4 h-4" />
                        Voto registrado — Esperando a los demás ({votes.length}/{activePlayers.length})
                      </div>
                      {isHost && votes.length === activePlayers.length && (
                        <div>
                          <Button onClick={handleProcessVotes} className="btn-impostor px-8 py-5 animate-bounce-in">
                            <Zap className="w-5 h-5 mr-2" />
                            Ver Resultados
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-muted-foreground">
                      Selecciona un jugador de la lista a la izquierda para votar
                    </p>
                  )}
                </div>
              )}

              {/* Results */}
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

              {/* Finished */}
              {gamePhase === "finished" && winner && (
                <GameWinner
                  players={players}
                  winner={winner}
                  pointsToWin={pointsToWin}
                  onReturnToLobby={() => navigate("/lobby")}
                />
              )}

              {gamePhase === "finished" && !winner && (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center">
                  <h2 className="font-display text-3xl font-bold">¡Partida terminada!</h2>
                  <p className="text-lg">La palabra era: <strong className="text-safe">{lobby?.secret_word}</strong></p>
                  <div>
                    <p className="text-muted-foreground mb-2">Impostores:</p>
                    {players.filter((p) => p.is_impostor).map((p) => (
                      <Badge key={p.id} variant="destructive" className="mx-1">
                        {p.profiles.username}
                      </Badge>
                    ))}
                  </div>
                  <Button onClick={() => navigate("/lobby")} className="btn-safe px-8 py-5">
                    Volver al Lobby
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
