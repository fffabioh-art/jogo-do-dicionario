import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Clock, Send, CheckCircle2, Users } from 'lucide-react';
import { formatConcept, removeAccentsKeepCedilla, isLeaderBluffing } from '../utils/textFormatting';

export const BluffPhase: React.FC = () => {
  const { room, myPlayerId, isLeader, submitBluff } = useGame();
  const [bluffText, setBluffText] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  if (!room || !room.currentRound) return null;

  const round = room.currentRound;
  const word = round.word;
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const hasSubmitted = Boolean(myPlayer?.hasSubmitted);

  const leaderIsBluffing = isLeaderBluffing(room.settings, room.players.length);

  useEffect(() => {
    if (!round.deadline) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((round.deadline! - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [round.deadline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bluffText.trim()) return;
    const finalConcept = formatConcept(bluffText);
    submitBluff(finalConcept);
  };

  const eligiblePlayers = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    if (p.id === round.leaderId && !leaderIsBluffing) return false;
    return true;
  });

  const submittedCount = eligiblePlayers.filter((p) => p.hasSubmitted).length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Word Header Card */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 text-center relative">
        {timeLeft !== null && (
          <div
            className={`absolute top-3.5 right-3.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold border ${
              timeLeft <= 10
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                : 'bg-stone-800 text-stone-300 border-stone-700'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            {timeLeft}s
          </div>
        )}

        <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block mb-1">
          Palavra da Rodada
        </span>
        <h2 className="font-serif font-black text-3xl sm:text-4xl text-amber-100 tracking-tight uppercase">
          {word.word}
        </h2>
      </div>

      {/* Main Action Area */}
      {hasSubmitted ? (
        /* Submitted Confirmation Card */
        <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-100">
              {isLeader ? 'Seu blefe do Líder foi gravado em segredo!' : 'Seu blefe foi gravado em segredo!'}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {isLeader
                ? 'Sua definição falsa entrará na votação para você tentar pontuar com os outros jogadores.'
                : 'Aguardando os outros participantes para iniciar a votação.'}
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs font-serif uppercase text-amber-200 max-w-md mx-auto text-left leading-relaxed">
            "{formatConcept(bluffText)}"
          </div>

          <div className="text-xs text-amber-400 font-mono flex items-center justify-center gap-1.5 pt-1">
            <Users className="w-3.5 h-3.5" />
            <span>Respostas recebidas: <strong>{submittedCount} de {eligiblePlayers.length}</strong></span>
          </div>
        </div>
      ) : (
        /* Submission Form (available for everyone, including Leader) */
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3">
            {isLeader && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    👑 Você é o Líder da Rodada
                  </span>
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    +1 pt por voto recebido
                  </span>
                </div>
                <p className="text-stone-300 text-[11px]">
                  Crie um significado falso para enganar os outros e pontuar! {!leaderIsBluffing && '(Opcional: se não quiser blefar nesta rodada, apenas aguarde os outros enviarem)'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                {isLeader ? 'Seu Significado / Blefe do Líder' : 'Escreva o que significa (ou invente um blefe convincente)'}
              </label>
              <textarea
                value={bluffText}
                onChange={(e) => setBluffText(removeAccentsKeepCedilla(e.target.value.toUpperCase()))}
                rows={3}
                placeholder="Ex: INSTRUMENTO USADO PARA... / DIZ-SE DAQUELE QUE... / ESPÉCIE DE..."
                className="w-full p-3 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 text-amber-100 placeholder-stone-600 outline-none text-sm resize-none uppercase font-serif"
                autoFocus
              />
              <p className="text-[11px] text-stone-500 mt-1 flex items-center justify-between">
                <span>Formatação automática em CAIXA ALTA.</span>
                {bluffText.trim() && (
                  <span className="font-mono text-amber-400 text-[10px]">
                    {bluffText.trim().length} letras
                  </span>
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={!bluffText.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {isLeader ? 'Enviar Blefe do Líder e Tentar Pontuar' : 'Enviar Blefe'}
            </button>
          </div>

          <div className="text-center text-xs text-stone-400 font-mono">
            Respostas enviadas: <strong>{submittedCount} de {eligiblePlayers.length}</strong>
          </div>
        </form>
      )}
    </div>
  );
};
