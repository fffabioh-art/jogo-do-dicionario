import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import confetti from 'canvas-confetti';
import { Trophy, Crown, Sparkles, RotateCcw, Home, Award, Medal } from 'lucide-react';

export const GameOver: React.FC = () => {
  const { room, isHost, restartGame, leaveRoom } = useGame();

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

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-8 text-center animate-fade-in">
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

      {/* Podium Cards (1st, 2nd, 3rd) */}
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

      {/* Round History Preview */}
      {room.roundHistory.length > 0 && (
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 max-w-lg mx-auto text-left space-y-2">
          <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Palavras Desafiadas na Partida ({room.roundHistory.length})
          </h4>
          <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
            {room.roundHistory.map((item, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                <div>
                  <strong className="text-amber-200 font-serif mr-2">{item.word}</strong>
                  <span className="text-stone-400 text-[11px] truncate inline-block max-w-[200px] align-bottom">
                    {item.realDefinition}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono">Rodada {item.roundNumber}</span>
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
