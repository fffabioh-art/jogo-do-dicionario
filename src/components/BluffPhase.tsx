import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Clock, Send, CheckCircle2, Lightbulb, Crown, Sparkles, Users, Type } from 'lucide-react';
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

  // Determine if the leader bluffs this round (independent of which player is viewing)
  const leaderIsBluffing = isLeaderBluffing(room.settings, room.players.length);

  // Timer countdown hook
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
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Word Header Card */}
      <div className="bg-gradient-to-b from-stone-900 to-amber-950/40 border border-amber-600/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Timer Pill */}
        {timeLeft !== null ? (
          <div
            className={`absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border transition-colors ${
              timeLeft <= 10
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                : 'bg-stone-900/90 text-amber-300 border-amber-700/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {timeLeft}s
          </div>
        ) : (
          <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-semibold border bg-stone-950/80 text-amber-300/90 border-amber-700/50">
            <Clock className="w-3 h-3 text-amber-400" />
            Sem limite • Aguarda todos
          </div>
        )}

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400/90">
            Termo Selecionado
          </span>
          <h2 className="font-serif font-black text-4xl sm:text-5xl text-amber-100 tracking-tight uppercase">
            {word.word}
          </h2>
          <p className="text-sm font-medium text-amber-300/80 italic">
            ({word.partOfSpeech})
          </p>
        </div>
      </div>

      {/* Main Action Area */}
      {isLeader && !leaderIsBluffing ? (
        /* Leader waiting view (when leader does not bluff) */
        <div className="bg-stone-900/90 border border-amber-800/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto text-2xl">
            👑
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-xl text-amber-200">
              Você é o Líder da Rodada!
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto">
              Regra ativa: <strong>Líder não digita blefe</strong>.
              Aguarde os outros <strong>{eligiblePlayers.length} participantes</strong> enviarem suas definições em segredo.
            </p>
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs text-purple-200">
            <strong>🎯 Seu Objetivo de Líder:</strong> Torça para que <em>nenhum</em> jogador vote na definição correta na próxima fase para garantir <strong>+3 pontos de bônus</strong>!
          </div>

          {/* Submission status bar */}
          <div className="pt-2 text-xs text-amber-400 flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span>Definições recebidas: <strong>{submittedCount} de {eligiblePlayers.length}</strong></span>
          </div>
        </div>
      ) : hasSubmitted ? (
        /* Submitted Confirmation Card */
        <div className="bg-stone-900/90 border border-emerald-600/40 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-xl text-stone-100">
              Seu blefe foi gravado em segredo!
            </h3>
            <p className="text-xs sm:text-sm text-stone-400">
              Aguardando os outros participantes enviarem suas definições para iniciar o mural de votação.
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs font-mono font-medium text-amber-200 uppercase max-w-md mx-auto text-left leading-relaxed">
            "{formatConcept(bluffText)}"
          </div>

          <div className="text-xs text-amber-400 font-semibold flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            <span>Progresso da sala: <strong>{submittedCount} de {eligiblePlayers.length}</strong></span>
          </div>
        </div>
      ) : (
        /* Submission Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-stone-900/95 border border-amber-800/40 rounded-3xl p-5 sm:p-7 shadow-xl space-y-4">
            {/* Caixa Alta & Ponto Final Requirement Badge */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <Type className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Regra Oficial: <strong>Sem acentos ou til</strong> (apenas <strong>Ç</strong> permitido) • <strong>CAIXA ALTA</strong> • <strong>Ponto final</strong> obrigatório (adicionado automaticamente se não colocado). Acentos e tis são removidos para igualar ao dicionário.
                </span>
              </div>

              {bluffText.trim() && (
                <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-stone-950/80 border border-stone-800 text-xs">
                  <span className="text-stone-400">Prévia padronizada:</span>
                  <span className="font-mono text-amber-200 font-bold truncate">
                    "{formatConcept(bluffText)}"
                  </span>
                  <span className="text-[10px] text-emerald-400 shrink-0 font-medium">
                    {bluffText.trim().endsWith('.') ? '✓ Ponto preservado' : '+ Ponto automático'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-300/90 uppercase tracking-wider mb-2">
                Campo de Escrita Privado (Sua Definição ou Blefe)
              </label>
              <textarea
                value={bluffText}
                onChange={(e) => setBluffText(removeAccentsKeepCedilla(e.target.value.toUpperCase()))}
                rows={3}
                placeholder="EX: DIZ-SE DO PASSARO MARINHO... / QUALIDADE DAQUELE QUE... / ANTIGO UTENSILIO DE TECELAGEM..."
                className="w-full p-4 rounded-2xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 text-amber-100 placeholder-stone-600 outline-none text-sm sm:text-base resize-none transition-all uppercase font-medium"
                autoFocus
              />
            </div>

            {/* Conselhos do Lexicógrafo */}
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/30 rounded-xl text-xs text-stone-300 space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                Dica do Lexicógrafo:
              </div>
              <p className="text-[11px] text-stone-400">
                Use estilo conciso de dicionário (ex.: <em>"QUALIDADE DE...", "INSTRUMENTO USADO PARA...", "ESPÉCIE DE..."</em>). Quanto mais verossímil soarem as palavras, mais adversários você enganará!
              </p>
            </div>

            <button
              type="submit"
              disabled={!bluffText.trim()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-stone-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-lg shadow-amber-950/50 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Confirmar e Enviar em Segredo
            </button>
          </div>

          <div className="text-center text-xs text-stone-400">
            Respostas enviadas: <strong>{submittedCount} de {eligiblePlayers.length}</strong>
          </div>
        </form>
      )}
    </div>
  );
};
