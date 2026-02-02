import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Send, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import PlayerCard from "@/components/game/PlayerCard";
import { useFriendships } from "@/hooks/useFriendships";

interface Player {
  id: string;
  user_id: string;
  is_impostor: boolean;
  is_eliminated: boolean;
  is_ready: boolean;
  profiles: {
    username: string;
  };
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
  const [currentClue, setCurrentClue] = useState("");
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<"waiting" | "clue" | "voting" | "results" | "finished">("waiting");
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const { getFriendStatus } = useFriendships(user);

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

    // Fetch players with profiles
    const { data: playersData } = await supabase
      .from("lobby_players")
      .select(`
        id,
        user_id,
        is_impostor,
        is_eliminated,
        is_ready,
        profiles:user_id (username)
      `)
      .eq("lobby_id", lobbyData.id);

    if (playersData) {
      const formattedPlayers = playersData.map((p: any) => ({
        ...p,
        profiles: { username: p.profiles?.username || "Jugador" },
      }));
      setPlayers(formattedPlayers);
      setMyPlayer(formattedPlayers.find((p: Player) => p.user_id === user.id) || null);
    }

    // Fetch clues for current round
    if (lobbyData.current_round > 0) {
      const { data: cluesData } = await supabase
        .from("round_clues")
        .select(`
          id,
          round,
          user_id,
          clue,
          profiles:user_id (username)
        `)
        .eq("lobby_id", lobbyData.id)
        .eq("round", lobbyData.current_round);

      if (cluesData) {
        setClues(cluesData.map((c: any) => ({
          ...c,
          profiles: { username: c.profiles?.username || "Jugador" },
        })));
      }

      // Fetch votes
      const { data: votesData } = await supabase
        .from("votes")
        .select("voted_for_id, voter_id")
        .eq("lobby_id", lobbyData.id)
        .eq("round", lobbyData.current_round);

      if (votesData) {
        setVotes(votesData);
        const myVoteData = votesData.find((v) => v.voter_id === user.id);
        if (myVoteData) {
          setMyVote(myVoteData.voted_for_id);
        }
      }
    }

    // Determine game phase
    if (lobbyData.status === "waiting") {
      setGamePhase("waiting");
    } else if (lobbyData.status === "finished") {
      setGamePhase("finished");
    } else if (lobbyData.status === "playing") {
      // Check if we need to submit clue or vote
      const myClue = clues.find((c) => c.user_id === user.id && c.round === lobbyData.current_round);
      const myVoteExists = votes.find((v) => v.voter_id === user.id);
      
      if (!myClue) {
        setGamePhase("clue");
      } else if (!myVoteExists) {
        setGamePhase("voting");
      } else {
        setGamePhase("results");
      }
    }

    setLoading(false);
  }, [code, user, navigate, clues, votes]);

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
  };

  const handleSubmitClue = async () => {
    if (!lobby || !user || !currentClue.trim()) return;

    const { error } = await supabase.from("round_clues").insert({
      lobby_id: lobby.id,
      round: lobby.current_round,
      user_id: user.id,
      clue: currentClue.trim(),
    });

    if (error) {
      toast.error("Error al enviar pista");
      return;
    }

    setCurrentClue("");
    toast.success("¡Pista enviada!");
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

  const handleNextRound = async () => {
    if (!lobby || !user || lobby.host_id !== user.id) return;

    // Count votes and eliminate player with most votes
    const voteCounts: Record<string, number> = {};
    votes.forEach((v) => {
      voteCounts[v.voted_for_id] = (voteCounts[v.voted_for_id] || 0) + 1;
    });

    const maxVotes = Math.max(...Object.values(voteCounts));
    const eliminatedId = Object.keys(voteCounts).find((id) => voteCounts[id] === maxVotes);

    if (eliminatedId) {
      const eliminatedPlayer = players.find((p) => p.user_id === eliminatedId);
      if (eliminatedPlayer) {
        await supabase
          .from("lobby_players")
          .update({ is_eliminated: true })
          .eq("id", eliminatedPlayer.id);

        // Check win conditions
        const remainingImpostors = players.filter((p) => p.is_impostor && !p.is_eliminated && p.id !== eliminatedPlayer.id);
        const remainingInnocents = players.filter((p) => !p.is_impostor && !p.is_eliminated && p.id !== eliminatedPlayer.id);

        if (remainingImpostors.length === 0) {
          // Innocents win
          await supabase.from("lobbies").update({ status: "finished" }).eq("id", lobby.id);
          toast.success("¡Los inocentes ganan! El impostor fue eliminado.");
          return;
        }

        if (remainingImpostors.length >= remainingInnocents.length) {
          // Impostors win
          await supabase.from("lobbies").update({ status: "finished" }).eq("id", lobby.id);
          toast.error("¡El impostor gana! Ha engañado a todos.");
          return;
        }
      }
    }

    // Next round
    await supabase
      .from("lobbies")
      .update({ current_round: lobby.current_round + 1 })
      .eq("id", lobby.id);

    setMyVote(null);
    setClues([]);
    setVotes([]);
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
                  gamePhase={gamePhase}
                  myVote={myVote}
                  onVote={handleVote}
                  friendStatus={getFriendStatus(player.user_id)}
                />
              ))}
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

              {/* Clue Phase */}
              {gamePhase === "clue" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h2 className="font-display text-2xl mb-2">Ronda {lobby?.current_round}</h2>
                    {myPlayer?.is_impostor ? (
                      <div className="p-4 rounded-lg bg-primary/20 border border-primary">
                        <p className="text-lg text-primary font-bold text-glow-red">¡Eres el Impostor!</p>
                        <p className="text-sm text-muted-foreground mt-2">No conoces la palabra. ¡Finge que la sabes!</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-safe/20 border border-safe">
                        <p className="text-lg font-bold text-safe text-glow-green">La palabra es:</p>
                        <p className="text-3xl font-display mt-2">{lobby?.secret_word}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <p className="text-center text-muted-foreground">
                      Da una pista que haga referencia a la palabra sin revelarla
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Tu pista..."
                        value={currentClue}
                        onChange={(e) => setCurrentClue(e.target.value)}
                        className="bg-muted border-border"
                        onKeyDown={(e) => e.key === "Enter" && handleSubmitClue()}
                      />
                      <Button onClick={handleSubmitClue} className="btn-safe" disabled={!currentClue.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
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

                  {myVote && (
                    <p className="text-center text-muted-foreground">
                      Esperando a que todos voten... ({votes.length}/{activePlayers.length})
                    </p>
                  )}
                </div>
              )}

              {/* Results Phase */}
              {gamePhase === "results" && (
                <div className="space-y-6 text-center">
                  <h2 className="font-display text-2xl">Resultados de la votación</h2>
                  
                  <div className="space-y-2">
                    {players.filter((p) => !p.is_eliminated).map((player) => {
                      const voteCount = votes.filter((v) => v.voted_for_id === player.user_id).length;
                      return (
                        <div key={player.id} className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                          <span>{player.profiles.username}</span>
                          <Badge variant={voteCount > 0 ? "destructive" : "secondary"}>
                            {voteCount} votos
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {isHost && (
                    <Button onClick={handleNextRound} className="btn-impostor">
                      Siguiente Ronda
                    </Button>
                  )}
                </div>
              )}

              {/* Finished Phase */}
              {gamePhase === "finished" && (
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
