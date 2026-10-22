import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { Search, X, ArrowLeft, Shuffle, Clock, RotateCcw } from 'lucide-react';
import { WordItem } from '../types/game';
import { getAllWords } from '../data/dictionary';
import { StickmanFigure } from './StickmanFigure';

const ALPHABET = ['TODAS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function getInitialLetter(word: string): string {
  if (!word) return '';
  const first = word.trim().charAt(0).toUpperCase();
  return first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const WordChoicePhase: React.FC = () => {
  const { room, isLeader, selectWord, rerollWordChoices } = useGame();
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('TODAS');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDictionaryModal) {
        setShowDictionaryModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDictionaryModal]);

  if (!room || !room.currentRound) return null;

  const round = room.currentRound;
  const leader = room.players.find((p) => p.id === round.leaderId);
  const choices = round.wordChoices || [];

  const allAvailableWords = useMemo(() => {
    return getAllWords(room.customWords, room.exclusiveCustomWords);
  }, [room.customWords, room.exclusiveCustomWords]);

  const filteredWords = useMemo(() => {
    return allAvailableWords
      .filter((item) => {
        const matchesSearch = item.word.toLowerCase().includes(searchQuery.toLowerCase());
        const initial = getInitialLetter(item.word);
        const matchesLetter = selectedLetter === 'TODAS' || initial === selectedLetter;
        return matchesSearch && matchesLetter;
      })
      .sort((a, b) => a.word.localeCompare(b.word, 'pt-BR', { sensitivity: 'base' }));
  }, [allAvailableWords, searchQuery, selectedLetter]);

  const handlePickWord = (word: WordItem) => {
    setShowDictionaryModal(false);
    selectWord(word);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Header Info */}
      <div className="text-center space-y-1">
        <span className="text-[11px] font-mono font-medium text-amber-400 uppercase tracking-wider">
          Rodada {round.roundNumber} {round.isTieBreak && '· Morte Súbita'}
        </span>
        <h2 className="font-serif font-black text-2xl sm:text-3xl text-stone-100">
          {isLeader ? 'Escolha a Palavra da Rodada' : 'Aguardando o Líder'}
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto">
          {isLeader
            ? 'Escolha um termo abaixo (100% aleatório). O significado oficial fica oculto até o final da votação!'
            : `${leader?.name || 'O Líder'} está escolhendo a palavra no dicionário...`}
        </p>
      </div>

      {isLeader ? (
        /* Leader 3-Choice Cards */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {choices.map((item: WordItem, idx: number) => (
              <div
                key={item.id || idx}
                className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col justify-between transition-all text-center gap-3 shadow-lg hover:shadow-amber-500/10"
              >
                <div>
                  <span className="text-[10px] font-mono text-stone-500 uppercase block mb-1">
                    Opção {idx + 1} · {item.difficulty || 'médio'}
                  </span>
                  <h3 className="font-serif font-black text-xl text-amber-200 tracking-tight">
                    {item.word}
                  </h3>
                </div>

                <button
                  onClick={() => handlePickWord(item)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                >
                  Escolher
                </button>
              </div>
            ))}
          </div>

          {/* Action Row: Re-roll 3 options & Full Database Browser */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <button
              onClick={rerollWordChoices}
              type="button"
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium transition-colors active:scale-95"
              title="Sortear 3 opções totalmente novas e aleatórias"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sortear Outras 3 Palavras</span>
            </button>

            <button
              onClick={() => setShowDictionaryModal(true)}
              type="button"
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-amber-300 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Explorar banco ({allAvailableWords.length})</span>
            </button>

            {choices.length > 0 && (
              <button
                onClick={() => handlePickWord(choices[Math.floor(Math.random() * choices.length)])}
                type="button"
                className="inline-flex items-center gap-1 py-2 px-3 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Sortear Rápido</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Non-Leader Waiting Card */
        <div className="bg-stone-900/70 border border-stone-800/80 rounded-2xl p-8 text-center space-y-4 max-w-md mx-auto shadow-xl">
          <div className="flex justify-center">
            <StickmanFigure
              avatarId={leader?.avatar || 'palito_classico'}
              color={leader?.color || '#3b82f6'}
              size={56}
              state="standing"
              showCrown={true}
            />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-200">
              {leader?.name} está escolhendo o termo
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Assim que o líder selecionar a palavra, a fase de blefe começará para todos.
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 font-mono pt-2">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Aguardando seleção...</span>
          </div>
        </div>
      )}

      {/* Dictionary Browser Modal */}
      {showDictionaryModal && isLeader && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDictionaryModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-stone-100">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDictionaryModal(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span>Voltar</span>
                </button>
                <span className="font-semibold text-sm text-stone-200">
                  Banco de Palavras ({filteredWords.length})
                </span>
              </div>

              <button
                onClick={() => setShowDictionaryModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Letter Filter */}
            <div className="p-3 bg-stone-950/60 border-b border-stone-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar termo..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 placeholder-stone-500 outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-thin">
                {ALPHABET.map((letter) => {
                  const isSelected = selectedLetter === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setSelectedLetter(letter)}
                      className={`min-w-[26px] h-6 px-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-stone-950'
                          : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {letter === 'TODAS' ? 'Todas' : letter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Word List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-stone-800/60">
              {filteredWords.length === 0 ? (
                <div className="py-8 text-center text-stone-500 text-xs">
                  Nenhuma palavra encontrada com os filtros atuais.
                </div>
              ) : (
                filteredWords.map((item) => (
                  <div
                    key={item.id}
                    className="pt-2 first:pt-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-serif font-black text-base text-amber-200">
                        {item.word}
                      </span>
                      {item.isCustom && (
                        <span className="text-[10px] text-purple-400 font-mono ml-2">
                          (Custom)
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handlePickWord(item)}
                      className="py-1 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider"
                    >
                      Selecionar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
