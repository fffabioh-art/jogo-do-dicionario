export type GamePhase =
  | 'LOBBY'
  | 'WORD_CHOICE'
  | 'SUBMISSION'
  | 'VOTING'
  | 'REVEAL'
  | 'GAME_OVER';

export interface ReceivedVoteDetail {
  id: string;
  voterId: string;
  voterName: string;
  voterAvatar: string;
  roundNumber: number;
  word: string;
  bluffText: string;
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // Emoji or avatar icon
  color: string;
  score: number;
  isHost: boolean;
  isBot?: boolean;
  isConnected: boolean;
  hasSubmitted?: boolean;
  hasVoted?: boolean;
  totalVotesReceived?: number;
  receivedVotesHistory?: ReceivedVoteDetail[];
}

export interface WordItem {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string; // e.g. "substantivo masculino", "adjetivo"
  etymology?: string;
  exampleSentence?: string;
  difficulty?: 'facil' | 'medio' | 'dificil' | 'insano';
  isCustom?: boolean;
}

export interface BluffEntry {
  id: string;
  authorId: string; // player ID, or 'REAL' for true dictionary entry, or 'BOT'
  text: string;
  isReal: boolean;
  letterLabel?: string; // A, B, C, D...
}

export interface VoteRecord {
  voterId: string;
  optionId: string; // BluffEntry id
}

export interface RoundScoreDetail {
  playerId: string;
  pointsEarned: number;
  breakdown: {
    bluffVotesEarned: number; // +1 per player fooled
    correctDefinitionBonus: number; // +2 if guessed real
    leaderSweepBonus: number; // +3 if leader and no one guessed real
  };
}

export interface RoundData {
  roundNumber: number;
  leaderId: string;
  word: WordItem;
  phase: GamePhase;
  wordChoices?: WordItem[]; // For leader to choose from
  bluffs: BluffEntry[]; // All bluffs + real definition, randomized
  votes: Record<string, string>; // voterId -> optionId
  revealedIndex?: number; // for step-by-step reveal if desired
  scoreDetails?: RoundScoreDetail[];
  allVotesIn?: boolean;
  nextRoundRequested?: boolean;
  nextRoundConfirmations?: string[];
  nextRoundRequesterId?: string;
  startTime?: number;
  deadline?: number;
  isTieBreak?: boolean;
  isFinalRound?: boolean;
}

export interface GameSettings {
  targetScore: number; // custom score with stepper arrows
  submissionTimeLimit: number; // in seconds, e.g. 60, 90, 120, 0 = no limit
  votingTimeLimit: number; // in seconds, e.g. 45, 60, 0 = no limit
  leaderBluffsRule: 'never' | 'always'; // default: 'never' (Líder NÃO digita). 'always': Líder digita
  readingMode: 'visible' | 'leader_read'; // 'visible': enunciados visíveis pra todos. 'leader_read': lido pelo líder em voz alta (votantes só veem A, B, C...)
  twoPlayerDecoyCount: number;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  settings: GameSettings;
  players: Player[];
  currentRound: RoundData | null;
  roundHistory: {
    roundNumber: number;
    word: string;
    realDefinition: string;
    winnerOfRound?: string;
  }[];
  winnerId?: string;
  isTieBreakActive?: boolean;
  customWords?: WordItem[];
  exclusiveCustomWords?: boolean; // When true, rounds pull solely from imported/custom words
  usedWordIds?: string[];
}

export interface ClientAction {
  type:
    | 'CREATE_ROOM'
    | 'JOIN_ROOM'
    | 'RECONNECT'
    | 'UPDATE_SETTINGS'
    | 'ADD_BOT'
    | 'REMOVE_BOT'
    | 'KICK_PLAYER'
    | 'START_GAME'
    | 'SELECT_WORD'
    | 'SUBMIT_BLUFF'
    | 'SUBMIT_VOTE'
    | 'REVEAL_RESULTS'
    | 'NEXT_ROUND'
    | 'REQUEST_NEXT_ROUND'
    | 'CONFIRM_NEXT_ROUND'
    | 'FORCE_NEXT_ROUND'
    | 'ADD_CUSTOM_WORD'
    | 'IMPORT_DICTIONARY'
    | 'RESET_DICTIONARY'
    | 'SET_EXCLUSIVE_DICTIONARY'
    | 'RESTART_GAME';
  payload?: any;
}
