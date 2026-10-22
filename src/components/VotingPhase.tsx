import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { BluffEntry } from '../types/game';
import { Clock, CheckCircle2, ShieldCheck, Users, Unlock, Volume2, Headphones } from 'lucide-react';
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
  const leaderHasBluff = bluffs.some((b) => b.authorId === round.leaderId);
  const canLeaderVote = leaderIsBluffing || leaderHasBluff;

  const eligibleVoters = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    if (p.id === round.leaderId && !canLeaderVote) return false;
    return true;
  });

  const totalVotesCount = Object.keys(round.votes).length;
  const allVotesReceived = Boolean(round.allVotesIn || totalVotesCount >= eligibleVoters.length);

  const isLeaderReadMode = room.settings.readingMode === 'leader_read';
  const canSeeText = !isLeaderReadMode || isLeader || (leader?.isBot && isHost);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Word Header Card */}
      <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 text-center relative">
        {!allVotesReceived && timeLeft !== null && (
          <div
            className={`absolute top-3.5 right-3.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold border ${
              timeLeft <= 10
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                : 'bg-stone-800 text-stone-300 border-stone-700'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            {timeLeft}s
          </div>
        )}

        <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block mb-1">
          Votação · Rodada {round.roundNumber}
        </span>
        <h2 className="font-serif font-black text-3xl sm:text-4xl text-amber-100 tracking-tight uppercase">
          {word.word}
        </h2>
        <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto">
          {isLeaderReadMode && !canSeeText
            ? 'Ouça a leitura do Líder e vote na alternativa correta.'
            : 'Qual destas opções é a definição real do dicionário?'}
        </p>
      </div>

      {/* Audio / Leader Read Instruction Card */}
      {isLeaderReadMode && (
        isLeader ? (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Você é o leitor oficial</span>
            </div>
            <p className="text-stone-300">
              Leia cada alternativa abaixo em voz alta. Na tela dos outros jogadores os textos estão ocultos.
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Headphones className="w-4 h-4 text-amber-400" />
              <span>Modo Áudio Ativo</span>
            </div>
            <p className="text-stone-400">
              Ouça o líder <strong>{leader?.name}</strong> ler as alternativas e selecione a letra correspondente.
            </p>
          </div>
        )
      )}

      {/* Leader Permission Gate Banner */}
      {allVotesReceived ? (
        <div className="bg-stone-900 border border-amber-500/50 rounded-2xl p-4 text-center space-y-2.5">
          <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Todos os {totalVotesCount} votos foram recebidos!
          </span>

          {isLeader || isHost ? (
            <button
              onClick={revealResults}
              className="py-2.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <Unlock className="w-4 h-4" />
              Revelar Resultados
            </button>
          ) : (
            <p className="text-xs text-stone-400">
              Aguardando o líder <strong>{leader?.name}</strong> liberar os resultados...
            </p>
          )}
        </div>
      ) : (
        /* Status while voting */
        <div className="flex items-center justify-between text-xs text-stone-400 px-1 font-mono">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Votos: <strong>{totalVotesCount} de {eligibleVoters.length}</strong>
          </span>
          {hasVoted && (
            <span className="text-emerald-400 flex items-center gap-1 font-sans">
              <CheckCircle2 className="w-3.5 h-3.5" /> Seu voto foi registrado
            </span>
          )}
        </div>
      )}

      {/* Options List */}
      <div className="grid gap-2.5">
        {bluffs.map((entry: BluffEntry, index: number) => {
          const isMyOwnBluff = entry.authorId === myPlayerId;
          const isSelectedByMe = myVote === entry.id;
          const letter = entry.letterLabel || String.fromCharCode(65 + index);

          return (
            <div
              key={entry.id || index}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isSelectedByMe
                  ? 'bg-amber-950/40 border-amber-400'
                  : isMyOwnBluff
                  ? 'bg-stone-950/40 border-stone-800/60 opacity-60'
                  : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span
                  className={`w-7 h-7 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                    isSelectedByMe
                      ? 'bg-amber-400 text-stone-950'
                      : 'bg-stone-950 border border-stone-800 text-stone-300'
                  }`}
                >
                  {letter}
                </span>

                <div className="min-w-0">
                  {canSeeText ? (
                    <p className="text-xs sm:text-sm text-stone-200 font-serif uppercase font-medium leading-relaxed">
                      {formatConcept(entry.text)}
                    </p>
                  ) : (
                    <div>
                      <span className="font-semibold text-xs text-amber-200">
                        Alternativa {letter}
                      </span>
                      <p className="text-[11px] text-stone-500">
                        {isMyOwnBluff ? 'Seu blefe' : 'Lido em voz alta'}
                      </p>
                    </div>
                  )}

                  {isMyOwnBluff && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/80 mt-1">
                      <ShieldCheck className="w-3 h-3" /> Seu blefe (bloqueado para seu voto)
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0">
                {isMyOwnBluff ? (
                  <span className="text-[11px] text-stone-500 font-medium px-2 py-1">
                    Seu blefe
                  </span>
                ) : isLeader && !canLeaderVote ? (
                  <span className="text-[11px] text-stone-500 font-medium px-2 py-1">
                    Líder não vota
                  </span>
                ) : (
                  <button
                    onClick={() => !allVotesReceived && submitVote(entry.id)}
                    disabled={allVotesReceived || (hasVoted && isSelectedByMe)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold uppercase transition-all ${
                      isSelectedByMe
                        ? 'bg-emerald-600 text-white cursor-default'
                        : allVotesReceived
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        : 'bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-200'
                    }`}
                  >
                    {isSelectedByMe ? 'Votado ✓' : `Votar (${letter})`}
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
