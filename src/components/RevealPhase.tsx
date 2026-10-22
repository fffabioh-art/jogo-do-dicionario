import React from 'react';
import { useGame } from '../context/GameContext';
import { BluffEntry, Player } from '../types/game';
import { formatConcept } from '../utils/textFormatting';
import {
  Award,
  BookOpen,
  Crown,
  CheckCircle2,
  Trophy,
  Sparkles,
  ShieldAlert,
  ArrowRightLeft,
  UserCheck,
  UserX,
  Bell,
  Check,
  FastForward,
  Plus,
  Minus,
} from 'lucide-react';

export const RevealPhase: React.FC = () => {
  const {
    room,
    myPlayerId,
    isLeader,
    isHost,
    adjustPlayerScore,
    setPlayerScore,
    adjustRoundPoints,
    setRoundPoints,
    requestNextRound,
    confirmNextRound,
    forceNextRound,
  } = useGame();

  if (!room || !room.currentRound) return null;

  const round = room.currentRound;
  const word = round.word;
  const bluffs = round.bluffs || [];
  const votes = round.votes || {};
  const scoreDetails = round.scoreDetails || [];
  const leader = room.players.find((p) => p.id === round.leaderId);
  const isFinalRound = Boolean(round.isFinalRound || room.winnerId);

  // Find real entry
  const realEntry = bluffs.find((b) => b.isReal);
  const realOptionId = realEntry?.id;

  // Check if any non-leader player voted for real (condition for leader sweep bonus)
  const nonLeaderVotes = Object.entries(votes).filter(([voterId]) => voterId !== round.leaderId);
  const correctVoters = nonLeaderVotes
    .filter(([_, optId]) => optId === realOptionId)
    .map(([voterId]) => room.players.find((p) => p.id === voterId))
    .filter(Boolean) as Player[];

  const leaderSweep = correctVoters.length === 0 && nonLeaderVotes.length > 0;

  // Helper to get voters for an option
  const getVotersForOption = (optionId: string): Player[] => {
    return Object.entries(votes)
      .filter(([_, optId]) => optId === optionId)
      .map(([voterId]) => room.players.find((p) => p.id === voterId))
      .filter(Boolean) as Player[];
  };

  // Helper to get author details of a bluff
  const getAuthor = (authorId: string): Player | null => {
    return room.players.find((p) => p.id === authorId) || null;
  };

  // Build who voted for whom list
  const voteMappings = Object.entries(votes).map(([voterId, chosenOptionId]) => {
    const voter = room.players.find((p) => p.id === voterId);
    const chosenOption = bluffs.find((b) => b.id === chosenOptionId);
    const author = chosenOption ? getAuthor(chosenOption.authorId) : null;
    const isReal = chosenOption?.isReal || false;

    return {
      voter,
      chosenOption,
      author,
      isReal,
    };
  }).filter((m) => m.voter && m.chosenOption);

  const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
  const nextRoundRequested = Boolean(round.nextRoundRequested);
  const confirmations = round.nextRoundConfirmations || [];
  const hasConfirmed = confirmations.includes(myPlayerId);
  const requester = room.players.find((p) => p.id === round.nextRoundRequesterId) || leader;

  const [editingRoundPtsPlayerId, setEditingRoundPtsPlayerId] = React.useState<string | null>(null);
  const [editRoundPtsValue, setEditRoundPtsValue] = React.useState<string>('');
  const [editingTotalScorePlayerId, setEditingTotalScorePlayerId] = React.useState<string | null>(null);
  const [editTotalScoreValue, setEditTotalScoreValue] = React.useState<string>('');

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Top Banner: Celebrates round or final victory */}
      <div className="text-center space-y-2">
        {isFinalRound ? (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Trophy className="w-4 h-4 text-amber-400" />
            Rodada Final Concluída • Meta de Vitória Atingida!
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Resultado da Rodada {round.roundNumber}
          </div>
        )}

        <h2 className="font-serif font-black text-3xl sm:text-5xl text-amber-100 tracking-tight uppercase">
          {word.word}
        </h2>
      </div>

      {/* Leader Sweep Bonus Highlight if applicable */}
      {leaderSweep && leader && (
        <div className="bg-purple-950/70 border border-purple-500/50 rounded-2xl p-4 text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-purple-300 font-black text-xs sm:text-sm uppercase tracking-wider">
            <Crown className="w-4 h-4 text-amber-400" />
            +3 PONTOS • GOLPE MESTRE DO LÍDER!
          </div>
          <p className="text-xs text-purple-200">
            Nenhum jogador votou no significado real! O líder <strong className="text-amber-300">{leader.name}</strong> faturou <strong>+3 pontos de bônus</strong>!
          </p>
        </div>
      )}

      {/* Tie Break Alert if active */}
      {room.isTieBreakActive && (
        <div className="bg-rose-950/70 border border-rose-500/50 rounded-2xl p-3 text-center text-xs text-rose-200 flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <strong>MORTE SÚBITA ATIVA:</strong> Dois ou mais jogadores empatados na liderança acima da meta!
        </div>
      )}

      {/* ACTION BANNER (TOP) */}
      <div className="sticky top-2 z-20">
        {isFinalRound ? (
          /* FINAL ROUND PROMINENT CALL TO ACTION */
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto">
              <div className="p-2.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
              </div>
              <div>
                <h4 className="font-serif font-black text-amber-100 text-base">
                  Meta Atingida! Fim de Partida
                </h4>
                <p className="text-xs text-stone-300">
                  Analise os votos desta rodada e avance para o pódio com a classificação final.
                </p>
              </div>
            </div>

            {isLeader || isHost ? (
              <button
                onClick={requestNextRound}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shrink-0 border border-amber-300"
              >
                <Trophy className="w-4 h-4 fill-stone-950" />
                <span>Ver Pódio e Classificação Final</span>
              </button>
            ) : (
              <div className="text-xs text-amber-300 font-medium bg-amber-950/80 px-3.5 py-2 rounded-xl border border-amber-800 shrink-0 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Aguardando o Líder ({leader?.name}) abrir o pódio final...</span>
              </div>
            )}
          </div>
        ) : !nextRoundRequested ? (
          /* STANDARD ADVANCE BANNER */
          isLeader || isHost ? (
            <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-600/40 bg-stone-900/95 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-amber-100 text-sm">
                    {isLeader ? 'Você é o Líder da Rodada' : 'Você é o Host da Sala'}
                  </h4>
                  <p className="text-xs text-stone-400">
                    Clique para convocar os jogadores para a próxima rodada.
                  </p>
                </div>
              </div>

              <button
                onClick={requestNextRound}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
              >
                <Bell className="w-4 h-4" />
                <span>Solicitar Próxima Rodada</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-stone-950/90 border border-stone-800 text-center text-xs text-amber-300/90 flex items-center justify-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Aguardando o Líder ({leader?.name || 'da rodada'}) solicitar a próxima rodada...</span>
            </div>
          )
        ) : (
          /* CONFIRMATION READY STATE */
          <div className="bg-stone-900/95 border-2 border-amber-500 rounded-2xl p-4 shadow-xl text-center space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 text-left">
                <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                <div>
                  <h4 className="font-bold text-amber-100 text-sm">Próxima Rodada Solicitada</h4>
                  <p className="text-xs text-stone-400">
                    O líder {requester?.name} chamou. Confirme se está pronto:
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-2.5 py-1 rounded-full border border-amber-800">
                Confirmados: {confirmations.length} de {activePlayers.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              {activePlayers.map((p) => {
                const isReady = confirmations.includes(p.id);
                const isMe = p.id === myPlayerId;
                return (
                  <div
                    key={p.id}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-1 text-[11px] ${
                      isReady
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    <span className="truncate">{p.avatar} {p.name} {isMe && '(Você)'}</span>
                    {isReady ? (
                      <span className="text-emerald-400 font-bold">✓</span>
                    ) : (
                      <span className="text-stone-500">...</span>
                    )}
                  </div>
                );
              })}
            </div>

            {!hasConfirmed ? (
              <button
                onClick={confirmNextRound}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 mx-auto"
              >
                <Check className="w-4 h-4" />
                <span>Estou Pronto! Continuar</span>
              </button>
            ) : (
              <div className="text-xs text-emerald-400 font-medium">
                ✓ Você confirmou! Aguardando os demais jogadores ({confirmations.length}/{activePlayers.length})...
              </div>
            )}

            {isHost && confirmations.length < activePlayers.length && (
              <button
                onClick={forceNextRound}
                className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 transition-colors underline pt-1"
              >
                <FastForward className="w-3 h-3 text-amber-400" />
                Forçar início imediato (Host)
              </button>
            )}
          </div>
        )}
      </div>

      {/* QUEM VOTOU EM QUEM */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <h3 className="font-serif font-bold text-sm sm:text-base text-amber-200 flex items-center gap-2 uppercase tracking-wide">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            Quem Votou em Quem
          </h3>
          <span className="text-xs text-stone-400">
            {voteMappings.length} {voteMappings.length === 1 ? 'voto' : 'votos'}
          </span>
        </div>

        {voteMappings.length === 0 ? (
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 text-center text-xs text-stone-500 italic">
            Nenhum voto foi registrado nesta rodada.
          </div>
        ) : (
          <div className="grid gap-2">
            {voteMappings.map((mapItem, idx) => {
              const { voter, chosenOption, author, isReal } = mapItem;
              if (!voter || !chosenOption) return null;

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs transition-all ${
                    isReal
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-stone-950 border-stone-800/80 text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{voter.avatar}</span>
                    <span className="font-bold text-stone-100">
                      {voter.name}
                    </span>
                    <span className="text-stone-500 font-mono text-[11px]">votou na</span>
                    <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-stone-900 border border-stone-700 text-amber-300 text-xs">
                      Opção {chosenOption.letterLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isReal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                        <UserCheck className="w-3.5 h-3.5" />
                        Acertou o Dicionário! (+2 pts)
                      </span>
                    ) : author ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-950/60 text-amber-200 text-xs">
                        <UserX className="w-3.5 h-3.5 text-amber-400" />
                        Caiu no blefe de <strong>{author.name}</strong> (+1 pt para {author.name})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-stone-900 text-stone-400 text-xs">
                        Blefe sem autor (+0 pts)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revealed Options Cards */}
      <div className="grid gap-3">
        {bluffs.map((entry: BluffEntry, index: number) => {
          const isReal = entry.isReal;
          const voters = getVotersForOption(entry.id);
          const author = getAuthor(entry.authorId);
          const isMyBluff = entry.authorId === myPlayerId;

          return (
            <div
              key={entry.id || index}
              className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                isReal
                  ? 'bg-gradient-to-r from-emerald-950/80 via-emerald-900/30 to-emerald-950/80 border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-lg'
                  : 'bg-stone-900/80 border-stone-800'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                      isReal
                        ? 'bg-emerald-400 text-stone-950'
                        : 'bg-stone-950 text-amber-300 border border-stone-800'
                    }`}
                  >
                    {entry.letterLabel || String.fromCharCode(65 + index)}
                  </span>

                  {isReal ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Significado Real do Dicionário (+2 pts)
                    </span>
                  ) : author ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-300/90 font-medium">
                      Blefe de: <strong>{author.name}</strong> {isMyBluff && '(Você)'}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400 italic">
                      Blefe do Sistema
                    </span>
                  )}
                </div>

                {!isReal && author && voters.length > 0 && (
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    +{voters.length} {voters.length === 1 ? 'pt' : 'pts'} para {author.name}
                  </span>
                )}
              </div>

              <p
                className={`text-sm sm:text-base font-serif leading-relaxed uppercase font-medium ${
                  isReal ? 'text-emerald-100' : 'text-stone-200'
                }`}
              >
                {formatConcept(entry.text)}
              </p>

              <div className="pt-2 border-t border-stone-800/60 flex items-center gap-2 text-xs">
                <span className="text-stone-400 text-[11px]">Votos recebidos:</span>
                {voters.length === 0 ? (
                  <span className="text-stone-500 italic text-[11px]">Nenhum voto</span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {voters.map((v) => (
                      <span
                        key={v.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 text-xs"
                      >
                        <span>{v.avatar}</span>
                        <span>{v.name}</span>
                        {isReal && (
                          <span className="text-emerald-400 font-bold font-mono ml-0.5">+2</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Example Sentence Note if available */}
      {word.exampleSentence && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-xs space-y-1 text-stone-300">
          <strong className="text-amber-300 flex items-center gap-1.5 text-[11px]">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Exemplo de Uso:
          </strong>
          <p className="italic text-stone-200 font-serif">"{word.exampleSentence}"</p>
        </div>
      )}

      {/* Round Score Summary Table with manual +/- adjustments for round points and total scores */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-800 pb-2">
          <h3 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Pontuação da Rodada & Placar Atual
          </h3>
          {(isHost || isLeader) && (
            <span className="text-[10px] text-amber-400/90 font-medium">
              Definição manual liberada (Host/Líder) · Use - / + ou clique nos números
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {scoreDetails.map((detail) => {
            const player = room.players.find((p) => p.id === detail.playerId);
            if (!player) return null;
            const isMe = player.id === myPlayerId;
            const canEdit = isHost || isLeader;

            return (
              <div
                key={detail.playerId}
                className="p-3 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{player.avatar}</span>
                    <span className={`font-semibold ${isMe ? 'text-amber-300' : 'text-stone-200'}`}>
                      {player.name} {isMe && '(Você)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-stone-900 font-mono text-xs gap-2 flex-wrap">
                  {/* Pontos da Rodada */}
                  <div className="flex items-center gap-1 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-800" title="Pontos obtidos nesta rodada">
                    <span className="text-[10px] text-stone-400 font-sans mr-0.5">Rodada:</span>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustRoundPoints(player.id, -1)}
                          disabled={detail.pointsEarned <= 0}
                          className="w-5 h-5 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-300 hover:text-emerald-300 text-[10px]"
                          title="Diminuir pontos da rodada (-1)"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        {editingRoundPtsPlayerId === player.id ? (
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={editRoundPtsValue}
                            onChange={(e) => setEditRoundPtsValue(e.target.value)}
                            onBlur={() => {
                              const v = parseInt(editRoundPtsValue, 10);
                              if (!isNaN(v) && v >= 0) setRoundPoints(player.id, v);
                              setEditingRoundPtsPlayerId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const v = parseInt(editRoundPtsValue, 10);
                                if (!isNaN(v) && v >= 0) setRoundPoints(player.id, v);
                                setEditingRoundPtsPlayerId(null);
                              }
                              if (e.key === 'Escape') setEditingRoundPtsPlayerId(null);
                            }}
                            autoFocus
                            className="w-9 text-center font-mono font-bold text-emerald-300 bg-stone-950 border border-emerald-500 rounded text-xs py-0.5 outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRoundPtsPlayerId(player.id);
                              setEditRoundPtsValue(String(detail.pointsEarned));
                            }}
                            className="font-mono font-bold text-emerald-400 text-xs min-w-[24px] text-center hover:underline"
                            title="Clique para definir manualmente os pontos da rodada"
                          >
                            +{detail.pointsEarned}
                          </button>
                        )}
                        <button
                          onClick={() => adjustRoundPoints(player.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-emerald-300 text-[10px]"
                          title="Aumentar pontos da rodada (+1)"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-emerald-400 font-bold">+{detail.pointsEarned} pts</span>
                    )}
                  </div>

                  {/* Placar Total */}
                  <div className="flex items-center gap-1 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-800" title="Placar Total Acumulado">
                    <span className="text-[10px] text-stone-400 font-sans mr-0.5">Total:</span>
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjustPlayerScore(player.id, -1)}
                          disabled={player.score <= 0}
                          className="w-5 h-5 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 disabled:opacity-20 text-stone-300 hover:text-amber-300 text-[10px]"
                          title="Diminuir total (-1)"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        {editingTotalScorePlayerId === player.id ? (
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={editTotalScoreValue}
                            onChange={(e) => setEditTotalScoreValue(e.target.value)}
                            onBlur={() => {
                              const v = parseInt(editTotalScoreValue, 10);
                              if (!isNaN(v) && v >= 0) setPlayerScore(player.id, v);
                              setEditingTotalScorePlayerId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const v = parseInt(editTotalScoreValue, 10);
                                if (!isNaN(v) && v >= 0) setPlayerScore(player.id, v);
                                setEditingTotalScorePlayerId(null);
                              }
                              if (e.key === 'Escape') setEditingTotalScorePlayerId(null);
                            }}
                            autoFocus
                            className="w-10 text-center font-mono font-bold text-amber-300 bg-stone-950 border border-amber-500 rounded text-xs py-0.5 outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTotalScorePlayerId(player.id);
                              setEditTotalScoreValue(String(player.score));
                            }}
                            className="font-mono font-bold text-amber-300 text-xs min-w-[24px] text-center hover:underline"
                            title="Clique para definir o total manualmente"
                          >
                            {player.score} pts
                          </button>
                        )}
                        <button
                          onClick={() => adjustPlayerScore(player.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 text-[10px]"
                          title="Aumentar total (+1)"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-amber-300 font-bold">{player.score} pts</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
