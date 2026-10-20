import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Users, Sparkles, Play, PlusCircle, ArrowRight, Bot, Target, Clock, Settings2 } from 'lucide-react';

const AVATAR_OPTIONS = [
  '🎓', '🎭', '🦁', '🦊', '🦉', '🎩', '🐙', '🐉', '🕵️', '🧙‍♂️', '🚀', '👑',
  '🦄', '🐼', '🐯', '🦜', '🐺', '🦹', '🧐', '📜', '🏆', '💎', '🎲', '🪐',
  '🧠', '🦚', '🦋', '🐝', '🐬', '🦔', '🐆', '⚡', '🌟', '🔥', '📚', '🎨',
  '🎪', '🔮', '⚔️', '🛡️', '🛸', '🦖'
];

const COLOR_OPTIONS = [
  { name: 'Ouro Real', hex: '#F59E0B' },
  { name: 'Âmbar Escuro', hex: '#D97706' },
  { name: 'Safira Clássica', hex: '#3B82F6' },
  { name: 'Azul Cobalto', hex: '#1D4ED8' },
  { name: 'Azul Celeste', hex: '#0EA5E9' },
  { name: 'Ciano Elétrico', hex: '#06B6D4' },
  { name: 'Turquesa Marinho', hex: '#14B8A6' },
  { name: 'Menta Tropical', hex: '#2DD4BF' },
  { name: 'Esmeralda Nobre', hex: '#10B981' },
  { name: 'Verde Floresta', hex: '#059669' },
  { name: 'Verde Lima', hex: '#84CC16' },
  { name: 'Amarelo Sol', hex: '#EAB308' },
  { name: 'Laranja Fogo', hex: '#F97316' },
  { name: 'Coral Solar', hex: '#FB923C' },
  { name: 'Carmesim Real', hex: '#EF4444' },
  { name: 'Rubi Vibrante', hex: '#E11D48' },
  { name: 'Rosa Choque', hex: '#EC4899' },
  { name: 'Fúcsia Neon', hex: '#D946EF' },
  { name: 'Púrpura Imperial', hex: '#A855F7' },
  { name: 'Ametista Violeta', hex: '#8B5CF6' },
  { name: 'Índigo Místico', hex: '#6366F1' },
  { name: 'Violeta Escuro', hex: '#7C3AED' },
  { name: 'Bronze Envelhecido', hex: '#B45309' },
  { name: 'Prata Nobre', hex: '#94A3B8' },
];

