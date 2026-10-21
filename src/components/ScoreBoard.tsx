import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Target, Crown, ShieldAlert, ChevronDown, ChevronUp, Users, Sparkles, UserCheck, Flame, BookOpen, Plus, Minus } from 'lucide-react';

export const ScoreBoard: React.FC = () => {
  const { room, myPlayerId, isHost, isLeader, adjustPlayerScore } = useGame();
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'scoreboard' | 'votesBreakdown'>('scoreboard');

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
  const getVictimsBreakdown = (player: typeof room.players[0]) => {
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

    // Return sorted descending by number of votes tricked
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  };

  return (
    <div className="w-full bg-stone-900/95 border border-amber-800/40 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Top Header Row with Tab Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('scoreboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'scoreboard'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Placar Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('votesBreakdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'votesBreakdown'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200 bg-stone-950'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Quadro de Votos Recebidos</span>
          </button>
        </div>

        <span className="font-mono text-amber-400 text-xs flex items-center gap-1 bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-800/60">
          <Target className="w-3.5 h-3.5" />
          Meta de Vitória: <strong className="text-amber-200">{targetScore} pts</strong>
        </span>
      </div>

      {room.isTieBreakActive && (
        <div className="px-3 py-2 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span><strong>Morte Súbita ativa!</strong> Dois ou mais jogadores empatados na liderança acima da meta!</span>
        </div>
      )}

      {/* TAB 1: STANDARD PROGRESS SCOREBOARD WITH QUICK EXPAND BUTTON */}
      {activeTab === 'scoreboard' && (
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => {
            const isMe = player.id === myPlayerId;
            const percentage = Math.min(100, Math.round((player.score / targetScore) * 100));
            const isCurrentLeader = index === 0 && player.score > 0;
            const totalVotes = player.totalVotesReceived || (player.receivedVotesHistory?.length || 0);
            const isExpanded = Boolean(expandedPlayerIds[player.id]);
            const victims = getVictimsBreakdown(player);

            return (
              <div
                key={player.id}
                className={`p-3 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-stone-950/90 border-amber-500/40'
                    : 'bg-stone-950/50 border-stone-800'
                }`}
              >
                {/* Header Row: Position, Name, Score, and Expand Button */}
                <div className="flex items-center justify-between text-xs mb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-stone-500 w-4 text-right">
                      {index + 1}º
                    </span>
                    <span className="text-base">{player.avatar}</span>
                    <span
                      className={`font-semibold truncate max-w-[130px] sm:max-w-[180px] ${
                        isMe ? 'text-amber-300 font-bold' : 'text-stone-200'
                      }`}
                    >
                      {player.name} {isMe && '(Você)'}
                    </span>
                    {isCurrentLeader && (
                      <span title="Líder do Placar">
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </span>
                    )}

                    {/* Votos Recebidos Pill */}
                    <span className="text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded-full font-mono font-medium">
                      {totalVotes} {totalVotes === 1 ? 'voto recebido' : 'votos recebidos'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 font-mono">
                    <button
                      onClick={() => togglePlayerExpanded(player.id)}
                      className="flex items-center gap-1 text-[11px] font-sans font-medium px-2 py-0.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-amber-300 transition-colors"
                      title="Ver quem votou nesta pessoa"
                    >
                      <span>{isExpanded ? 'Recolher' : 'Ver Votos'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-amber-400" />
                      )}
                    </button>

                    {canManageScores ? (
                      <div className="flex items-center gap-1 bg-stone-900/90 px-1.5 py-1 rounded-xl border border-amber-500/40 shadow-inner" title="Ajuste livre de pontuação (Líder / Administrador)">
                        <button
                          onClick={() => adjustPlayerScore(player.id, -1)}
                          disabled={player.score <= 0}
                          className="w-6 h-6 rounded-lg flex items-center justify-center bg-stone-800 hover:bg-stone-700 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed text-stone-300 hover:text-amber-300 font-bold transition-all"
                          title="Diminuir pontuação (-1)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="font-mono font-black text-amber-200 text-sm min-w-[28px] text-center">
                          {player.score}
                        </span>

                        <button
                          onClick={() => adjustPlayerScore(player.id, 1)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center bg-stone-800 hover:bg-stone-700 active:scale-90 text-stone-300 hover:text-amber-300 font-bold transition-all"
                          title="Aumentar pontuação (+1)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] text-stone-400 font-normal pl-0.5">pts</span>
                      </div>
                    ) : (
                      <span className="font-black text-amber-200 text-sm">
                        {player.score} <span className="text-[10px] text-stone-400 font-normal">pts</span>
                      </span>
                    )}
                    <span className="text-[10px] text-stone-500 w-7 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: player.color || '#F59E0B',
                      boxShadow: percentage >= 80 ? '0 0 8px #F59E0B' : undefined,
                    }}
                  />
                </div>

                {/* EXPANDABLE ACCORDION: QUEM VOTOU NESSA PESSOA */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-stone-800/80 space-y-2 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300 font-semibold flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        Quem votou nos blefes de {player.name} ({totalVotes} votos totais):
                      </span>
                    </div>

                    {victims.length === 0 ? (
                      <p className="text-stone-500 italic text-[11px] py-1">
                        Ainda ninguém votou nos blefes deste jogador nesta partida.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {victims.map((v) => (
                          <div
                            key={v.voterId}
                            className="flex items-center justify-between p-2 rounded-lg bg-stone-900 border border-stone-800 text-[11px]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{v.voterAvatar}</span>
                              <span className="font-medium text-stone-200">{v.voterName}</span>
                            </div>
                            <span className="font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-900">
                              {v.count} {v.count === 1 ? 'voto' : 'votos'}
                            </span>
                          </div>
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

      {/* TAB 2: DEDICATED QUADRO DE VOTOS RECEBIDOS (DETAILED VICTIMS BOARD) */}
      {activeTab === 'votesBreakdown' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs text-stone-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Flame className="w-4 h-4 text-amber-400" />
              Ranking de Poder de Persuasão (Votos Recebidos nos Blefes):
            </span>
            <span className="text-[11px] text-stone-400">
              Cada voto recebido = +1 ponto somado
            </span>
          </div>

          <div className="grid gap-3">
            {[...room.players]
              .sort((a, b) => (b.totalVotesReceived || 0) - (a.totalVotesReceived || 0))
              .map((player) => {
                const totalVotes = player.totalVotesReceived || (player.receivedVotesHistory?.length || 0);
                const victims = getVictimsBreakdown(player);
                const isExpanded = Boolean(expandedPlayerIds[player.id]);

                return (
                  <div
                    key={player.id}
                    className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{player.avatar}</span>
                        <div>
                          <h4 className="font-bold text-stone-100 text-sm">
                            {player.name}
                          </h4>
                          <span className="text-[11px] text-stone-400">
                            Enganou {victims.length} {victims.length === 1 ? 'adversário diferente' : 'adversários diferentes'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
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
                          className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 transition-colors"
                          title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-stone-800/80 space-y-2 animate-fade-in text-xs">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                          Quem votou em {player.name}:
                        </h5>

                        {victims.length === 0 ? (
                          <p className="text-stone-500 italic text-xs py-1">
                            Nenhum voto recebido em blefes até o momento.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {victims.map((v) => (
                                <div
                                  key={v.voterId}
                                  className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between"
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

                            {/* Round by round list of fooled words */}
                            {player.receivedVotesHistory && player.receivedVotesHistory.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-stone-800/60">
                                <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                                  Palavras em que caíram no blefe:
                                </span>
                                <div className="space-y-1">
                                  {player.receivedVotesHistory.map((h, i) => (
                                    <div
                                      key={i}
                                      className="text-[11px] p-1.5 rounded bg-stone-900/60 text-stone-300 flex items-center justify-between"
                                    >
                                      <span className="truncate max-w-[200px]">
                                        Rodada {h.roundNumber} (<strong>{h.word}</strong>): {h.voterName}
                                      </span>
                                      <span className="text-[10px] font-mono text-amber-400 italic">
                                        "{h.bluffText.substring(0, 30)}..."
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
      )}
    </div>
  );
};
