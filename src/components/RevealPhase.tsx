import React from 'react';
import { useGame } from '../context/GameContext';
import { BluffEntry, Player } from '../types/game';
import { formatConcept } from '../utils/textFormatting';
import {
  Award,
  BookOpen,
  Crown,
  CheckCircle2,
  Users,
  ArrowRight,
  Sparkles,
  Flame,
  ShieldAlert,
  ArrowRightLeft,
  UserCheck,
  UserX,
  Bell,
  Check,
  FastForward,
} from 'lucide-react';

export const RevealPhase: React.FC = () => {
  const { room, myPlayerId, isLeader, isHost, requestNextRound, confirmNextRound, forceNextRound } = useGame();

  if (!room || !room.currentRound) return null;

  const round = room.currentRound;
  const word = round.word;
  const bluffs = round.bluffs || [];
  const votes = round.votes || {};
  const scoreDetails = round.scoreDetails || [];
  const leader = room.players.find((p) => p.id === round.leaderId);

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

  // Reusable Next Round requester & confirmation panel (displayed at TOP and bottom)
  const renderNextRoundControl = (location: 'top' | 'bottom') => {
    const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
    const nextRoundRequested = Boolean(round.nextRoundRequested);
    const confirmations = round.nextRoundConfirmations || [];
    const hasConfirmed = confirmations.includes(myPlayerId);
    const requester = room.players.find((p) => p.id === round.nextRoundRequesterId) || leader;

    if (!nextRoundRequested) {
      if (isLeader || isHost) {
        return (
          <div
            className={`p-4 sm:p-5 rounded-3xl border-2 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
              location === 'top'
                ? 'bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-amber-500 shadow-amber-950/40 ring-2 ring-amber-500/20'
                : 'bg-stone-900/90 border-amber-600/50'
            }`}
          >
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-inner shrink-0">
                <Bell className="w-6 h-6 animate-bounce" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
                  {location === 'top' ? 'Destaque no Topo' : 'Avançar Rodada'}
                </div>
                <h4 className="font-serif font-black text-amber-100 text-base sm:text-lg">
                  {isLeader ? 'Você é o Líder da Rodada!' : 'Você é o Host da Partida!'}
                </h4>
                <p className="text-xs text-stone-300 max-w-md">
                  Clique no botão para convocar todos os jogadores e avançar para o próximo desafio.
                </p>
              </div>
            </div>

            <button
              onClick={requestNextRound}
              className="w-full sm:w-auto py-3.5 px-7 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-950/60 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5 whitespace-nowrap border border-amber-300 shrink-0"
            >
              <Bell className="w-5 h-5 fill-stone-950" />
              <span>Solicitar Próxima Rodada</span>
            </button>
          </div>
        );
      }

      return (
        <div className="p-3.5 rounded-2xl bg-stone-950/90 border border-stone-800 text-center text-xs text-amber-300/90 flex items-center justify-center gap-2.5 shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span>
            Aguardando o Líder <strong className="text-amber-200">({leader?.name || 'da rodada'})</strong> solicitar a próxima rodada...
          </span>
        </div>
      );
    }

    return (
      <div
        className={`bg-gradient-to-r from-amber-950/95 via-stone-900 to-amber-950/95 border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-2xl text-center space-y-4 animate-fade-in ${
          location === 'top' ? 'ring-4 ring-amber-500/30' : ''
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-900/60 pb-3">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/50 shrink-0">
              <Bell className="w-6 h-6 animate-bounce text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif font-black text-amber-100 text-base sm:text-lg">
                  Próxima Rodada Solicitada!
                </h4>
                <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  Confirmação Coletiva
                </span>
              </div>
              <p className="text-xs text-stone-300">
                O Líder <strong>{requester?.name}</strong> solicitou o avanço. Confirme se você está pronto:
              </p>
            </div>
          </div>

          <div className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-3 py-1.5 rounded-full border border-amber-800">
            Confirmados: {confirmations.length} de {activePlayers.length}
          </div>
        </div>

        {/* Players Readiness Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {activePlayers.map((p) => {
            const isReady = confirmations.includes(p.id);
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 transition-all ${
                  isReady
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200 shadow-sm'
                    : 'bg-stone-950 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{p.avatar}</span>
                  <span className={`font-semibold truncate max-w-[80px] ${isMe ? 'text-amber-300 font-bold' : ''}`}>
                    {p.name}
                  </span>
                </div>
                {isReady ? (
                  <span className="font-bold text-[10px] text-emerald-400 bg-emerald-900/70 px-1.5 py-0.5 rounded border border-emerald-600/50 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Pronto
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-500 animate-pulse">
                    Pendente...
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Confirmation Action for Current Player */}
        {!hasConfirmed ? (
          <button
            onClick={confirmNextRound}
            className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-stone-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto border border-emerald-300"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Estou Pronto! Continuar para Próxima Rodada</span>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-300 font-semibold bg-emerald-950/50 py-2.5 px-4 rounded-xl border border-emerald-800/50 max-w-md mx-auto">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>Você já confirmou! Aguardando os demais jogadores ({confirmations.length}/{activePlayers.length})...</span>
          </div>
        )}

        {/* Host force override option */}
        {isHost && confirmations.length < activePlayers.length && (
          <div className="pt-1">
            <button
              onClick={forceNextRound}
              className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-amber-300 transition-colors underline"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-400" />
              Forçar início imediato (Host override caso alguém esteja ausente)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Resultado & Revelação Oficial • Rodada {round.roundNumber}
        </div>
        <h2 className="font-serif font-black text-3xl sm:text-5xl text-amber-100 tracking-tight uppercase">
          {word.word}
        </h2>
        <p className="text-amber-300/80 text-sm italic">
          ({word.partOfSpeech})
        </p>
      </div>

      {/* Leader Sweep Bonus Highlight if applicable */}
      {leaderSweep && leader && (
        <div className="bg-gradient-to-r from-purple-950 via-purple-900/60 to-purple-950 border-2 border-purple-500/60 rounded-2xl p-4 sm:p-5 shadow-xl text-center space-y-1 animate-bounce-subtle">
          <div className="inline-flex items-center gap-2 text-purple-300 font-black text-sm uppercase tracking-wider">
            <Crown className="w-4 h-4 text-amber-400" />
            +3 PONTOS • GOLPE MESTRE DO LÍDER!
          </div>
          <p className="text-xs sm:text-sm text-purple-100">
            Nenhum jogador votou no significado real! O líder <strong className="text-amber-300">{leader.name}</strong> faturou <strong>+3 pontos de bônus</strong>!
          </p>
        </div>
      )}

      {/* Tie Break Alert if active */}
      {room.isTieBreakActive && (
        <div className="bg-rose-950/80 border border-rose-500/60 rounded-2xl p-3.5 text-center text-xs text-rose-200 flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <strong>MORTE SÚBITA ATIVA:</strong> Dois ou mais jogadores empatados na liderança acima da meta!
        </div>
      )}

      {/* REQUEST/CONFIRM NEXT ROUND BUTTON & BANNER AT THE TOP (Easy visibility) */}
      <div className="sticky top-2 z-20">
        {renderNextRoundControl('top')}
      </div>

      {/* Section: QUEM VOTOU EM QUEM (Detailed breakdown requested by user) */}
      <div className="bg-stone-900/95 border-2 border-amber-600/50 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <h3 className="font-serif font-black text-base sm:text-lg text-amber-200 flex items-center gap-2 uppercase tracking-wide">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            Quem Votou em Quem
          </h3>
          <span className="text-xs text-stone-400">
            {voteMappings.length} {voteMappings.length === 1 ? 'voto computado' : 'votos computados'}
          </span>
        </div>

        <div className="grid gap-2.5">
          {voteMappings.map((mapItem, idx) => {
            const { voter, chosenOption, author, isReal } = mapItem;
            if (!voter || !chosenOption) return null;

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all ${
                  isReal
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-stone-950 border-stone-800 text-stone-300'
                }`}
              >
                {/* Voter */}
                <div className="flex items-center gap-2">
                  <span className="text-base">{voter.avatar}</span>
                  <span className="font-bold text-stone-100 text-sm">
                    {voter.name}
                  </span>
                  <span className="text-stone-500 font-mono text-[11px]">votou na</span>
                  <span className="font-mono font-black px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 text-xs">
                    Opção {chosenOption.letterLabel}
                  </span>
                </div>

                {/* Arrow and Result */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {isReal ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold text-xs">
                      <UserCheck className="w-3.5 h-3.5" />
                      Acertou o Dicionário! (+2 pts para {voter.name})
                    </span>
                  ) : author ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-600/40 text-amber-200 font-semibold text-xs">
                      <UserX className="w-3.5 h-3.5 text-amber-400" />
                      Caiu no blefe de <strong>{author.name}</strong> (+1 pt para {author.name})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-900 text-stone-400 text-xs">
                      Caiu no blefe decoy do sistema (+0 pts)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revealed Options Cards in Strict UPPERCASE */}
      <div className="grid gap-3.5">
        {bluffs.map((entry: BluffEntry, index: number) => {
          const isReal = entry.isReal;
          const voters = getVotersForOption(entry.id);
          const author = getAuthor(entry.authorId);
          const isMyBluff = entry.authorId === myPlayerId;

          return (
            <div
              key={entry.id || index}
              className={`p-4 sm:p-5 rounded-2xl border transition-all relative space-y-3 ${
                isReal
                  ? 'bg-gradient-to-r from-emerald-950/90 via-emerald-900/40 to-emerald-950/90 border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl'
                  : 'bg-stone-900/90 border-amber-900/40'
              }`}
            >
              {/* Header row: Letter + Real/Author tag */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center ${
                      isReal
                        ? 'bg-emerald-400 text-stone-950'
                        : 'bg-stone-950 text-amber-300 border border-stone-800'
                    }`}
                  >
                    {entry.letterLabel || String.fromCharCode(65 + index)}
                  </span>

                  {isReal ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Significado Real do Dicionário (+2 pts)
                    </span>
                  ) : author ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-300/90 font-medium">
                      Blefe de: <strong>{author.name}</strong> {isMyBluff && '(Você)'}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400 italic">
                      Blefe Decoy do Sistema
                    </span>
                  )}
                </div>

                {/* Score awarded for this card */}
                {!isReal && author && voters.length > 0 && (
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-lg border border-amber-800">
                    +{voters.length} {voters.length === 1 ? 'pt' : 'pts'} para {author.name}
                  </span>
                )}
              </div>

              {/* Definition text in strict UPPERCASE without accents/tildes, preserving Ç */}
              <p
                className={`text-sm sm:text-base font-serif leading-relaxed uppercase font-medium ${
                  isReal ? 'text-emerald-100' : 'text-stone-200'
                }`}
              >
                {formatConcept(entry.text)}
              </p>

              {/* Voters List on this specific card */}
              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Votaram nesta opção:</span>
                  {voters.length === 0 ? (
                    <span className="text-stone-500 italic">Nenhum voto</span>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {voters.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-950 border border-stone-700 text-stone-200 text-xs font-medium shadow-sm"
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
            </div>
          );
        })}
      </div>

      {/* Real Word Etymology & Example Note */}
      {word.exampleSentence && (
        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs space-y-1 text-stone-300">
          <strong className="text-amber-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Exemplo de Uso no Dicionário:
          </strong>
          <p className="italic text-stone-200 font-serif">"{word.exampleSentence}"</p>
        </div>
      )}

      {/* Round Score Summary Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
        <h3 className="font-serif font-bold text-sm text-amber-200 flex items-center gap-2 uppercase tracking-wider">
          <Award className="w-4 h-4 text-amber-400" />
          Pontos Ganhos Nesta Rodada
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {scoreDetails.map((detail) => {
            const player = room.players.find((p) => p.id === detail.playerId);
            if (!player) return null;
            const isMe = player.id === myPlayerId;

            return (
              <div
                key={detail.playerId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-stone-950 border border-stone-800"
              >
                <div className="flex items-center gap-2">
                  <span>{player.avatar}</span>
                  <span className={`font-semibold ${isMe ? 'text-amber-300' : 'text-stone-200'}`}>
                    {player.name} {isMe && '(Você)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400">
                    +{detail.pointsEarned} pts
                  </span>
                  <span className="text-[10px] text-stone-400">
                    (Total: {player.score})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Next Round Control (Also accessible after reviewing results) */}
      <div className="pt-4 border-t border-stone-800">
        {renderNextRoundControl('bottom')}
      </div>
    </div>
  );
};
