import React, { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/Header';
import { RulesModal } from './components/RulesModal';
import { DictionaryAdminModal } from './components/DictionaryAdminModal';
import { HomeOrJoin } from './components/HomeOrJoin';
import { Lobby } from './components/Lobby';
import { WordChoicePhase } from './components/WordChoicePhase';
import { BluffPhase } from './components/BluffPhase';
import { VotingPhase } from './components/VotingPhase';
import { RevealPhase } from './components/RevealPhase';
import { GameOver } from './components/GameOver';
import { ScoreBoard } from './components/ScoreBoard';

function MainGameView() {
  const { room, isHost } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [showDictAdmin, setShowDictAdmin] = useState(false);

  if (!room) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
        <Header onOpenRules={() => setShowRules(true)} />
        <main className="flex-1 flex items-center justify-center p-4">
          <HomeOrJoin />
        </main>
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </div>
    );
  }

  const phase = room.currentRound?.phase || 'LOBBY';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      <Header
        onOpenRules={() => setShowRules(true)}
        onOpenDictionary={() => setShowDictAdmin(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Render active phase */}
        {phase === 'LOBBY' && <Lobby />}

        {phase === 'WORD_CHOICE' && (
          <div className="space-y-6">
            <WordChoicePhase />
            <div className="max-w-3xl mx-auto">
              <ScoreBoard />
            </div>
          </div>
        )}

        {phase === 'SUBMISSION' && (
          <div className="space-y-6">
            <BluffPhase />
            <div className="max-w-2xl mx-auto">
              <ScoreBoard />
            </div>
          </div>
        )}

        {phase === 'VOTING' && (
          <div className="space-y-6">
            <VotingPhase />
            <div className="max-w-3xl mx-auto">
              <ScoreBoard />
            </div>
          </div>
        )}

        {phase === 'REVEAL' && (
          <div className="space-y-6">
            <RevealPhase />
            <div className="max-w-3xl mx-auto">
              <ScoreBoard />
            </div>
          </div>
        )}

        {phase === 'GAME_OVER' && <GameOver />}
      </main>

      {/* Rules Modal: Always shows current room code even while game is in progress */}
      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        roomCode={room?.roomCode}
      />

      {/* Dictionary Admin Modal for Host to add or import Portuguese dictionary */}
      {isHost && (
        <DictionaryAdminModal
          isOpen={showDictAdmin}
          onClose={() => setShowDictAdmin(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <MainGameView />
    </GameProvider>
  );
}
