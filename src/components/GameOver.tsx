import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Crown,
  RotateCcw,
  Home,
  Award,
  Medal,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Player } from '../types/game';
import { StickmanFigure } from './StickmanFigure';

export const GameOver: React.FC = () => {
  const { room, isHost, restartGame, leaveRoom, myPlayerId } = useGame();
  const [expandedPlayerIds, setExpandedPlayerIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const end = Date.now() + 2.5 * 1000;
    const colors = ['#f59e0b', '#10b981', '#3b82f6'];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 50,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 50,
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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 text-center animate-fade-in">
      {/* Winner Spotlight */}
      <div className="space-y-2">
        <div className="flex justify-center">
          <StickmanFigure
            avatarId={winner?.avatar}
            color={winner?.color || '#F59E0B'}
            size={56}
            state="celebrating"
            showCrown={true}
          />
        </div>
        <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block">
          Campeão da Partida
        </span>
        <h2 className="font-serif font-black text-3xl sm:text-4xl text-amber-100">
          {winner?.name}
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 font-mono">
          {winner?.score} pontos (Meta: {targetScore} pts)
        </p>
      </div>

      {/* Podium Cards (1st, 2nd, 3rd) */}
      <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto items-end pt-2">
        {/* 2nd place */}
        {sortedPlayers[1] && (
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5 order-1">
            <span className="text-[10px] text-stone-500 font-mono block">2º Lugar</span>
            <div className="flex justify-center">
              <StickmanFigure
                avatarId={sortedPlayers[1].avatar}
                color={sortedPlayers[1].color || '#3b82f6'}
                size={34}
                state="standing"
              />
            </div>
            <p className="text-xs font-semibold text-stone-200 truncate">{sortedPlayers[1].name}</p>
            <span className="font-mono text-xs text-amber-300 font-bold">{sortedPlayers[1].score} pts</span>
          </div>
        )}

        {/* 1st place */}
        <div className="p-4 rounded-xl bg-stone-900 border border-amber-500/60 shadow-md space-y-1.5 order-2 -translate-y-1">
          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
            1º Lugar
          </div>
          <div className="flex justify-center">
            <StickmanFigure
              avatarId={winner?.avatar}
              color={winner?.color || '#F59E0B'}
              size={40}
              state="celebrating"
              showCrown={true}
            />
          </div>
          <p className="text-xs font-bold text-amber-100 truncate">{winner?.name}</p>
          <span className="font-mono text-xs font-black text-amber-300">{winner?.score} pts</span>
        </div>

        {/* 3rd place */}
        {sortedPlayers[2] && (
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5 order-3">
            <span className="text-[10px] text-stone-500 font-mono block">3º Lugar</span>
            <div className="flex justify-center">
              <StickmanFigure
                avatarId={sortedPlayers[2].avatar}
                color={sortedPlayers[2].color || '#10b981'}
                size={34}
                state="standing"
              />
            </div>
            <p className="text-xs font-semibold text-stone-200 truncate">{sortedPlayers[2].name}</p>
            <span className="font-mono text-xs text-amber-300 font-bold">{sortedPlayers[2].score} pts</span>
          </div>
        )}
      </div>

      {/* 4th Place Onwards List */}
      {remainingPlayers.length > 0 && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-left space-y-2">
          <h4 className="font-semibold text-xs text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Demais Classificados
          </h4>

          <div className="space-y-1.5">
            {remainingPlayers.map((player, idx) => {
              const position = idx + 4;
              const isMe = player.id === myPlayerId;

              return (
                <div
                  key={player.id}
                  className="p-2.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-stone-500 w-4 text-right">{position}º</span>
                    <StickmanFigure
                      avatarId={player.avatar}
                      color={player.color || '#a8a29e'}
                      size={20}
                      state="standing"
                    />
                    <span className={`font-medium ${isMe ? 'text-amber-300' : 'text-stone-300'}`}>
                      {player.name} {isMe && '(Você)'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-amber-300">{player.score} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumo de Quem Votou em Quem */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 text-left space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-xs text-stone-200 uppercase tracking-wider">
              Resumo de Votos Recebidos
            </h3>
          </div>
          <span className="text-[11px] text-stone-500">
            Quem enganou quem nos blefes
          </span>
        </div>

        {room.players.every((p) => !p.totalVotesReceived && !p.receivedVotesHistory?.length) ? (
          <div className="py-4 text-center text-xs text-stone-500 italic">
            Nenhum voto em blefes de jogadores foi registrado nesta partida.
          </div>
        ) : (
          <div className="space-y-2">
            {[...room.players]
              .sort((a, b) => (b.totalVotesReceived || 0) - (a.totalVotesReceived || 0))
              .map((player) => {
                const totalVotes = player.totalVotesReceived || (player.receivedVotesHistory?.length || 0);
                const victims = getVictimsBreakdown(player);
                const isExpanded = Boolean(expandedPlayerIds[player.id]);

                return (
                  <div key={player.id} className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StickmanFigure
                          avatarId={player.avatar}
                          color={player.color || '#a8a29e'}
                          size={20}
                          state="standing"
                        />
                        <span className="font-medium text-stone-200">{player.name}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-amber-300 font-bold">
                          {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
                        </span>
                        {victims.length > 0 && (
                          <button
                            onClick={() => togglePlayerExpanded(player.id)}
                            className="text-stone-400 hover:text-stone-200 p-0.5"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && victims.length > 0 && (
                      <div className="mt-2 pt-1.5 border-t border-stone-800/60 text-[11px] text-stone-400 flex flex-wrap gap-1.5">
                        {victims.map((v) => (
                          <span key={v.voterId} className="bg-stone-900 px-2 py-0.5 rounded text-stone-300 inline-flex items-center gap-1 border border-stone-800">
                            <StickmanFigure
                              avatarId={v.voterAvatar}
                              color="#d6d3d1"
                              size={14}
                              state="standing"
                            />
                            <span>{v.voterName}</span>
                            <strong className="text-amber-400 font-mono">({v.count})</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {isHost && (
          <button
            onClick={restartGame}
            className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jogar Novamente</span>
          </button>
        )}

        <button
          onClick={leaveRoom}
          className="py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold transition-all flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          <span>Início</span>
        </button>
      </div>
    </div>
  );
};
