import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Volume2, VolumeX, HelpCircle, LogOut, Copy, Check, Users, Database, FileText } from 'lucide-react';

interface HeaderProps {
  onOpenRules: () => void;
  onOpenDictionary?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenRules, onOpenDictionary }) => {
  const { room, isHost, isMuted, setIsMuted, leaveRoom, connectionStatus } = useGame();
  const [copied, setCopied] = useState(false);

  const copyRoomCode = () => {
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-amber-950/90 backdrop-blur-md border-b border-amber-900/50 text-amber-100 px-4 py-3 shadow-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-amber-950 shadow-inner ring-1 ring-amber-300/30">
            <BookOpen className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <h1 className="font-serif font-black text-lg sm:text-xl tracking-tight text-amber-200 leading-tight">
              Jogo do Dicionário
            </h1>
            <p className="text-[10px] sm:text-xs text-amber-400/80 font-medium tracking-wider uppercase">
              por Fabulous
            </p>
          </div>
        </div>

        {/* Room Code Badge if in room (visible on mobile and desktop) */}
        {room && (
          <div className="flex items-center gap-1.5 sm:gap-2 bg-amber-900/60 border border-amber-700/60 rounded-full px-2 sm:px-3 py-1">
            <span className="text-[10px] sm:text-xs text-amber-300/80 font-semibold uppercase tracking-wider hidden xs:inline">Sala:</span>
            <span className="font-mono font-bold text-amber-100 tracking-widest text-xs sm:text-sm">{room.roomCode}</span>
            <button
              onClick={copyRoomCode}
              title="Copiar código da sala"
              className="text-amber-400 hover:text-amber-200 transition-colors p-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Administrator Dictionary Button (always available when not in room OR when host) */}
          {onOpenDictionary && (!room || isHost) && (
            <button
              onClick={onOpenDictionary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:scale-105 active:scale-95"
              title="Painel do Administrador: Upar banco de dados via Bloco de Notas (.txt)"
            >
              <FileText className="w-3.5 h-3.5 text-stone-950 flex-shrink-0" />
              <span>Admin: Banco .txt</span>
            </button>
          )}

          {/* Connection indicator */}
          <div
            title={`Status: ${connectionStatus === 'connected' ? 'Conectado em tempo real' : 'Conectando...'}`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-900/40 border border-amber-800/40 text-xs"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-500 animate-ping'
              }`}
            />
            <span className="text-[11px] text-amber-300/70 hidden md:inline">
              {connectionStatus === 'connected' ? 'Ao vivo' : 'Conectando'}
            </span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg bg-amber-900/50 hover:bg-amber-800/60 text-amber-300 hover:text-amber-100 transition-colors border border-amber-800/60"
            title={isMuted ? 'Ativar Sons' : 'Silenciar Sons'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Rules Modal Button */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 hover:text-amber-100 transition-colors border border-amber-500/40 text-xs sm:text-sm font-semibold"
          >
            <HelpCircle className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Regras</span>
          </button>

          {/* Leave Room Button */}
          {room && (
            <button
              onClick={leaveRoom}
              className="p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 hover:text-rose-100 transition-colors border border-rose-800/40"
              title="Sair da Sala"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
