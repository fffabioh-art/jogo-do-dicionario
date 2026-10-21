import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import QRCode from 'qrcode';
import { DictionaryAdminModal } from './DictionaryAdminModal';
import { getAllWords } from '../data/dictionary';
import {
  Copy,
  Check,
  QrCode as QrCodeIcon,
  Crown,
  Bot,
  UserPlus,
  Play,
  Settings,
  Users,
  Target,
  Clock,
  Sparkles,
  UserX,
  Database,
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
        width: 280,
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Top Banner with Room Code and Fast Sharing */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border border-amber-800/40 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold flex items-center justify-center sm:justify-start gap-1.5">
              <Users className="w-4 h-4" />
              Lobby de Espera
            </span>
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-amber-100">
              Convoque os Jogadores!
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md">
              Compartilhe o código ou mostre o QR Code para seus amigos entrarem pelo celular ou computador.
            </p>
          </div>

          {/* Room Code Display Card */}
          <div className="flex flex-col items-center gap-2 bg-stone-950/90 border border-amber-500/40 rounded-2xl p-4 shadow-xl min-w-[220px]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90">
              Código da Sala
            </span>
            <div className="font-mono font-black text-3xl sm:text-4xl tracking-widest text-amber-300 drop-shadow-md">
              {roomCode}
            </div>

            <div className="flex items-center gap-2 mt-1 w-full">
              <button
                onClick={copyInviteLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-300 hover:text-amber-100 transition-colors"
                title="Mostrar QR Code"
              >
                <QrCodeIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Players List (left) + Host Settings (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List (2 columns on large screen) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg text-amber-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Participantes ({activePlayers.length})
            </h3>
            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  onClick={addBot}
                  disabled={activePlayers.length >= 8}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/50 text-purple-300 hover:text-purple-100 transition-all disabled:opacity-50"
                  title="Adiciona um autor clássico virtual para blefar e votar"
                >
                  <Bot className="w-3.5 h-3.5" />
                  + Adicionar Bot
                </button>
                {activePlayers.some((p) => p.isBot) && (
                  <button
                    onClick={removeBot}
                    className="text-xs text-rose-400/80 hover:text-rose-300 px-2 py-1"
                  >
                    - Remover Bot
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activePlayers.map((player) => {
              const isMe = player.id === myPlayerId;
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/90 border border-stone-800/80 shadow-md relative overflow-hidden group"
                  style={{
                    borderLeftColor: player.color,
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner border border-white/10"
                      style={{ backgroundColor: `${player.color}25` }}
                    >
                      {player.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-stone-100 truncate max-w-[130px]">
                          {player.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-0.5">
                        {player.isHost && (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                            <Crown className="w-3 h-3" /> Host
                          </span>
                        )}
                        {player.isBot && (
                          <span className="inline-flex items-center gap-1 text-purple-400 font-semibold">
                            <Bot className="w-3 h-3" /> Bot
                          </span>
                        )}
                        {!player.isHost && !player.isBot && (
                          <span>Jogador</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kick action for host */}
                  {isHost && !player.isHost && (
                    <button
                      onClick={() => kickPlayer(player.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-rose-400 p-1.5 transition-all"
                      title="Expulsar da sala"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Minimum players notice */}
          {activePlayers.length < 3 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-200 text-xs flex items-center justify-between">
              <span>
                💡 <strong>Dica:</strong> O Jogo do Dicionário brilha com 3 ou mais participantes!
                {isHost && ' Clique em "+ Adicionar Bot" para testar a mecânica agora mesmo!'}
              </span>
            </div>
          )}
        </div>

        {/* Settings & Host Start Panel (1 column) */}
        <div className="space-y-4">
          <h3 className="font-serif font-bold text-lg text-amber-200 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Parâmetros da Partida
          </h3>

          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg text-xs">
            {/* Target Score - Editable by host, default 20 points */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Meta de Vitória:
                </span>
                <span className="font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  {room.settings.targetScore} pts {room.settings.targetScore === 20 ? '(Padrão)' : ''}
                </span>
              </div>
              {isHost ? (
                <>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[15, 20, 30, 40].map((pts) => (
                      <button
                        key={pts}
                        onClick={() => updateSettings({ targetScore: pts })}
                        className={`py-1.5 rounded-lg font-bold border transition-all ${
                          room.settings.targetScore === pts
                            ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {pts} {pts === 20 ? '★' : ''}
                      </button>
                    ))}
                  </div>
                  {/* Editable Custom Score */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-950 border border-stone-800">
                    <span className="text-[11px] text-stone-400">Editar pontuação livre:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={room.settings.targetScore}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            updateSettings({ targetScore: Math.min(200, val) });
                          }
                        }}
                        className="w-16 px-2 py-1 rounded bg-stone-900 border border-amber-600/50 text-amber-300 font-mono font-bold text-center text-xs outline-none focus:border-amber-400"
                      />
                      <span className="text-[11px] text-amber-300 font-semibold">pts</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-stone-400">Definido pelo Host: {room.settings.targetScore} pontos para o campeão</p>
              )}
            </div>

            {/* Submission Time Limit - Default 0 (Sem limite, apenas aguarda) */}
            <div className="pt-2 border-t border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Tempo da Rodada:
                </span>
                <span className="font-mono font-bold text-amber-400">
                  {room.settings.submissionTimeLimit === 0 ? 'Sem limite (Aguardar)' : `${room.settings.submissionTimeLimit}s`}
                </span>
              </div>
              {isHost && (
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Sem limite ★', val: 0 },
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
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        room.settings.submissionTimeLimit === t.val
                          ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Leader Bluff Rule */}
            <div className="pt-2 border-t border-stone-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-300">
                  Líder da Rodada digita blefe?
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {room.settings.leaderBluffsRule === 'always'
                    ? 'Líder digita sempre'
                    : 'Líder NÃO digita (Padrão)'}
                </span>
              </div>
              {isHost ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'never', label: 'NÃO Digita (Padrão)', desc: 'Líder não digita' },
                    { id: 'always', label: 'Digita', desc: 'Líder digita e vota' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => updateSettings({ leaderBluffsRule: opt.id as any })}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center ${
                        (room.settings.leaderBluffsRule || 'never') === opt.id
                          ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md font-black scale-[1.02]'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[9px] opacity-75 font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 text-xs">
                  {room.settings.leaderBluffsRule === 'always'
                    ? 'Líder digita sempre'
                    : 'Líder NÃO digita (Padrão)'}
                </p>
              )}
            </div>

            {/* Reading Mode / Exibição dos Significados (Visual vs Leitura Líder) */}
            <div className="pt-2 border-t border-stone-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-300">
                  Modo de Exibição dos Significados:
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {room.settings.readingMode === 'leader_read'
                    ? 'Áudio / Leitura Líder'
                    : 'Visual (Padrão)'}
                </span>
              </div>
              {isHost ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      id: 'visible',
                      label: 'Modo Visual (Padrão)',
                      desc: 'Enunciados visíveis na tela de todos',
                    },
                    {
                      id: 'leader_read',
                      label: 'Áudio / Leitura Líder',
                      desc: 'Lido em voz alta; tela só tem A, B, C...',
                    },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => updateSettings({ readingMode: m.id as any })}
                      className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center text-center ${
                        (room.settings.readingMode || 'visible') === m.id
                          ? 'bg-amber-600 text-stone-950 border-amber-400 shadow-md font-black scale-[1.02]'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="text-[9px] opacity-75 font-normal mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-stone-400 text-xs">
                  {room.settings.readingMode === 'leader_read'
                    ? 'Modo Áudio / Leitura do Líder: Os enunciados serão lidos pelo líder em voz alta; os votantes verão apenas as alternativas A, B, C...'
                    : 'Modo Visual: Todos os participantes veem os textos completos das definições na tela.'}
                </p>
              )}
            </div>

            {/* Dictionary / Word Database Management for Host */}
            {isHost && (
              <div className="pt-2 border-t border-stone-800 space-y-2">
                {/* THE REQUESTED PROMINENT NOTEPAD BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setDictTab('notepad');
                    setShowDictAdmin(true);
                  }}
                  className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  title="Carregar arquivo .txt do Bloco de Notas com palavras e definições"
                >
                  <FileText className="w-4 h-4 text-stone-950 flex-shrink-0" />
                  <span>Add Banco de Dados via Bloco de Notas (.txt)</span>
                </button>

                {/* If custom words exist: Show option to ZERAR BANCO */}
                {room.customWords && room.customWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmResetLobby(true)}
                    className="w-full py-2 px-3 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800/80 text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    title="Apaga as palavras customizadas da sala para que possa adicionar outro banco limpo"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Zerar Banco Atual ({room.customWords.length} palavras)</span>
                  </button>
                )}

                {/* Option to explore words with return capability */}
                <button
                  type="button"
                  onClick={() => {
                    setDictTab('list');
                    setShowDictAdmin(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-stone-100 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  title="Visualizar e pesquisar todas as palavras ativas"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Ver Palavras Cadastradas ({room.customWords?.length || 0} palavras)
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Start Game Action */}
          {isHost ? (
            <button
              onClick={startGame}
              disabled={!canStart}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-stone-950 font-black text-base uppercase tracking-wider shadow-xl shadow-amber-950/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-stone-950" />
              Iniciar Partida ({activePlayers.length}/8)
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 text-center space-y-1">
              <span className="text-amber-400 font-semibold text-xs animate-pulse block">
                Aguardando o Host iniciar a partida...
              </span>
              <p className="text-[11px] text-stone-400">
                O líder da primeira rodada será sorteado automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal for Instant Living Room Joining */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-amber-600/40 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="font-serif font-bold text-lg text-amber-200">
              Escaneie para Entrar na Sala
            </h3>
            <p className="text-xs text-stone-400">
              Aponte a câmera do seu smartphone para o QR Code abaixo:
            </p>

            <div className="bg-amber-100 p-4 rounded-xl inline-block shadow-inner">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code da Sala" className="w-56 h-56 mx-auto" />
              )}
            </div>

            <div className="font-mono text-xl font-black text-amber-400 tracking-widest">
              SALA: {roomCode}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Confirmation modal for resetting database from Lobby */}
      {showConfirmResetLobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border-2 border-rose-600/80 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center text-stone-100">
            <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <Trash2 className="w-7 h-7 text-rose-400" />
            </div>

            <div className="space-y-1">
              <h4 className="font-serif font-black text-lg text-rose-200">
                Zerar Banco de Dados?
              </h4>
              <p className="text-xs text-stone-300">
                Deseja apagar todas as <strong>{room?.customWords?.length || 0} palavras</strong> importadas da sala para pôr um novo banco de dados via Bloco de Notas?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmResetLobby(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDictionary();
                  setShowConfirmResetLobby(false);
                  setDictTab('notepad');
                  setShowDictAdmin(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4 text-stone-950" />
                <span>Sim, Zerar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dictionary Admin Modal */}
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
