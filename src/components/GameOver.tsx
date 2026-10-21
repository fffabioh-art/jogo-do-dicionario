import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Crown,
  Sparkles,
  RotateCcw,
  Home,
  Award,
  Medal,
  Users,
  Flame,
  ChevronDown,
  ChevronUp,
  Bot,
  UserX,
  BookOpen,
} from 'lucide-react';
import { Player } from '../types/game';

export const GameOver: React.FC = () => {
  const { room, isHost, restartGame, leaveRoom, myPlayerId } = useGame();
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Launch celebratory confetti burst
    const end = Date.now() + 3.5 * 1000;
    const colors = ['#f59e0b', '#10b981', '#ec4899', '#3b82f6'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  if (!room) return null;

  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const targetScore = room.settings.targetScore;
  const remainingPlayers = sortedPlayers.slice(3);

  const togglePlayerExpanded = (playerId: string) => {
    setExpandedPlayerIds((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  // Helper to calculate grouped victims for a player across all rounds
  const getVictimsBreakdown = (player: Player) => {
    const history = player.receivedVotesHistory || [];
    const grouped: Record<
      string,
      {
        voterId: string;
        voterName: string;
        voterAvatar: string;
        count: number;
        rounds: { roundNumber: number; word: string; bluffText: string }[];
      }
    > = {};

    history.forEach((item) => {
      if (!grouped[item.voterId]) {
        grouped[item.voterId] = {
          voterId: item.voterId,
          voterName: item.voterName,
          voterAvatar: item.voterAvatar,
          count: 0,
          rounds: [],
        };
      }
      grouped[item.voterId].count += 1;
      grouped[item.voterId].rounds.push({
        roundNumber: item.roundNumber,
        word: item.word,
        bluffText: item.bluffText,
      });
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  };

  const totalAllVotes = room.players.reduce(
    (sum, p) => sum + (p.totalVotesReceived || (p.receivedVotesHistory?.length || 0)),
    0
  );

  const toggleAllExpanded = () => {
    const areAllExpanded = room.players.every((p) => expandedPlayerIds[p.id]);
    const newState: Record<string, boolean> = {};
    if (!areAllExpanded) {
      room.players.forEach((p) => {
        newState[p.id] = true;
      });
    }
    setExpandedPlayerIds(newState);
  };

  const areAllExpanded = room.players.length > 0 && room.players.every((p) => expandedPlayerIds[p.id]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-8 text-center animate-fade-in">
      {/* Trophy Spotlight */}
      <div className="space-y-4">
        <div className="relative inline-block mx-auto">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 border-4 border-amber-200 flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/40 animate-bounce-subtle">
            {winner?.avatar || '👑'}
          </div>
          <div className="absolute -top-3 -right-2 p-1.5 rounded-full bg-amber-300 text-stone-950 border border-stone-900 shadow-md">
            <Crown className="w-5 h-5 fill-stone-950" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Grande Campeão do Jogo do Dicionário
          </span>
          <h2 className="font-serif font-black text-4xl sm:text-5xl text-amber-100 tracking-tight">
            {winner?.name}
          </h2>
          <p className="text-sm font-mono text-amber-300">
            Atingiu <strong className="text-amber-100 text-base">{winner?.score} pontos</strong> (Meta: {targetScore} pts)
          </p>
        </div>
      </div>

      {/* Podium Cards (1st, 2nd, 3rd) - Preserved exactly as requested */}
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto items-end pt-4">
        {/* 2nd place */}
        {sortedPlayers[1] && (
          <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-700/60 shadow-lg space-y-1 order-1">
            <span className="text-xs text-stone-400 font-bold block">2º Lugar</span>
            <div className="text-2xl">{sortedPlayers[1].avatar}</div>
            <p className="text-xs font-bold text-stone-200 truncate">{sortedPlayers[1].name}</p>
            <span className="font-mono text-xs text-amber-300">{sortedPlayers[1].score} pts</span>
          </div>
        )}

        {/* 1st place */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/80 to-stone-900 border-2 border-amber-400 shadow-2xl space-y-1.5 order-2 -translate-y-2">
          <div className="inline-flex items-center gap-1 text-[11px] font-black text-amber-300 uppercase tracking-wider bg-amber-950 px-2 py-0.5 rounded-full border border-amber-700">
            <Medal className="w-3.5 h-3.5 text-amber-400" /> 1º Lugar
          </div>
          <div className="text-3xl">{winner?.avatar}</div>
          <p className="text-sm font-black text-amber-100 truncate">{winner?.name}</p>
          <span className="font-mono text-sm font-black text-amber-300">{winner?.score} pts</span>
        </div>

        {/* 3rd place */}
        {sortedPlayers[2] && (
          <div className="p-3.5 rounded-2xl bg-stone-900 border border-stone-700/60 shadow-lg space-y-1 order-3">
            <span className="text-xs text-stone-400 font-bold block">3º Lugar</span>
            <div className="text-2xl">{sortedPlayers[2].avatar}</div>
            <p className="text-xs font-bold text-stone-200 truncate">{sortedPlayers[2].name}</p>
            <span className="font-mono text-xs text-amber-300">{sortedPlayers[2].score} pts</span>
          </div>
        )}
      </div>

      {/* 4th Place Onwards List (Lista do quarto colocado em diante) */}
      {remainingPlayers.length > 0 && (
        <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-4 sm:p-5 max-w-xl mx-auto text-left space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Demais Classificados (4º Lugar em diante)
            </h4>
            <span className="text-[11px] text-stone-400 font-mono">
              {remainingPlayers.length} {remainingPlayers.length === 1 ? 'participante' : 'participantes'}
            </span>
          </div>

          <div className="space-y-2">
            {remainingPlayers.map((player, idx) => {
              const position = idx + 4;
              const isMe = player.id === myPlayerId;
              const totalVotes = player.totalVotesReceived || (player.receivedVotesHistory?.length || 0);

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isMe
                      ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-stone-950/80 border-stone-800/80 hover:border-stone-700'
                  }`}
                  style={{
                    borderLeftColor: player.color || '#F59E0B',
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-stone-500 text-xs w-5 text-right">
                      {position}º
                    </span>

                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-inner border border-white/10 shrink-0"
                      style={{ backgroundColor: `${player.color || '#F59E0B'}25` }}
                    >
                      {player.avatar}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-stone-100 truncate max-w-[140px] sm:max-w-[200px]">
                          {player.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                            Você
                          </span>
                        )}
                        {player.isHost && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" /> Host
                          </span>
                        )}
                        {player.isBot && (
                          <span className="text-[10px] text-purple-400 flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5" /> Bot
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                        <span className="text-amber-300/80 font-mono font-medium">
                          {totalVotes} {totalVotes === 1 ? 'voto recebido' : 'votos recebidos'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-amber-200 text-sm">
                      {player.score} <span className="text-[10px] text-stone-400 font-normal">pts</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo de Quem Votou em Quem (Quadro de Votos Recebidos nos Blefes) */}
      <div className="bg-stone-900/95 border-2 border-amber-800/40 rounded-3xl p-4 sm:p-6 text-left space-y-4 shadow-2xl backdrop-blur-sm max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base sm:text-lg text-amber-200 uppercase tracking-wide">
                Resumo de Quem Votou em Quem nos Blefes
              </h3>
              <p className="text-xs text-stone-400">
                Histórico de todos os participantes que caíram nos blefes durante as rodadas da partida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-800 shrink-0">
              {totalAllVotes} {totalAllVotes === 1 ? 'voto total' : 'votos totais'}
            </span>

            <button
              onClick={toggleAllExpanded}
              className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700 text-amber-300 transition-colors"
            >
              {areAllExpanded ? 'Recolher Todos' : 'Expandir Todos'}
            </button>
          </div>
        </div>

        {/* Players List with Detailed Breakdown of Victims */}
        <div className="space-y-3">
          {[...room.players]
            .sort((a, b) => {
              const votesA = a.totalVotesReceived || (a.receivedVotesHistory?.length || 0);
              const votesB = b.totalVotesReceived || (b.receivedVotesHistory?.length || 0);
              if (votesB !== votesA) return votesB - votesA;
              return b.score - a.score;
            })
            .map((player) => {
              const totalVotes = player.totalVotesReceived || (player.receivedVotesHistory?.length || 0);
              const victims = getVictimsBreakdown(player);
              const isExpanded = Boolean(expandedPlayerIds[player.id]);
              const isMe = player.id === myPlayerId;

              return (
                <div
                  key={player.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-amber-950/20 border-amber-500/50'
                      : 'bg-stone-950 border-stone-800'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{player.avatar}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-stone-100 text-sm">
                            {player.name}
                          </h4>
                          {isMe && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-400">
                          Enganou {victims.length} {victims.length === 1 ? 'adversário diferente' : 'adversários diferentes'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="font-mono font-black text-amber-300 text-base">
                          {totalVotes}
                        </span>
                        <span className="text-[10px] text-stone-400 block -mt-1">
                          {totalVotes === 1 ? 'voto recebido' : 'votos recebidos'}
                        </span>
                      </div>

                      <button
                        onClick={() => togglePlayerExpanded(player.id)}
                        className="flex items-center gap-1 text-[11px] font-sans font-medium px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-300 transition-colors"
                        title="Ver quem votou nesta pessoa"
                      >
                        <span>{isExpanded ? 'Recolher' : 'Ver Votos'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable breakdown: victims and rounds */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-stone-800/80 space-y-2.5 animate-fade-in text-xs">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Quem votou nos blefes de {player.name} ({totalVotes} votos):
                      </h5>

                      {victims.length === 0 ? (
                        <p className="text-stone-500 italic text-xs py-1">
                          Nenhum adversário caiu nos blefes de {player.name} durante a partida.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {victims.map((v) => (
                              <div
                                key={v.voterId}
                                className="p-2 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{v.voterAvatar}</span>
                                  <div>
                                    <span className="font-bold text-stone-200 text-xs block">
                                      {v.voterName}
                                    </span>
                                    <span className="text-[10px] text-stone-400">
                                      Caiu {v.count} {v.count === 1 ? 'vez' : 'vezes'}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-mono font-black text-amber-400 text-xs bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                                  {v.count} {v.count === 1 ? 'voto' : 'votos'}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Round by round list of words and bluffs fooled */}
                          {player.receivedVotesHistory && player.receivedVotesHistory.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-stone-800/60">
                              <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                                Palavras em que caíram no blefe de {player.name}:
                              </span>
                              <div className="space-y-1">
                                {player.receivedVotesHistory.map((h, i) => (
                                  <div
                                    key={i}
                                    className="text-[11px] p-2 rounded-lg bg-stone-900/70 text-stone-300 flex items-center justify-between gap-2"
                                  >
                                    <span className="truncate max-w-[200px] sm:max-w-xs">
                                      Rodada {h.roundNumber} (<strong>{h.word}</strong>): {h.voterName}
                                    </span>
                                    <span className="text-[10px] font-mono text-amber-300 italic truncate max-w-[180px]">
                                      "{h.bluffText}"
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Round History Preview */}
      {room.roundHistory.length > 0 && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 max-w-xl mx-auto text-left space-y-2">
          <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Palavras Desafiadas na Partida ({room.roundHistory.length})
          </h4>
          <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
            {room.roundHistory.map((item, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-stone-950 border border-stone-800/80 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-amber-200 font-serif mr-2">{item.word}</strong>
                  <span className="text-stone-400 text-[11px] truncate inline-block max-w-[220px] sm:max-w-md align-bottom">
                    {item.realDefinition}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono shrink-0">Rodada {item.roundNumber}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Game Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        {isHost && (
          <button
            onClick={restartGame}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-950/50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Jogar Novamente (Mesma Sala)
          </button>
        )}

        <button
          onClick={leaveRoom}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Voltar ao Início
        </button>
      </div>
    </div>
  );
};
