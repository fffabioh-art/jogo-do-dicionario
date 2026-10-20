import React, { useState } from 'react';
import { X, BookOpen, Target, Clock, Award, ShieldAlert, Sparkles, Copy, Check, QrCode as QrCodeIcon, Users } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' && roomCode ? `${window.location.origin}/?room=${roomCode}` : '';

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(shareUrl || roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-stone-900 border border-amber-600/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-amber-900/40 bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-amber-200">
                Manual Oficial de Regras
              </h2>
              <p className="text-xs text-amber-400/80 font-medium">Jogo do Dicionário (by Fabulous)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prominent Active Room Code Bar (visible even with game in progress) */}
        {roomCode && (
          <div className="bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-950/90 border-b border-amber-800/40 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Sala Ativa:
              </span>
              <span className="font-mono font-black text-xl sm:text-2xl text-amber-300 tracking-widest bg-stone-950 px-2.5 py-0.5 rounded-lg border border-amber-700/60 shadow-inner">
                {roomCode}
              </span>
            </div>

            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Link da Sala'}</span>
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm leading-relaxed">
          {/* Overview */}
          <section className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-4 space-y-2">
            <h3 className="font-serif font-bold text-amber-300 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Visão Geral & Conceito
            </h3>
            <p className="text-stone-300">
              O desafio clássico de palavras desconhecidas adaptado para o ambiente digital:
              <strong className="text-amber-200 font-semibold"> blefe, intuição e criatividade</strong> para convencer os amigos e acumular pontos.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs text-stone-400">
              <div>• <strong>Participantes:</strong> 3+ jogadores (ou modo especial 2 jogadores)</div>
              <div>• <strong>Padronização:</strong> Todas as definições em CAIXA ALTA</div>
            </div>
          </section>

          {/* Scoring Table */}
          <section className="space-y-3">
            <h3 className="font-serif font-bold text-amber-300 text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Tabela Oficial de Pontuação
            </h3>
            <div className="grid gap-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950 border border-amber-500/30">
                <span className="font-mono font-black text-emerald-400 text-base px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40">
                  +1 pt
                </span>
                <div>
                  <strong className="text-stone-100 block">Voto no seu Blefe</strong>
                  <span className="text-xs text-stone-400">
                    Para cada adversário que votar na sua definição falsa inventada.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950 border border-amber-500/30">
                <span className="font-mono font-black text-amber-400 text-base px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/40">
                  +2 pts
                </span>
                <div>
                  <strong className="text-stone-100 block">Acerto do Significado Real</strong>
                  <span className="text-xs text-stone-400">
                    Para cada participante que identificar e votar corretamente na definição oficial do dicionário.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-stone-950 border border-purple-500/40">
                <span className="font-mono font-black text-purple-400 text-base px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40">
                  +3 pts
                </span>
                <div>
                  <strong className="text-stone-100 block">Bônus do Líder</strong>
                  <span className="text-xs text-stone-400">
                    Se <em>nenhum participante</em> da rodada votar no significado verdadeiro da palavra (blefe perfeito coletivo!).
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Dinâmica da Rodada */}
          <section className="space-y-3">
            <h3 className="font-serif font-bold text-amber-300 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Dinâmica da Rodada (Passo a Passo)
            </h3>
            <ol className="space-y-3 text-stone-300">
              <li className="flex gap-2.5">
                <span className="font-bold text-amber-400">1.</span>
                <div>
                  <strong className="text-amber-200">Seleção do Líder:</strong> O aplicativo escolhe um jogador como Líder em rodízio a cada rodada. O Líder pode escolher entre 3 opções sugeridas, sortear rápido ou <strong className="text-amber-300">explorar qualquer palavra de todo o banco de dados</strong>!
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-amber-400">2.</span>
                <div>
                  <strong className="text-amber-200">Apresentação do Termo:</strong> A palavra rara surge na tela de todos simultaneamente com a contagem do cronômetro.
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-amber-400">3.</span>
                <div>
                  <strong className="text-amber-200">Submissão em Caixa Alta:</strong> Cada participante digita sua resposta no campo privado em CAIXA ALTA para não haver pistas visuais ou formatações distintas.
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-amber-400">4.</span>
                <div>
                  <strong className="text-amber-200">Mural de Votação Anônima:</strong> Todas as respostas são exibidas com letras (A, B, C, D...). O app bloqueia voto no próprio blefe.
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-amber-400">5.</span>
                <div>
                  <strong className="text-amber-200">Permissão do Líder para Revelação:</strong> Após todos votarem, as respostas não abrem sozinhas! Apenas o Líder autoriza a liberação das respostas para suspense total.
                </div>
              </li>
            </ol>
          </section>

          {/* Fim de Jogo e Desempate */}
          <section className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2">
            <h3 className="font-serif font-bold text-amber-300 text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Fim de Jogo e Critério de Desempate
            </h3>
            <p className="text-stone-300 text-xs">
              A partida termina na rodada em que um ou mais jogadores alcançarem ou ultrapassarem a pontuação meta (20, 30, 40 ou 50 pontos).
            </p>
            <div className="p-2.5 bg-rose-950/30 rounded-xl border border-rose-800/40 text-xs text-rose-200">
              <strong>Morte Súbita (Rodada de Desempate):</strong> Se dois ou mais jogadores terminarem empatados na liderança acima da meta, o app dispara rodadas extras de desempate!
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Entendido, Continuar o Jogo!
          </button>
        </div>
      </div>
    </div>
  );
};
