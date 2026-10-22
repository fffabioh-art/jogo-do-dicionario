import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  Trophy,
  Target,
  Crown,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Users,
  Plus,
  Minus,
  Flame,
  Info,
} from 'lucide-react';
import { Player, ReceivedVoteDetail } from '../types/game';
import { StickmanFigure } from './StickmanFigure';

export const ScoreBoard: React.FC = () => {
  const { room, myPlayerId, isHost, isLeader, adjustPlayerScore, setPlayerScore } = useGame();
  const [activeTab, setActiveTab] = useState<'standings' | 'votes'>('standings');
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<string>('');

  if (!room || room.players.length === 0) return null;

  const targetScore = room.settings.targetScore;
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const canManageScores = isHost || isLeader;

  const togglePlayerExpanded = (playerId: string) => {
    setExpandedPlayerIds((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  // Helper to calculate grouped victims for a player
  const getVictimsBreakdown = (player: Player) => {
    const history = player.receivedVotesHistory || [];
    const grouped: Record<
      string,
      {
        voterId: string;
        voterName: string;
        voterAvatar: string;
        count: number;
      }
    > = {};

    history.forEach((item) => {
      if (!grouped[item.voterId]) {
        grouped[item.voterId] = {
          voterId: item.voterId,
          voterName: item.voterName,
          voterAvatar: item.voterAvatar,
          count: 0,
        };
      }
      grouped[item.voterId].count += 1;
    });

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  };

  const totalAllVotes = room.players.reduce(
    (acc, p) => acc + (p.totalVotesReceived || p.receivedVotesHistory?.length || 0),
    0
  );

  const startEditScore = (player: Player) => {
    if (!canManageScores) return;
    setEditingPlayerId(player.id);
    setEditScoreValue(String(player.score));
  };

  const saveEditScore = (playerId: string) => {
    const val = parseInt(editScoreValue, 10);
    if (!isNaN(val) && val >= 0) {
      setPlayerScore(playerId, val);
    }
    setEditingPlayerId(null);
  };

  return (
    <div className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 sm:p-5 shadow-lg space-y-4">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-stone-200 font-bold text-sm">Placar da Partida</span>
          <span className="text-stone-500">·</span>
          <span className="text-xs text-stone-400">
            Meta: <strong className="text-amber-300 font-mono">{targetScore} pts</strong>
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('standings')}
            className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'standings'
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Classificação</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('votes')}
            className={`py-1.5 px-3 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'votes'
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Quem Votou em Quem</span>
            {totalAllVotes > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-stone-900 text-amber-300 border border-amber-600/30">
                {totalAllVotes}
              </span>
            )}
          </button>
        </div>
      </div>

      {room.isTieBreakActive && (
        <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span><strong>Morte Súbita ativa:</strong> Dois ou mais jogadores empatados na liderança acima da meta!</span>
        </div>
      )}

      {/* TAB 1: STANDINGS */}
      {activeTab === 'standings' && (
        <div className="space-y-2 animate-fade-in">
          {canManageScores && (
            <div className="text-[11px] text-stone-400 flex items-center justify-between px-1">
              <span>Host/Líder: Use os botões <strong>- / +</strong> ou clique no número para definir a pontuação manualmente.</span>
            </div>
          )}

          {sortedPlayers.map((player, index) => {
            const isMe = player.id === myPlayerId;
            const percentage = Math.min(100, Math.round((player.score / targetScore) * 100));
            const isCurrentLeader = index === 0 && player.score > 0;
            const totalVotes = player.totalVotesReceived || (player.receivedVotesHistory?.length || 0);
            const victims = getVictimsBreakdown(player);
            const isExpanded = Boolean(expandedPlayerIds[player.id]);

            return (
              <div
                key={player.id}
                className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-stone-950 border-amber-500/40'
                    : 'bg-stone-950/50 border-stone-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  {/* Left: Position, Avatar, Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-stone-500 text-xs w-4 text-right">
                      {index + 1}º
                    </span>
                    <div className="shrink-0 flex items-center justify-center">
                      <StickmanFigure
                        avatarId={player.avatar}
                        color={player.color || '#F59E0B'}
                        size={24}
                        state="standing"
                        showCrown={isCurrentLeader}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-medium truncate max-w-[130px] sm:max-w-[200px] ${
                            isMe ? 'text-amber-200 font-bold' : 'text-stone-200'
                          }`}
                        >
                          {player.name} {isMe && '(Você)'}
                        </span>
                        {isCurrentLeader && (
                          <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                        )}
                      </div>
                      {totalVotes > 0 && (
                        <button
                          type="button"
                          onClick={() => togglePlayerExpanded(player.id)}
                          className="text-[10px] text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5 mt-0.5"
                        >
                          <span>{totalVotes} {totalVotes === 1 ? 'voto recebido' : 'votos recebidos'}</span>
                          {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Score and Manual Stepper/Input */}
                  <div className="flex items-center gap-2 shrink-0">
                    {canManageScores ? (
                      <div className="flex items-center gap-1 bg-stone-900 px-1.5 py-0.5 rounded-lg border border-stone-800">
                        <button
                          onClick={() => adjustPlayerScore(player.id, -1)}
                          disabled={player.score <= 0}
                          className="w-6 h-6 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-300 hover:text-amber-300 transition-colors"
                          title="Diminuir 1 ponto (-1)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        {editingPlayerId === player.id ? (
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={editScoreValue}
                            onChange={(e) => setEditScoreValue(e.target.value)}
                            onBlur={() => saveEditScore(player.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditScore(player.id);
                              if (e.key === 'Escape') setEditingPlayerId(null);
                            }}
                            autoFocus
                            className="w-12 text-center font-mono font-bold text-amber-300 bg-stone-950 border border-amber-500 rounded text-xs py-0.5 outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditScore(player)}
                            className="font-mono font-bold text-amber-200 text-xs min-w-[28px] text-center px-1 hover:text-amber-400 hover:underline"
                            title="Clique para digitar a pontuação manualmente"
                          >
                            {player.score} pts
                          </button>
                        )}

                        <button
                          onClick={() => adjustPlayerScore(player.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 transition-colors"
                          title="Aumentar 1 ponto (+1)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-amber-200 text-xs">
                        {player.score} <span className="text-stone-500 font-normal">pts</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stickman Race Track Lane */}
                <div className="relative mt-2.5">
                  <div className="w-full h-8 sm:h-9 bg-stone-950 rounded-xl border border-stone-800/80 relative flex items-center px-2 overflow-hidden shadow-inner">
                    {/* Distance Track Guide Markers (25%, 50%, 75%) */}
                    <div className="absolute inset-x-3 top-0 bottom-0 pointer-events-none flex justify-between items-center opacity-15">
                      <div className="w-px h-full bg-stone-500" />
                      <div className="w-px h-2.5 bg-stone-500" />
                      <div className="w-px h-4 bg-stone-500" />
                      <div className="w-px h-2.5 bg-stone-500" />
                      <div className="w-px h-full bg-stone-500" />
                    </div>

                    {/* Central Track Rail */}
                    <div className="absolute inset-x-2 h-1 bg-stone-900 rounded-full" />

                    {/* Runner Distance Trail */}
                    <div
                      className="absolute left-2 h-1 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `calc((${percentage} / 100) * (100% - 44px))`,
                        backgroundColor: player.color || '#F59E0B',
                        boxShadow: `0 0 10px ${player.color || '#F59E0B'}80`,
                      }}
                    />

                    {/* Start Line */}
                    <div
                      className="absolute left-1.5 top-1 bottom-1 w-1 bg-stone-700/60 rounded-full"
                      title="Largada (0 pts)"
                    />

                    {/* Finish Line Checkered Strip */}
                    <div
                      className="absolute right-1 top-1 bottom-1 w-3.5 rounded-r opacity-50 select-none"
                      style={{
                        backgroundImage: 'repeating-conic-gradient(#fff 0% 25%, #000 0% 50%)',
                        backgroundSize: '6px 6px',
                      }}
                      title={`Linha de Chegada: Meta de ${targetScore} pts`}
                    />
                    <span
                      className="absolute right-5 text-[11px] select-none opacity-80"
                      title={`Meta: ${targetScore} pts`}
                    >
                      🏁
                    </span>

                    {/* Animated Running Stickman Character */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out z-10 flex items-center pointer-events-none"
                      style={{
                        left: `calc(4px + (${percentage} / 100) * (100% - 48px))`,
                      }}
                    >
                      <StickmanFigure
                        avatarId={player.avatar}
                        color={player.color || '#F59E0B'}
                        size={24}
                        state={player.score >= targetScore ? 'celebrating' : 'running'}
                        showCrown={isCurrentLeader}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Quick Victims View */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-stone-800/60 text-[11px] text-stone-300 space-y-1">
                    <span className="text-stone-400 block text-[10px] font-semibold uppercase tracking-wider">
                      Jogadores que caíram nos blefes de {player.name}:
                    </span>
                    {victims.length === 0 ? (
                      <span className="text-stone-500 italic text-[11px]">Nenhum adversário caiu nos blefes ainda.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {victims.map((v) => (
                          <span
                            key={v.voterId}
                            className="inline-flex items-center gap-1 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-lg text-stone-200"
                          >
                            <StickmanFigure
                              avatarId={v.voterAvatar}
                              color="#d6d3d1"
                              size={16}
                              state="standing"
                            />
                            <span>{v.voterName}</span>
                            <strong className="text-amber-400 font-mono">({v.count}x)</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: QUEM VOTOU EM QUEM (FULL DEDICATED PANEL) */}
      {activeTab === 'votes' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Flame className="w-4 h-4 text-amber-400" />
              Histórico de Votos nos Blefes
            </span>
            <span className="font-mono text-stone-400">
              {totalAllVotes} {totalAllVotes === 1 ? 'voto total' : 'votos totais'}
            </span>
          </div>

          {totalAllVotes === 0 ? (
            <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <Info className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs text-stone-200">
                Nenhum voto em blefe registrado ainda
              </h4>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Assim que os jogadores votarem nas definições falsas uns dos outros ao longo das rodadas, o registro completo de quem enganou quem aparecerá aqui!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...room.players]
                .sort((a, b) => {
                  const vA = a.totalVotesReceived || a.receivedVotesHistory?.length || 0;
                  const vB = b.totalVotesReceived || b.receivedVotesHistory?.length || 0;
                  return vB - vA;
                })
                .map((player) => {
                  const voteCount = player.totalVotesReceived || player.receivedVotesHistory?.length || 0;
                  const voteHistory: ReceivedVoteDetail[] = player.receivedVotesHistory || [];
                  const isMe = player.id === myPlayerId;

                  return (
                    <div
                      key={player.id}
                      className={`p-3 rounded-xl border text-xs space-y-2 ${
                        isMe
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : 'bg-stone-950/60 border-stone-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StickmanFigure
                            avatarId={player.avatar}
                            color={player.color || '#F59E0B'}
                            size={28}
                            state="standing"
                          />
                          <div>
                            <span className="font-bold text-stone-100">
                              {player.name} {isMe && '(Você)'}
                            </span>
                            <span className="text-stone-400 text-[11px] block">
                              Placar: {player.score} pts
                            </span>
                          </div>
                        </div>

                        <span className="font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-2.5 py-1 rounded-lg">
                          {voteCount} {voteCount === 1 ? 'voto recebido' : 'votos recebidos'}
                        </span>
                      </div>

                      {voteHistory.length > 0 ? (
                        <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
                          <span className="text-[10px] text-stone-400 uppercase font-semibold tracking-wider block">
                            Quem caiu nos blefes de {player.name}:
                          </span>
                          <div className="grid gap-1.5">
                            {voteHistory.map((detail, idx) => (
                              <div
                                key={detail.id || idx}
                                className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px]"
                              >
                                <div className="flex items-center gap-1.5 text-stone-200">
                                  <StickmanFigure
                                    avatarId={detail.voterAvatar}
                                    color="#e5e5e5"
                                    size={18}
                                    state="standing"
                                  />
                                  <strong>{detail.voterName}</strong>
                                  <span className="text-stone-400">caiu na palavra</span>
                                  <strong className="text-amber-300 uppercase">{detail.word}</strong>
                                </div>
                                <span className="text-stone-400 font-mono text-[10px]">
                                  Rodada {detail.roundNumber}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-500 italic pt-1">
                          Nenhum adversário caiu nos blefes de {player.name} até o momento.
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
