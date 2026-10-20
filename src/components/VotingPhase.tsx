import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { BluffEntry } from '../types/game';
import { Clock, CheckCircle2, ShieldCheck, EyeOff, Users, ArrowRight, Lock, Unlock, Crown } from 'lucide-react';
import { formatConcept, isLeaderBluffing } from '../utils/textFormatting';

export const VotingPhase: React.FC = () => {
  const { room, myPlayerId, submitVote, revealResults, isHost, isLeader } = useGame();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  if (!room || !room.currentRound) return null;

  const round = room.currentRound;
  const word = round.word;
  const bluffs = round.bluffs || [];
  const myVote = round.votes[myPlayerId];
  const hasVoted = Boolean(myVote);
  const leader = room.players.find((p) => p.id === round.leaderId);

  // Timer countdown
  useEffect(() => {
    if (!round.deadline) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((round.deadline! - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [round.deadline]);

  const leaderIsBluffing = isLeaderBluffing(room.settings, room.players.length);

  const eligibleVoters = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    if (p.id === round.leaderId && !leaderIsBluffing) return false;
    return true;
  });

  const totalVotesCount = Object.keys(round.votes).length;
  const allVotesReceived = Boolean(round.allVotesIn || totalVotesCount >= eligibleVoters.length);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Word Header */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border border-amber-600/40 rounded-3xl p-5 sm:p-7 shadow-xl text-center relative overflow-hidden">
        {/* Timer */}
        {!allVotesReceived && (
          timeLeft !== null ? (
            <div
              className={`absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border transition-colors ${
                timeLeft <= 10
                  ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                  : 'bg-stone-900/90 text-amber-300 border-amber-700/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {timeLeft}s
            </div>
          ) : (
            <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-semibold border bg-stone-950/80 text-amber-300/90 border-amber-700/50">
              <Clock className="w-3 h-3 text-amber-400" />
              Sem limite • Aguarda votos
            </div>
          )
        )}

        <div className="space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400 flex items-center justify-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" />
            Mural de Votação Anônima (Respostas em Caixa Alta)
          </span>
          <h2 className="font-serif font-black text-3xl sm:text-5xl text-amber-100 tracking-tight uppercase">
            {word.word}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto">
            Qual destas opções em caixa alta é o significado autêntico do dicionário?
          </p>
        </div>
      </div>

      {/* Leader Permission Gate Banner (When all have voted) */}
      {allVotesReceived ? (
        <div className="bg-gradient-to-r from-amber-950/90 via-stone-900 to-amber-950/90 border-2 border-amber-500 rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
            {isLeader || isHost ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950 px-3 py-1 rounded-full border border-amber-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Todos os {totalVotesCount} Votos Foram Computados!
            </span>
            <h3 className="font-serif font-bold text-xl sm:text-2xl text-amber-100">
              {isLeader || isHost ? 'Pronto para Revelar as Respostas?' : 'Aguardando Permissão do Líder'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto">
              {isLeader || isHost
                ? 'Como Líder da Rodada, clique no botão abaixo para desbloquear o mural, revelar quem votou em quem e computar os pontos:'
                : `As respostas continuam em segredo até o Líder ${leader?.name || 'da rodada'} autorizar a revelação para todos.`}
            </p>
          </div>

          {/* Reveal button only for Leader (or Host fallback) */}
          {(isLeader || isHost) ? (
            <button
              onClick={revealResults}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-sm sm:text-base uppercase tracking-wider shadow-xl shadow-amber-950/60 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto"
            >
              <Unlock className="w-5 h-5 text-stone-950" />
              Liberar e Revelar Respostas Agora
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-mono animate-pulse">
              <Clock className="w-4 h-4 animate-spin text-amber-400" />
              Aguardando o comando do líder {leader?.name}...
            </div>
          )}
        </div>
      ) : (
        /* Progress while still voting */
        <div className="space-y-2">
          {isLeader && !leaderIsBluffing && (
            <div className="p-3 bg-amber-950/40 border border-amber-600/30 rounded-2xl text-center text-xs text-amber-200 flex items-center justify-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Você é o Líder da Rodada (Regra: <strong>Líder não digita / não vota</strong>). Aguardando os votos dos participantes.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              Votos computados: <strong className="text-amber-200">{totalVotesCount} de {eligibleVoters.length}</strong>
            </span>
            {hasVoted && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Seu voto foi computado!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Anonymous Options List in Strict UPPERCASE */}
      <div className="grid gap-3.5">
        {bluffs.map((entry: BluffEntry, index: number) => {
          const isMyOwnBluff = entry.authorId === myPlayerId;
          const isSelectedByMe = myVote === entry.id;

          return (
            <div
              key={entry.id || index}
              className={`p-4 sm:p-5 rounded-2xl border transition-all relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isSelectedByMe
                  ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/30 shadow-lg'
                  : isMyOwnBluff
                  ? 'bg-stone-950/40 border-stone-800/80 opacity-70'
                  : 'bg-stone-900/90 border-amber-900/30 hover:border-amber-600/60 hover:bg-stone-800/80 shadow-md'
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1">
                {/* Letter badge */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-black text-base flex items-center justify-center shrink-0 shadow-inner ${
                    isSelectedByMe
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-stone-950 border border-stone-800 text-amber-300'
                  }`}
                >
                  {entry.letterLabel || String.fromCharCode(65 + index)}
                </div>

                <div className="space-y-1">
                  {/* Strict UPPERCASE rendering without accents/tildes, preserving Ç */}
                  <p className="text-sm sm:text-base text-stone-200 font-serif leading-relaxed uppercase font-medium">
                    {formatConcept(entry.text)}
                  </p>
                  {isMyOwnBluff && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      <ShieldCheck className="w-3 h-3" /> Seu próprio blefe (bloqueado para voto)
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full sm:w-auto shrink-0 flex justify-end">
                {isMyOwnBluff ? (
                  <button
                    disabled
                    className="py-2 px-4 rounded-xl bg-stone-950/60 text-stone-500 text-xs font-bold border border-stone-800 cursor-not-allowed"
                  >
                    Seu Blefe
                  </button>
                ) : isLeader && !leaderIsBluffing ? (
                  <button
                    disabled
                    className="py-2 px-4 rounded-xl bg-stone-950/60 text-stone-400 text-xs font-bold border border-stone-800 cursor-not-allowed"
                  >
                    Líder não vota
                  </button>
                ) : (
                  <button
                    onClick={() => !allVotesReceived && submitVote(entry.id)}
                    disabled={allVotesReceived || (hasVoted && isSelectedByMe)}
                    className={`w-full sm:w-auto py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md ${
                      isSelectedByMe
                        ? 'bg-emerald-600 text-white'
                        : allVotesReceived
                        ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-500 text-stone-950 hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isSelectedByMe ? 'Votado ✓' : allVotesReceived ? 'Votação Encerrada' : hasVoted ? 'Mudar Voto' : 'Votar Nesta'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
