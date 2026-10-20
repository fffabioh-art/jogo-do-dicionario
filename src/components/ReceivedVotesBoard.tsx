import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, ReceivedVoteDetail } from '../types/game';
import {
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Crown,
  Flame,
  Shield,
  HelpCircle,
} from 'lucide-react';

export const ReceivedVotesBoard: React.FC = () => {
  const { room, myPlayerId } = useGame();
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});

  if (!room || room.players.length === 0) return null;

  const toggleExpand = (playerId: string) => {
    setExpandedPlayerIds((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  // Sort players by totalVotesReceived descending
  const sortedPlayers = [...room.players].sort((a, b) => {
    const votesA = a.totalVotesReceived || 0;
    const votesB = b.totalVotesReceived || 0;
    if (votesB !== votesA) return votesB - votesA;
    return b.score - a.score;
  });

  const totalAllVotes = sortedPlayers.reduce((acc, p) => acc + (p.totalVotesReceived || 0), 0);

  return (
    <div className="w-full bg-stone-900/95 border-2 border-amber-600/50 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-serif font-black text-base sm:text-lg text-amber-200 uppercase tracking-wide">
              Quadro de Votos Recebidos nos Blefes
            </h3>
            <p className="text-xs text-stone-400">
              Veja quem mais enganou os amigos e expanda para descobrir quem votou em cada blefe
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-800 self-start sm:self-auto">
          {totalAllVotes} {totalAllVotes === 1 ? 'voto total' : 'votos totais nos blefes'}
        </span>
      </div>

      {/* Players List with Expandable Voters */}
      <div className="space-y-3">
        {sortedPlayers.map((player: Player, index: number) => {
          const isExpanded = Boolean(expandedPlayerIds[player.id]);
          const voteCount = player.totalVotesReceived || 0;
          const voteHistory: ReceivedVoteDetail[] = player.receivedVotesHistory || [];
          const isMe = player.id === myPlayerId;
          const isTopBluffer = index === 0 && voteCount > 0;

          return (
            <div
              key={player.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isMe
                  ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-stone-950/90 border-stone-800'
              }`}
            >
              {/* Player Summary Header Row */}
              <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-stone-500 text-xs w-5 text-right">
                    {index + 1}º
                  </span>

                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/10 shrink-0"
                    style={{ backgroundColor: `${player.color}25` }}
                  >
                    {player.avatar}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm sm:text-base text-stone-100">
                        {player.name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                          Você
                        </span>
                      )}
                      {isTopBluffer && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                          <Crown className="w-3 h-3 text-amber-400" />
                          Mestre do Blefe
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-400">
                      Pontuação atual: {player.score} pts
                    </span>
                  </div>
                </div>

                {/* Vote Count Badge and Expand Action */}
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-black text-sm sm:text-base px-3 py-1 rounded-xl bg-amber-950/90 border border-amber-700/60 text-amber-300 shadow-sm">
                    {voteCount} {voteCount === 1 ? 'voto recebido' : 'votos recebidos'}
                  </span>

                  <button
                    onClick={() => toggleExpand(player.id)}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <span>{isExpanded ? 'Recolher' : 'Ver Quem Votou'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-amber-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Panel: Detailed Who Voted Breakdown */}
              {isExpanded && (
                <div className="p-4 bg-stone-950 border-t border-stone-800/80 space-y-2.5 animate-fade-in text-xs">
                  <div className="font-semibold text-stone-300 flex items-center justify-between border-b border-stone-800 pb-2">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Users className="w-3.5 h-3.5" />
                      Histórico de Jogadores que Caíram no Blefe de {player.name}:
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {voteHistory.length} registros
                    </span>
                  </div>

                  {voteHistory.length === 0 ? (
                    <div className="py-4 text-center text-stone-500 italic">
                      Nenhum adversário votou nos blefes de {player.name} ainda.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {voteHistory.map((detail, dIdx) => (
                        <div
                          key={detail.id || dIdx}
                          className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{detail.voterAvatar}</span>
                            <span className="font-bold text-stone-200">
                              {detail.voterName}
                            </span>
                            <span className="text-stone-500">votou no blefe na</span>
                            <span className="font-mono text-amber-300 font-bold bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                              Rodada {detail.roundNumber} ({detail.word})
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-400 italic font-serif line-clamp-1 max-w-xs truncate">
                            "{detail.bluffText}"
                          </div>
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
    </div>
  );
};
