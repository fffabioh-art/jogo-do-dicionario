import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Volume2, VolumeX, HelpCircle, LogOut, Copy, Check } from 'lucide-react';

interface HeaderProps {
  onOpenRules: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenRules }) => {
  const { room, isMuted, setIsMuted, leaveRoom, connectionStatus } = useGame();
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 px-3 sm:px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-serif font-black text-sm sm:text-base tracking-tight text-amber-100 block truncate">
              Jogo do Dicionário{' '}
              <span className="text-amber-400 font-sans text-[11px] sm:text-xs font-semibold tracking-normal">
                by Fabulous
              </span>
            </span>
          </div>
        </div>

        {/* Room Code Badge if in room */}
        {room && (
          <button
            type="button"
            onClick={copyRoomCode}
            title="Clique para copiar código da sala"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 text-xs transition-colors shrink-0"
          >
            <span className="text-stone-400 font-medium hidden xs:inline">Sala:</span>
            <span className="font-mono font-bold text-amber-300 tracking-wider">{room.roomCode}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-stone-400" />
            )}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title={isMuted ? 'Ativar Sons' : 'Silenciar Sons'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Rules Button */}
          <button
            type="button"
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 text-xs font-medium transition-colors"
            title="Como Jogar"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Regras</span>
          </button>

          {/* Live Indicator */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
            title={connectionStatus === 'connected' ? 'Conectado' : 'Conectando'}
          />

          {/* Prominent Leave Room Button (Mobile & Desktop) */}
          {room && (
            <button
              type="button"
              onClick={leaveRoom}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold transition-colors ml-0.5 shrink-0 active:scale-95"
              title="Sair da Sala"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-300" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
