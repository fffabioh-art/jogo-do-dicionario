import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import QRCode from 'qrcode';
import { DictionaryAdminModal } from './DictionaryAdminModal';
import {
  Copy,
  Check,
  QrCode as QrCodeIcon,
  Crown,
  Bot,
  Play,
  Users,
  Target,
  Clock,
  UserX,
  FileText,
  BookOpen,
  Trash2,
} from 'lucide-react';

export const Lobby: React.FC = () => {
  const { room, isHost, myPlayerId, updateSettings, addBot, removeBot, kickPlayer, startGame, resetDictionary } = useGame();

  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDictAdmin, setShowDictAdmin] = useState(false);
  const [dictTab, setDictTab] = useState<'notepad' | 'list'>('notepad');
  const [showConfirmResetLobby, setShowConfirmResetLobby] = useState(false);

  const roomCode = room?.roomCode || '';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?room=${roomCode}` : '';

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#1c1917',
          light: '#fef3c7',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [shareUrl]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!room) return null;

  const activePlayers = room.players;
  const canStart = activePlayers.length >= 2;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Room Header Card */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block">
            Sala de Jogo
          </span>
          <h2 className="font-serif font-black text-2xl text-stone-100">
            Lobby de Espera
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Compartilhe o código para os outros jogadores entrarem.
          </p>
        </div>

        {/* Room Code + Actions */}
        <div className="flex items-center gap-2 bg-stone-950 p-2 rounded-xl border border-stone-800">
          <span className="font-mono font-black text-2xl tracking-widest text-amber-300 px-2">
            {roomCode}
          </span>
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Ver QR Code"
          >
            <QrCodeIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Players & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Players List (2 columns on desktop) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h3 className="font-semibold text-stone-300 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Jogadores ({activePlayers.length}/10)</span>
            </h3>

            {isHost && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={addBot}
                  disabled={activePlayers.length >= 10}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-purple-300 text-xs font-medium transition-colors disabled:opacity-40"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>+ Bot</span>
                </button>
                {activePlayers.some((p) => p.isBot) && (
                  <button
                    onClick={removeBot}
                    className="text-stone-400 hover:text-rose-400 text-xs px-2 py-1"
                  >
                    - Bot
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activePlayers.map((player) => {
              const isMe = player.id === myPlayerId;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-900/80 border border-stone-800 group"
                  style={{
                    borderLeftColor: player.color || '#F59E0B',
                    borderLeftWidth: '3px',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{player.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-xs text-stone-200 truncate">
                          {player.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] text-amber-400">
                            (Você)
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {player.isHost ? 'Host' : player.isBot ? 'Bot' : 'Jogador'}
                      </span>
                    </div>
                  </div>

                  {isHost && !player.isHost && (
                    <button
                      onClick={() => kickPlayer(player.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-400 p-1 transition-all"
                      title="Remover jogador"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {activePlayers.length < 2 && (
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-200/90 text-xs">
              Mínimo de 2 participantes para iniciar a partida. Adicione um bot ou convide um amigo!
            </div>
          )}
        </div>

        {/* Room Settings (1 column on desktop) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-stone-300 text-xs flex items-center gap-1.5">
            <Target className="w-4 h-4 text-amber-400" />
            <span>Configurações</span>
          </h3>

          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
            {/* Target Score */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-stone-400">Meta de Vitória:</span>
                <span className="font-mono font-bold text-amber-300">
                  {room.settings.targetScore} pts
                </span>
              </div>
              {isHost ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-1">
                    {[15, 20, 30, 40].map((pts) => (
                      <button
                        key={pts}
                        onClick={() => updateSettings({ targetScore: pts })}
                        className={`py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                          room.settings.targetScore === pts
                            ? 'bg-amber-600 text-stone-950'
                            : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {pts}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-stone-500">Ou digite:</span>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={room.settings.targetScore}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) updateSettings({ targetScore: val });
                      }}
                      className="w-16 px-2 py-0.5 rounded-lg bg-stone-950 border border-stone-800 focus:border-amber-500 text-amber-300 font-mono text-xs text-center outline-none"
                    />
                    <span className="text-[11px] text-stone-500">pontos para vencer</span>
                  </div>
                </div>
              ) : (
                <p className="text-stone-500 text-[11px]">
                  Primeiro a atingir {room.settings.targetScore} pontos vence
                </p>
              )}
            </div>

            {/* Leader Bluffing Setting */}
            <div className="pt-2 border-t border-stone-800/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-stone-400">Líder cria blefe e pontua?</span>
                <span className="font-medium text-amber-300">
                  {room.settings.leaderBluffsRule === 'always' ? 'Sim' : 'Opcional'}
                </span>
              </div>
              {isHost ? (
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { val: 'always', label: 'Sim (Obrigatório)' },
                    { val: 'never', label: 'Opcional / Não' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => updateSettings({ leaderBluffsRule: opt.val as any })}
                      className={`py-1 px-2 rounded-lg text-[11px] font-medium transition-all ${
                        (room.settings.leaderBluffsRule || 'never') === opt.val
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-[11px]">
                  {room.settings.leaderBluffsRule === 'always'
                    ? 'O líder da rodada também cria um blefe e tenta pontuar'
                    : 'O líder pode optar por blefar ou apenas mediar'}
                </p>
              )}
            </div>

            {/* Time limit */}
            <div className="pt-2 border-t border-stone-800/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-stone-400">Tempo de Resposta:</span>
                <span className="font-mono text-stone-300">
                  {room.settings.submissionTimeLimit === 0 ? 'Sem limite' : `${room.settings.submissionTimeLimit}s`}
                </span>
              </div>
              {isHost && (
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: 'Livre', val: 0 },
                    { label: '45s', val: 45 },
                    { label: '60s', val: 60 },
                    { label: '90s', val: 90 },
                  ].map((t) => (
                    <button
                      key={t.val}
                      onClick={() =>
                        updateSettings({
                          submissionTimeLimit: t.val,
                          votingTimeLimit: t.val,
                        })
                      }
                      className={`py-1 rounded-lg text-xs font-medium transition-all ${
                        room.settings.submissionTimeLimit === t.val
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reading Mode */}
            <div className="pt-2 border-t border-stone-800/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-stone-400">Exibição:</span>
                <span className="text-stone-300 font-medium">
                  {room.settings.readingMode === 'leader_read' ? 'Áudio (Lido pelo líder)' : 'Visual'}
                </span>
              </div>
              {isHost && (
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { id: 'visible', label: 'Visual (Padrão)' },
                    { id: 'leader_read', label: 'Áudio / Leitura' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => updateSettings({ readingMode: m.id as any })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all ${
                        (room.settings.readingMode || 'visible') === m.id
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Words Info for Host */}
            {isHost && (
              <div className="pt-2 border-t border-stone-800/60 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDictTab('notepad');
                    setShowDictAdmin(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Importar Banco (.txt)</span>
                </button>

                {room.customWords && room.customWords.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 pt-1">
                    <span>{room.customWords.length} palavras ativas</span>
                    <button
                      onClick={() => setShowConfirmResetLobby(true)}
                      className="text-rose-400 hover:underline"
                    >
                      Zerar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Button */}
          {isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Iniciar Partida</span>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-center text-xs text-stone-400">
              Aguardando o host iniciar a partida...
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-800 rounded-2xl p-5 max-w-xs w-full text-center space-y-3"
          >
            <h3 className="font-bold text-sm text-stone-200">
              QR Code da Sala
            </h3>
            {qrCodeUrl && (
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto rounded-xl p-2 bg-stone-100"
              />
            )}
            <p className="font-mono font-bold text-amber-300 text-sm">
              Código: {roomCode}
            </p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 rounded-lg bg-stone-800 text-stone-300 text-xs font-medium hover:bg-stone-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Reset confirmation modal */}
      {showConfirmResetLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h4 className="font-bold text-sm text-stone-200">Zerar banco de palavras?</h4>
            <p className="text-xs text-stone-400">
              Isso removerá as {room.customWords?.length || 0} palavras cadastradas da sala.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowConfirmResetLobby(false)}
                className="flex-1 py-2 rounded-lg bg-stone-800 text-stone-300 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  resetDictionary();
                  setShowConfirmResetLobby(false);
                }}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dictionary Modal */}
      {isHost && (
        <DictionaryAdminModal
          isOpen={showDictAdmin}
          defaultTab={dictTab}
          onClose={() => setShowDictAdmin(false)}
        />
      )}
    </div>
  );
};
