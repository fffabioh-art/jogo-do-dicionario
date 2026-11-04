import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  Users,
  Play,
  PlusCircle,
  ArrowRight,
  Target,
  Settings2,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { STICKMAN_PRESETS, StickmanFigure } from './StickmanFigure';

const COLOR_OPTIONS = [
  // Vermelhos & Rosas
  { name: 'Carmesim', hex: '#EF4444' },
  { name: 'Rosa Choque', hex: '#F43F5E' },
  { name: 'Coral', hex: '#FB7185' },
  { name: 'Rosa Chiclete', hex: '#EC4899' },
  { name: 'Fúcsia', hex: '#D946EF' },

  // Roxos & Violetas
  { name: 'Púrpura', hex: '#A855F7' },
  { name: 'Violeta Elétrico', hex: '#8B5CF6' },
  { name: 'Índigo', hex: '#6366F1' },

  // Azuis & Cianos
  { name: 'Safira', hex: '#3B82F6' },
  { name: 'Azul Céu', hex: '#0EA5E9' },
  { name: 'Ciano', hex: '#06B6D4' },
  { name: 'Azul Petróleo', hex: '#0F766E' },

  // Verdes
  { name: 'Verde Mar', hex: '#14B8A6' },
  { name: 'Menta', hex: '#059669' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Lima Neon', hex: '#84CC16' },
  { name: 'Oliva', hex: '#65A30D' },

  // Amarelos & Laranjas
  { name: 'Amarelo Ouro', hex: '#EAB308' },
  { name: 'Âmbar', hex: '#F59E0B' },
  { name: 'Laranja Neon', hex: '#F97316' },

  // Terrosos & Tons Neutros
  { name: 'Caramelo', hex: '#B45309' },
  { name: 'Terra', hex: '#78350F' },
  { name: 'Prata / Neve', hex: '#E2E8F0' },
  { name: 'Grafite', hex: '#94A3B8' },
];

export const HomeOrJoin: React.FC = () => {
  const {
    createRoom,
    joinRoom,
    error,
    clearError,
    savedReconnectInfo,
    rejoinSavedRoom,
    clearSavedReconnectInfo,
  } = useGame();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState<string>(() => localStorage.getItem('jdd_player_name') || '');
  const [avatar, setAvatar] = useState<string>(
    () => localStorage.getItem('jdd_player_avatar') || 'palito_classico'
  );
  const [color, setColor] = useState<string>(
    () => localStorage.getItem('jdd_player_color') || '#F59E0B'
  );
  const [roomCode, setRoomCode] = useState<string>('');

  const [targetScore, setTargetScore] = useState<number>(20);
  const [submissionTimeLimit, setSubmissionTimeLimit] = useState<number>(0);
  const [votingTimeLimit, setVotingTimeLimit] = useState<number>(0);
  const [leaderBluffsRule, setLeaderBluffsRule] = useState<'always' | 'never'>('never');
  const [readingMode, setReadingMode] = useState<'visible' | 'leader_read'>('visible');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase());
      setMode('join');
    }
  }, []);

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = name.trim() || 'Jogador Anônimo';
    createRoom(finalName, avatar, color, {
      targetScore,
      submissionTimeLimit,
      votingTimeLimit,
      leaderBluffsRule,
      readingMode,
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const finalName = name.trim() || 'Jogador Anônimo';
    joinRoom(roomCode.trim(), finalName, avatar, color);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-8 space-y-5 animate-fade-in">
      {/* Title */}
      <div className="text-center space-y-1.5">
        <h2 className="font-serif font-black text-3xl sm:text-4xl text-amber-100 tracking-tight">
          Jogo do Dicionário{' '}
          <span className="text-amber-400 font-sans text-lg sm:text-xl font-bold block sm:inline">
            by Fabulous
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 max-w-sm mx-auto">
          Invente definições convincentes, blefe com seus amigos e descubra o significado real.
        </p>
      </div>

      {/* Quick Reconnect Card (For players who disconnected / fell out of the room) */}
      {savedReconnectInfo && (
        <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 shadow-lg space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl bg-stone-950 border flex items-center justify-center shrink-0"
                style={{ borderColor: savedReconnectInfo.color || '#10B981' }}
              >
                <StickmanFigure
                  avatarId={savedReconnectInfo.avatar || 'palito_classico'}
                  color={savedReconnectInfo.color || '#10B981'}
                  size={28}
                  state="running"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  Caiu da partida? Volte com seus pontos!
                </span>
                <h3 className="text-sm font-bold text-stone-100">
                  Sala <span className="font-mono text-amber-300">{savedReconnectInfo.roomCode}</span> ·{' '}
                  {savedReconnectInfo.playerName}
                </h3>
                <p className="text-[11px] text-emerald-200/80">
                  Pontos preservados: <strong className="font-mono">{savedReconnectInfo.score} pts</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSavedReconnectInfo}
              className="p-1 text-stone-400 hover:text-stone-200 rounded-lg"
              title="Dispensar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={rejoinSavedRoom}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Voltar à Sala {savedReconnectInfo.roomCode} (Pontos Preservados)</span>
          </button>
        </div>
      )}

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

          {/* Destaque do Corredor Selecionado (Grande / Avatar em Destaque) */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-950/70 border border-stone-800/80 shadow-inner">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-2">
              Seu Corredor
            </span>
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-b from-stone-900 to-stone-950 border-2 flex items-center justify-center shadow-xl transition-all duration-300 relative overflow-hidden"
              style={{
                borderColor: color,
                boxShadow: `0 0 22px ${color}44`,
              }}
            >
              {/* Glow ambiente com a cor selecionada */}
              <div
                className="absolute inset-0 opacity-20 blur-xl pointer-events-none"
                style={{ backgroundColor: color }}
              />

              {/* Bonequinho bem maior em destaque */}
              <StickmanFigure
                avatarId={avatar}
                color={color}
                size={58}
                state="running"
                className="relative z-10"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Escolha seu Personagem
              </label>
            </div>

            {/* 24 Stickman Shapes Grid (No names, pure visual forms) */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mb-3 max-h-56 overflow-y-auto p-1.5 rounded-2xl bg-stone-950 border border-stone-800/80 scrollbar-thin">
              {STICKMAN_PRESETS.map((preset) => {
                const isSelected = avatar === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAvatar(preset.id)}
                    className={`h-12 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-2 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                        : 'bg-stone-900/60 border border-stone-800 hover:border-stone-700 hover:bg-stone-800'
                    }`}
                  >
                    <StickmanFigure
                      avatarId={preset.id}
                      color={isSelected ? color : '#78716c'}
                      size={26}
                      state={isSelected ? 'running' : 'standing'}
                    />
                  </button>
                );
              })}
            </div>

            {/* Color Palette (24 bolinhas de cores para variar bem) */}
            <div className="pt-2 border-t border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span>Cor do seu corredor:</span>
                <span className="text-[10px] font-mono text-stone-500">
                  {COLOR_OPTIONS.find((c) => c.hex.toLowerCase() === color.toLowerCase())?.name || ''}
                </span>
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-12 gap-2 p-2 rounded-xl bg-stone-950 border border-stone-800/80">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = color.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                      style={{ backgroundColor: c.hex }}
                      className={`w-6 h-6 rounded-full transition-all mx-auto ${
                        isSelected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-stone-950 scale-110 shadow-md'
                          : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                    />
                  );
                })}
              </div>
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
                <span className="font-mono font-bold text-amber-300">{targetScore} pts</span>
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
                    <span className="text-stone-400 block mb-1">Regra do Líder da rodada:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { val: 'never', label: 'Não escreve e não vota (Padrão)' },
                        { val: 'always', label: 'Escreve e vota' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setLeaderBluffsRule(opt.val as any)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium text-center transition-all ${
                            leaderBluffsRule === opt.val
                              ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
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

            <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/90 flex items-start gap-2.5 text-[11px] text-stone-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-emerald-300">Proteção contra queda:</strong> Se você caiu da sala, basta digitar o código acima e usar o <strong>mesmo nome</strong> para recuperar seu lugar e todos os seus pontos!
              </span>
            </div>

            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              Entrar / Reconectar na Sala
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
