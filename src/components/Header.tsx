import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { BookOpen, Volume2, VolumeX, HelpCircle, LogOut, Copy, Check, FileText } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-stone-900/90 backdrop-blur-md border-b border-stone-800 text-stone-100 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif font-black text-base tracking-tight text-amber-100">
              Jogo do Dicionário
            </span>
          </div>
        </div>

        {/* Room Code Badge if in room */}
        {room && (
          <button
            onClick={copyRoomCode}
            title="Clique para copiar código da sala"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 text-xs transition-colors"
          >
            <span className="text-stone-400 font-medium">Sala:</span>
            <span className="font-mono font-bold text-amber-300 tracking-wider">{room.roomCode}</span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-stone-400" />
            )}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Admin Word Bank Button */}
          {onOpenDictionary && (!room || isHost) && (
            <button
              onClick={onOpenDictionary}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold border border-stone-700 transition-colors"
              title="Banco de palavras personalizado"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Banco .txt</span>
            </button>
          )}

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title={isMuted ? 'Ativar Sons' : 'Silenciar Sons'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 text-xs font-medium transition-colors"
            title="Como Jogar"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Regras</span>
          </button>

          {/* Live Indicator */}
          <span
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
            title={connectionStatus === 'connected' ? 'Conectado' : 'Conectando'}
          />

          {/* Leave Room Button */}
          {room && (
            <button
              onClick={leaveRoom}
              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors ml-1"
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
