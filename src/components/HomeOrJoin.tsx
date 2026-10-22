import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  Users,
  Play,
  PlusCircle,
  ArrowRight,
  Target,
  Clock,
  Settings2,
  FileText,
  Upload,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { WordItem } from '../types/game';
import { parseImportedDictionaryText } from '../data/dictionary';
import {
  getLocalCustomWords,
  saveLocalCustomWords,
  clearLocalCustomWords,
  pushLocalCustomWordsToServer,
  deleteCustomWordsFromServer,
  subscribeToCustomWords,
} from '../utils/persistentStorage';

const AVATAR_OPTIONS = [
  '🎓', '🎭', '🦁', '🦊', '🦉', '🎩', '🐙', '🐉', '🕵️', '🧙‍♂️', '🚀', '👑',
  '🦄', '🐼', '🐯', '🧐', '📜', '🏆', '💎', '🎲', '🧠', '⚡', '🔥', '🎨'
];

const COLOR_OPTIONS = [
  { name: 'Âmbar', hex: '#F59E0B' },
  { name: 'Safira', hex: '#3B82F6' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Carmesim', hex: '#EF4444' },
  { name: 'Púrpura', hex: '#A855F7' },
  { name: 'Ciano', hex: '#06B6D4' },
];

interface HomeOrJoinProps {
  onOpenDictionary?: (tab?: 'notepad' | 'list') => void;
}

export const HomeOrJoin: React.FC<HomeOrJoinProps> = ({ onOpenDictionary }) => {
  const { createRoom, joinRoom, error, clearError } = useGame();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState<string>(() => localStorage.getItem('jdd_player_name') || '');
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem('jdd_player_avatar') || '🎓');
  const [color, setColor] = useState<string>(() => localStorage.getItem('jdd_player_color') || '#F59E0B');
  const [roomCode, setRoomCode] = useState<string>('');

  const [targetScore, setTargetScore] = useState<number>(20);
  const [submissionTimeLimit, setSubmissionTimeLimit] = useState<number>(0);
  const [votingTimeLimit, setVotingTimeLimit] = useState<number>(0);
  const [leaderBluffsRule, setLeaderBluffsRule] = useState<'always' | 'never'>('never');
  const [readingMode, setReadingMode] = useState<'visible' | 'leader_read'>('visible');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Persistent custom words
  const [loadedCustomWords, setLoadedCustomWords] = useState<WordItem[]>(() => getLocalCustomWords());
  const [exclusivePreload, setExclusivePreload] = useState<boolean>(() => getLocalCustomWords().length > 0);

  useEffect(() => {
    return subscribeToCustomWords((words) => {
      setLoadedCustomWords(words);
      if (words.length > 0) {
        setExclusivePreload(true);
      } else {
        setExclusivePreload(false);
      }
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      setMode('join');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = parseImportedDictionaryText(content);
        if (res.words.length > 0) {
          setLoadedCustomWords(res.words);
          setExclusivePreload(true);
          saveLocalCustomWords(res.words);
          pushLocalCustomWordsToServer(res.words, true).catch(() => {});
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearSavedWords = () => {
    setLoadedCustomWords([]);
    setExclusivePreload(false);
    clearLocalCustomWords();
    deleteCustomWordsFromServer().catch(() => {});
  };

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim() || 'Jogador Anônimo';
    createRoom(
      finalName,
      avatar,
      color,
      {
        targetScore,
        submissionTimeLimit,
        votingTimeLimit,
        leaderBluffsRule,
        readingMode,
      },
      loadedCustomWords || undefined,
      exclusivePreload
    );
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const finalName = name.trim() || 'Jogador Anônimo';
    joinRoom(roomCode.trim(), finalName, avatar, color);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-8 space-y-6 animate-fade-in">
      {/* Title */}
      <div className="text-center space-y-1.5">
        <h2 className="font-serif font-black text-3xl sm:text-4xl text-amber-100 tracking-tight">
          Jogo do Dicionário
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto">
          Invente definições convincentes, blefe com seus amigos e descubra o significado real.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="underline text-[11px] font-bold ml-2">
            Fechar
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-xl border border-stone-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'create'
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Criar Sala</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              mode === 'join'
                ? 'bg-amber-600 text-stone-950'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Entrar com Código</span>
          </button>
        </div>

        {/* Profile */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
              Seu Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João"
              maxLength={20}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 text-stone-100 placeholder-stone-600 outline-none text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Avatar & Cor
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {AVATAR_OPTIONS.slice(0, 16).map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    avatar === em
                      ? 'bg-amber-500/20 border border-amber-400 scale-105'
                      : 'bg-stone-950 border border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                  className={`w-5 h-5 rounded-full transition-all ${
                    color === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Body */}
        {mode === 'create' ? (
          <form onSubmit={(e) => handleCreate(e)} className="space-y-4 pt-2 border-t border-stone-800">
            {/* Target Score */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-stone-300 font-medium flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Meta de Pontos:
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {targetScore} pts
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1">
                  {[15, 20, 30, 40].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setTargetScore(pts)}
                      className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        targetScore === pts
                          ? 'bg-amber-600 text-stone-950 border-amber-500'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {pts} pts
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-0.5 text-xs">
                  <span className="text-[11px] text-stone-500">Ou digite:</span>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={targetScore}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) setTargetScore(val);
                    }}
                    className="w-16 px-2 py-0.5 rounded-lg bg-stone-950 border border-stone-800 focus:border-amber-500 text-amber-300 font-mono text-xs text-center outline-none"
                  />
                  <span className="text-[11px] text-stone-500">pontos para vencer</span>
                </div>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-stone-400 hover:text-amber-300 flex items-center gap-1 font-medium transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{showAdvanced ? 'Ocultar opções avançadas' : 'Opções de líder, tempo e leitura'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-2 p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-3 text-xs animate-fade-in">
                  <div>
                    <span className="text-stone-400 block mb-1">Líder da rodada cria blefe e pontua?</span>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { val: 'always', label: 'Sim (Obrigatório)' },
                        { val: 'never', label: 'Opcional / Não' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setLeaderBluffsRule(opt.val as any)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                            leaderBluffsRule === opt.val
                              ? 'bg-amber-600 text-stone-950 font-bold'
                              : 'bg-stone-900 border border-stone-800 text-stone-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-400 block mb-1">Tempo por rodada:</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'Livre', val: 0 },
                        { label: '45s', val: 45 },
                        { label: '60s', val: 60 },
                        { label: '90s', val: 90 },
                      ].map((t) => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => {
                            setSubmissionTimeLimit(t.val);
                            setVotingTimeLimit(t.val);
                          }}
                          className={`py-1 rounded-lg text-xs font-medium ${
                            submissionTimeLimit === t.val
                              ? 'bg-amber-600 text-stone-950 font-bold'
                              : 'bg-stone-900 border border-stone-800 text-stone-400'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-400 block mb-1">Exibição na votação:</span>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { id: 'visible', label: 'Visual (Padrão)' },
                        { id: 'leader_read', label: 'Áudio / Leitura' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setReadingMode(m.id as any)}
                          className={`py-1 px-2 rounded-lg text-xs font-medium ${
                            readingMode === m.id
                              ? 'bg-amber-600 text-stone-950 font-bold'
                              : 'bg-stone-900 border border-stone-800 text-stone-400'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Words Box */}
            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-300 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  Banco de Palavras (.txt)
                </span>
                {loadedCustomWords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSavedWords}
                    className="text-rose-400 hover:underline text-[11px]"
                  >
                    Zerar ({loadedCustomWords.length})
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer py-1.5 px-3 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>{loadedCustomWords.length > 0 ? 'Substituir .txt' : 'Importar .txt'}</span>
                  <input
                    type="file"
                    accept=".txt,.csv,.json,.tsv,text/plain"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>

                {onOpenDictionary && (
                  <button
                    type="button"
                    onClick={() => onOpenDictionary('notepad')}
                    className="text-stone-400 hover:text-stone-200 text-xs underline"
                  >
                    Bloco de notas
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              Criar Sala
            </button>
          </form>
        ) : (
          /* Join Form */
          <form onSubmit={handleJoin} className="space-y-4 pt-2 border-t border-stone-800">
            <div>
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1">
                Código da Sala
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: AURE"
                maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 focus:border-amber-500 text-amber-300 font-mono font-bold text-center text-lg tracking-widest uppercase outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Entrar na Sala
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
