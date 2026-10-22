import React, { useState } from 'react';
import { X, BookOpen, Award, Clock, Copy, Check } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, roomCode }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[85vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h2 className="font-serif font-bold text-base text-stone-100">
              Regras do Jogo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Room Code Quick Access */}
        {roomCode && (
          <div className="bg-stone-950 px-4 py-2 border-b border-stone-800 flex items-center justify-between text-xs">
            <span className="text-stone-400 font-mono">
              Código da sala: <strong className="text-amber-300 font-bold">{roomCode}</strong>
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1 text-stone-300 hover:text-white"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs leading-relaxed">
          {/* Overview */}
          <div className="space-y-1 text-stone-300">
            <p>
              O <strong>Jogo do Dicionário</strong> é um jogo de blefe e vocabulário: a cada rodada, uma palavra rara é sorteada. Quem não souber o significado deve inventar uma definição convincente para enganar os outros.
            </p>
          </div>

          {/* Points Table */}
          <div className="space-y-2">
            <h3 className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Pontuação
            </h3>
            <div className="space-y-1.5">
              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <strong className="text-stone-200 block">Voto no seu blefe</strong>
                  <span className="text-stone-500">Para cada adversário que votar na sua definição falsa</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm shrink-0 ml-2">+1 pt</span>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <strong className="text-stone-200 block">Acerto do dicionário real</strong>
                  <span className="text-stone-500">Se você votar na definição verdadeira</span>
                </div>
                <span className="font-mono font-bold text-amber-300 text-sm shrink-0 ml-2">+2 pts</span>
              </div>

              <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <strong className="text-stone-200 block">Bônus do Líder</strong>
                  <span className="text-stone-500">Se nenhum jogador votar na definição autêntica</span>
                </div>
                <span className="font-mono font-bold text-purple-400 text-sm shrink-0 ml-2">+3 pts</span>
              </div>
            </div>
          </div>

          {/* Round Steps */}
          <div className="space-y-2">
            <h3 className="font-semibold text-stone-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Como Funciona a Rodada
            </h3>
            <div className="space-y-1 text-stone-300">
              <p><strong>1. Escolha:</strong> O líder da rodada escolhe a palavra (sem ver o significado).</p>
              <p><strong>2. Blefe:</strong> Os outros jogadores escrevem em segredo suas definições falsas.</p>
              <p><strong>3. Votação:</strong> Todas as respostas são embaralhadas com a verdadeira. Cada jogador vota em uma opção.</p>
              <p><strong>4. Revelação:</strong> O líder libera a tela com quem votou em quem e a pontuação computada.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