export const HomeOrJoin: React.FC = () => {
  const { createRoom, joinRoom, error, clearError } = useGame();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState<string>(() => localStorage.getItem('jdd_player_name') || '');
  const [avatar, setAvatar] = useState<string>(() => localStorage.getItem('jdd_player_avatar') || '🎓');
  const [color, setColor] = useState<string>(() => localStorage.getItem('jdd_player_color') || '#F59E0B');
  const [roomCode, setRoomCode] = useState<string>('');

  // Host configuration state
  const [targetScore, setTargetScore] = useState<number>(30);
  const [submissionTimeLimit, setSubmissionTimeLimit] = useState<number>(60);
  const [votingTimeLimit, setVotingTimeLimit] = useState<number>(45);
  const [leaderBluffsRule, setLeaderBluffsRule] = useState<'auto' | 'always' | 'never'>('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Check URL params for room code e.g. ?room=ABCD
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      setMode('join');
    }
  }, []);

  const handleCreate = (e?: React.FormEvent, withBots = false) => {
    if (e) e.preventDefault();
    const finalName = name.trim() || 'Jogador Anônimo';
    createRoom(finalName, avatar, color, {
      targetScore,
      submissionTimeLimit,
      votingTimeLimit,
      leaderBluffsRule,
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const finalName = name.trim() || 'Jogador Anônimo';
    joinRoom(roomCode.trim(), finalName, avatar, color);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 sm:py-10 animate-fade-in">
      {/* Hero Title */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          O Clássico Jogo de Blefe e Palavras Raras
        </div>
        <h2 className="font-serif font-black text-3xl sm:text-5xl text-amber-100 tracking-tight leading-tight">
          Jogo do Dicionário
        </h2>
        <p className="text-amber-300/80 text-sm sm:text-base max-w-md mx-auto">
          Invente definições falsas convincentes, engaste seus amigos e descubra os significados mais inusitados da língua portuguesa.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-sm flex items-center justify-between shadow-lg">
          <span>{error}</span>
          <button onClick={clearError} className="text-xs underline font-bold ml-2">
            Fechar
          </button>
        </div>
      )}

      {/* Main Action Card */}
      <div className="bg-stone-900/95 border border-amber-800/40 rounded-2xl p-5 sm:p-7 shadow-2xl backdrop-blur-sm">
        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-stone-950 rounded-xl mb-6 border border-stone-800">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'create'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Criar Nova Sala
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'join'
                ? 'bg-amber-600 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Entrar com Código
          </button>
        </div>

        {/* Profile Customization */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-amber-300/90 uppercase tracking-wider mb-1.5">
              Seu Nome ou Apelido
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lexicógrafo Astuto"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 text-amber-100 placeholder-stone-600 outline-none transition-all font-medium text-sm sm:text-base"
            />
          </div>

          {/* Avatar and Color Row */}
          <div>
            <label className="block text-xs font-semibold text-amber-300/90 uppercase tracking-wider mb-2">
              Escolha seu Avatar & Cor
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {AVATAR_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    avatar === em
                      ? 'bg-amber-500/30 border-2 border-amber-400 scale-110 shadow-lg'
                      : 'bg-stone-950/60 border border-stone-800 hover:border-stone-600 hover:scale-105'
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
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-stone-900 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Create Mode Configurations */}
        {mode === 'create' ? (
          <form onSubmit={(e) => handleCreate(e)} className="space-y-5">
            {/* Target Score Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-amber-300/90 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Meta de Pontos para Vencer
                </label>
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  {targetScore} pontos
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[20, 30, 40, 50].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() => setTargetScore(pts)}
                    className={`py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                      targetScore === pts
                        ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-amber-800'
                    }`}
                  >
                    {pts} pts
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Advanced Host Settings */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-amber-400/80 hover:text-amber-300 flex items-center gap-1.5 font-medium transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                {showAdvanced ? 'Ocultar configurações avançadas' : 'Configurações avançadas (Tempo, Líder)'}
              </button>

              {showAdvanced && (
                <div className="mt-3 p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-3 animate-fade-in text-xs">
                  {/* Submission Time */}
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Tempo de Envio de Blefe:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '45s', val: 45 },
                        { label: '60s', val: 60 },
                        { label: '90s', val: 90 },
                        { label: 'Sem limite', val: 0 },
                      ].map((t) => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => setSubmissionTimeLimit(t.val)}
                          className={`py-1.5 px-2 rounded-lg font-bold border ${
                            submissionTimeLimit === t.val
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-900 border-stone-800 text-stone-400'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leader bluffing rule */}
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Líder digita blefe?
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'auto', label: 'Auto (3-4 jogam)' },
                        { id: 'always', label: 'Sempre blefa' },
                        { id: 'never', label: 'Apenas aguarda' },
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setLeaderBluffsRule(r.id as any)}
                          className={`py-1.5 px-1 text-[11px] rounded-lg font-bold border ${
                            leaderBluffsRule === r.id
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-900 border-stone-800 text-stone-400'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Create Room */}
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-lg shadow-amber-900/40 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-stone-950" />
              Criar Sala & Abrir Lobby
            </button>
          </form>
        ) : (
          /* Join Mode Form */
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-amber-300/90 uppercase tracking-wider mb-1.5">
                Código da Sala (4 letras)
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ex: AURE"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 text-amber-100 placeholder-stone-600 outline-none transition-all font-mono font-bold text-center text-xl tracking-widest uppercase"
              />
            </div>

            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-stone-950 font-black text-sm sm:text-base tracking-wide uppercase shadow-lg shadow-amber-900/40 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-5 h-5" />
              Entrar na Partida
            </button>
          </form>
        )}
      </div>

      {/* Quick Info Footer */}
      <div className="mt-8 text-center text-xs text-stone-400 space-y-1">
        <p>Compartilhe o código ou o link da sala para jogar com amigos em qualquer dispositivo!</p>
        <p className="text-amber-500/80 font-medium">JOGO DO DICIONÁRIO (by Fabulous) — Versão Virtual Oficial</p>
      </div>
    </div>
  );
};
