import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Sparkles, Shuffle, Crown, Clock, Search, X, Filter, ArrowLeft, Lock } from 'lucide-react';
import { WordItem } from '../types/game';
import { getAllWords } from '../data/dictionary';

const ALPHABET = ['TODAS', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function getInitialLetter(word: string): string {
  if (!word) return '';
  const first = word.trim().charAt(0).toUpperCase();
  return first.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const WordChoicePhase: React.FC = () => {
  const { room, isLeader, selectWord } = useGame();
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('TODAS');

  // Handle ESC key to return
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
  
  // Full list of available words in the database
  const allAvailableWords = useMemo(() => {
    return getAllWords(room.customWords, room.exclusiveCustomWords);
  }, [room.customWords, room.exclusiveCustomWords]);

  // Filter full dictionary database by search and alphabetical letter (A-Z)
  const filteredWords = useMemo(() => {
    return allAvailableWords
      .filter((item) => {
        const matchesSearch =
          item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.partOfSpeech.toLowerCase().includes(searchQuery.toLowerCase());

        const initial = getInitialLetter(item.word);
        const matchesLetter =
          selectedLetter === 'TODAS' || initial === selectedLetter;

        return matchesSearch && matchesLetter;
      })
      .sort((a, b) => a.word.localeCompare(b.word, 'pt-BR', { sensitivity: 'base' }));
  }, [allAvailableWords, searchQuery, selectedLetter]);

  const handlePickWord = (word: WordItem) => {
    setShowDictionaryModal(false);
    selectWord(word);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          Rodada {round.roundNumber} {round.isTieBreak && '• MORTE SÚBITA (DESEMPATE)'}
        </div>

        {isLeader ? (
          <div>
            <h2 className="font-serif font-black text-2xl sm:text-4xl text-amber-100">
              Você é o Líder da Rodada!
            </h2>
            <p className="text-amber-300/80 text-sm max-w-lg mx-auto mt-1">
              Escolha uma palavra abaixo sem ver o significado. O significado oficial permanecerá em segredo absoluto até o término da votação!
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-amber-100">
              Aguardando o Líder
            </h2>
            <p className="text-amber-300/80 text-sm">
              <strong className="text-amber-200">{leader?.name || 'O Líder'}</strong> está folheando as páginas do dicionário...
            </p>
          </div>
        )}
      </div>

      {isLeader ? (
        /* Leader word selection cards */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {choices.map((item: WordItem, idx: number) => (
              <div
                key={item.id || idx}
                className="bg-stone-900 border border-amber-700/50 hover:border-amber-400 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-amber-950/40 group text-left"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-amber-400/80 mb-2">
                    <span className="font-mono uppercase tracking-wider text-[11px] bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                      Sugestão {idx + 1}
                    </span>
                    <span className="capitalize">{item.difficulty || 'médio'}</span>
                  </div>
                  <h3 className="font-serif font-black text-2xl text-amber-200 mb-1 tracking-tight">
                    {item.word}
                  </h3>
                  <p className="text-xs text-amber-400/90 italic mb-3">
                    {item.partOfSpeech}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 bg-stone-950/80 px-2.5 py-1 rounded-xl border border-stone-800/80 mb-4 font-mono">
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Significado em segredo</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePickWord(item)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md group-hover:bg-amber-400"
                >
                  Escolher Esta Palavra
                </button>
              </div>
            ))}
          </div>

          {/* Action Row: Full Database Browser + Randomizer */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setShowDictionaryModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-xs sm:text-sm font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search className="w-4 h-4 text-amber-400" />
              Explorar Banco de Dados ({allAvailableWords.length} palavras)
            </button>

            <button
              onClick={() => choices.length > 0 && handlePickWord(choices[0])}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400/80 hover:text-amber-200 py-2 px-3 rounded-lg hover:bg-stone-900 transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Sorteio Rápido
            </button>
          </div>
        </div>
      ) : (
        /* Non-leader waiting screen */
        <div className="bg-stone-900/90 border border-amber-800/40 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl backdrop-blur-sm max-w-lg mx-auto">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl shadow-inner">
              {leader?.avatar || '📖'}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif font-bold text-xl text-amber-100">
              {leader?.name} está escolhendo o termo
            </h3>
            <p className="text-xs sm:text-sm text-stone-300">
              O líder pode escolher entre as sugestões ou navegar por todas as palavras do dicionário!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-amber-400/80 font-mono">
            <Clock className="w-4 h-4 animate-spin text-amber-400" />
            Aguardando seleção do líder...
          </div>
        </div>
      )}

      {/* Full Database Selection Modal for the Leader */}
      {showDictionaryModal && isLeader && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDictionaryModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-stone-900 border border-amber-600/50 rounded-3xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl text-stone-100">
            {/* Modal Header with Prominent Back Button */}
            <div className="p-4 sm:p-5 border-b border-amber-900/40 bg-stone-950/90 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowDictionaryModal(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all border border-stone-700 hover:scale-105 active:scale-95"
                  title="Voltar à tela de sugestões"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Voltar</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-amber-200">
                      Banco Completo de Palavras
                    </h3>
                    <p className="text-xs text-stone-400">
                      Selecione um termo para a rodada ({filteredWords.length} encontrados) • Significado oculto para manter o segredo
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDictionaryModal(false)}
                className="p-2 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                title="Fechar e Voltar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Alphabetical Filters */}
            <div className="p-4 bg-stone-950/70 border-b border-stone-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar termo ou classe gramatical..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-stone-200 placeholder-stone-500 outline-none"
                  autoFocus
                />
              </div>

              {/* Alphabetical (A-Z) Initial Filter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-semibold flex items-center gap-1.5 text-[11px]">
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    Filtro por Letra Inicial:
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">
                    {selectedLetter === 'TODAS' ? 'Todas as Letras' : `Letra "${selectedLetter}"`} ({filteredWords.length} palavras)
                  </span>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs scrollbar-thin">
                  {ALPHABET.map((letter) => {
                    const isSelected = selectedLetter === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setSelectedLetter(letter)}
                        className={`min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-amber-600 text-stone-950 font-black shadow-md scale-105'
                            : 'bg-stone-900 text-stone-400 hover:text-stone-100 hover:bg-stone-800 border border-stone-800'
                        }`}
                      >
                        {letter === 'TODAS' ? 'Todas' : letter}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Word List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-stone-800/60">
              {filteredWords.length === 0 ? (
                <div className="py-12 text-center text-stone-500 text-sm space-y-2">
                  <p>Nenhuma palavra encontrada com os filtros atuais.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedLetter('TODAS');
                    }}
                    className="text-xs text-amber-400 underline font-semibold"
                  >
                    Limpar pesquisa e mostrar todas
                  </button>
                </div>
              ) : (
                filteredWords.map((item) => (
                  <div
                    key={item.id}
                    className="pt-3 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-black text-lg text-amber-200">
                          {item.word}
                        </span>
                        <span className="text-xs text-amber-400/80 italic">
                          ({item.partOfSpeech})
                        </span>
                        {item.isCustom && (
                          <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.2 rounded font-mono font-bold">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-950/90 border border-stone-800 text-[11px] text-amber-300/90 font-mono">
                          <Lock className="w-3 h-3 text-amber-400" />
                          Significado em segredo (revelado apenas após a votação)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePickWord(item)}
                      className="shrink-0 w-full sm:w-auto py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md group-hover:scale-105"
                    >
                      Selecionar
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer with Explicit Back Button */}
            <div className="p-3.5 sm:p-4 border-t border-stone-800 bg-stone-950/90 flex items-center justify-between text-xs">
              <span className="text-stone-400">
                Banco de Dados: <strong>{allAvailableWords.length} palavras disponíveis</strong>
              </span>
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold transition-colors border border-stone-700"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Voltar às 3 Sugestões</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
