import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  RoomState,
  Player,
  RoundData,
  GameSettings,
  BluffEntry,
  RoundScoreDetail,
  WordItem
} from './src/types/game.js';
import {
  DICTIONARY_WORDS,
  getRandomWordChoices,
  getDecoyBluff
} from './src/data/dictionary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Persistent disk storage file for custom words (database uploaded by admin)
const PERSISTENT_WORDS_FILE = path.join(__dirname, 'persistent_custom_words.json');

function loadPersistentWords(): WordItem[] {
  try {
    if (fs.existsSync(PERSISTENT_WORDS_FILE)) {
      const data = fs.readFileSync(PERSISTENT_WORDS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          definition: formatConcept(item.definition || ''),
        }));
      }
    }
  } catch (err) {
    console.error('Error loading persistent_custom_words.json:', err);
  }
  return [];
}

function savePersistentWords(words: WordItem[]): void {
  try {
    fs.writeFileSync(PERSISTENT_WORDS_FILE, JSON.stringify(words, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving persistent_custom_words.json:', err);
  }
}

/**
 * Strips all accents and tildes while strictly preserving 'ç' and 'Ç'.
 * Rule:
 * "Todos as respostas nao podem conter acento ou til. Apenas ç.
 *  Mesmo que a pessoa coloque, retire. Os signigicados tbm tem que aparecer
 *  obedecendo essa regra, para que nao haja diferenciacao"
 */
function removeAccentsKeepCedilla(text: string): string {
  if (!text) return '';
  const protectedText = text
    .replace(/ç/g, '__cedilla_lower__')
    .replace(/Ç/g, '__cedilla_upper__');

  const normalized = protectedText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const cleaned = normalized.replace(/[~^´`¨]/g, '');

  return cleaned
    .replace(/__cedilla_lower__/g, 'ç')
    .replace(/__cedilla_upper__/g, 'Ç');
}

/**
 * Utility to ensure all concepts and definitions end with a single period without duplication.
 */
function ensureConceptPeriod(concept: string): string {
  if (!concept) return '';
  const trimmed = concept.trim();
  if (!trimmed) return '';

  const cleaned = trimmed.replace(/[\s,;:–—-]+$/, '');
  if (!cleaned) return '';

  if (/\.+$/.test(cleaned)) {
    return cleaned.replace(/\s*\.+$/, '.');
  }

  return cleaned + '.';
}

/**
 * Master concept formatter: strips accents/tildes, preserves Ç, forces UPPERCASE, ends with single period.
 */
function formatConcept(text: string): string {
  if (!text) return '';
  const noAccents = removeAccentsKeepCedilla(text);
  const upper = noAccents.toUpperCase().trim();
  return ensureConceptPeriod(upper);
}

// Whether the round's leader is expected to type/submit a bluff and vote
function isLeaderBluffing(settings?: GameSettings | null, playerCount: number = 0): boolean {
  const rule = settings?.leaderBluffsRule || 'never';
  if (rule === 'always') return true;
  return false;
}

// Generates alphabetical option letters: 0 -> A, 1 -> B, ... 8 -> I, 9 -> J, 10 -> K, etc.
function getAlternativeLetter(index: number): string {
  if (index < 0) return 'A';
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return `${first}${second}`;
}

// REST API for Administrator to upload, fetch, and manage persistent database
app.get('/api/dictionary/custom', (_req, res) => {
  const words = loadPersistentWords();
  res.json({ words, count: words.length });
});

app.post('/api/dictionary/custom', (req, res) => {
  const { words, replaceAll } = req.body;
  if (!Array.isArray(words)) {
    return res.status(400).json({ error: 'Array of words is required' });
  }

  let current = replaceAll ? [] : loadPersistentWords();
  const existing = new Set(current.map((w) => w.word.toLowerCase()));

  for (const w of words) {
    if (w && w.word && w.definition && !existing.has(String(w.word).toLowerCase())) {
      existing.add(String(w.word).toLowerCase());
      current.push({
        id: w.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        word: String(w.word).trim(),
        definition: formatConcept(String(w.definition).trim()),
        partOfSpeech: w.partOfSpeech ? String(w.partOfSpeech).trim() : 'substantivo',
        exampleSentence: w.exampleSentence ? String(w.exampleSentence).trim() : undefined,
        difficulty: w.difficulty || 'medio',
        isCustom: true,
      });
    }
  }

  savePersistentWords(current);

  // Sync any active rooms with the updated persistent custom words
  for (const room of rooms.values()) {
    if (replaceAll || !room.customWords || room.customWords.length === 0) {
      room.customWords = current;
      room.exclusiveCustomWords = current.length > 0;
      broadcastToRoom(room.roomCode, { type: 'ROOM_UPDATE', room });
    }
  }

  res.json({ success: true, count: current.length, words: current });
});

app.delete('/api/dictionary/custom', (_req, res) => {
  savePersistentWords([]);
  // Clear from active rooms as well
  for (const room of rooms.values()) {
    room.customWords = [];
    room.exclusiveCustomWords = false;
    broadcastToRoom(room.roomCode, { type: 'ROOM_UPDATE', room });
  }
  res.json({ success: true, count: 0, words: [] });
});

// In-memory room store
const rooms = new Map<string, RoomState>();

// Socket to player/room mapping
const socketMap = new Map<WebSocket, { roomCode: string; playerId: string }>();

// Timer references per room for countdowns
const roomTimers = new Map<string, NodeJS.Timeout>();

// Bot names and avatars for fun additions
const BOT_PRESETS = [
  { name: 'Machado de Assis', avatar: '🎩', color: '#8B5CF6' },
  { name: 'Clarice Lispector', avatar: '✨', color: '#EC4899' },
  { name: 'Aurélio Buarque', avatar: '📖', color: '#10B981' },
  { name: 'Guimarães Rosa', avatar: '🌿', color: '#F59E0B' },
  { name: 'O Embusteiro Bot', avatar: '🎭', color: '#3B82F6' },
  { name: 'Carlos Drummond', avatar: '📜', color: '#06B6D4' },
  { name: 'Cecília Meireles', avatar: '🌸', color: '#F43F5E' },
  { name: 'Jorge Amado', avatar: '🌊', color: '#D97706' },
  { name: 'Rachel de Queiroz', avatar: '🌾', color: '#84CC16' },
  { name: 'Mário de Andrade', avatar: '🎨', color: '#6366F1' },
];

function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function broadcastToRoom(roomCode: string, payload: any) {
  const message = JSON.stringify(payload);
  for (const [ws, data] of socketMap.entries()) {
    if (data.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function sendToPlayer(playerId: string, payload: any) {
  const message = JSON.stringify(payload);
  for (const [ws, data] of socketMap.entries()) {
    if (data.playerId === playerId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

function clearRoomTimer(roomCode: string) {
  const t = roomTimers.get(roomCode);
  if (t) {
    clearTimeout(t);
    roomTimers.delete(roomCode);
  }
}

function computeRoundPoints(room: RoomState): {
  scoreDetails: RoundScoreDetail[];
  realOptionId: string;
} {
  const round = room.currentRound;
  if (!round) return { scoreDetails: [], realOptionId: '' };

  const realEntry = round.bluffs.find((b) => b.isReal);
  const realOptionId = realEntry ? realEntry.id : '';

  // Initialize scoring for each player
  const detailsMap = new Map<string, RoundScoreDetail>();
  for (const p of room.players) {
    detailsMap.set(p.id, {
      playerId: p.id,
      pointsEarned: 0,
      breakdown: {
        bluffVotesEarned: 0,
        correctDefinitionBonus: 0,
        leaderSweepBonus: 0,
      },
    });
  }

  // Count votes
  let countCorrectVotes = 0;
  for (const [voterId, optionId] of Object.entries(round.votes)) {
    if (optionId === realOptionId) {
      // +2 points for picking the real definition
      countCorrectVotes++;
      const voterDetail = detailsMap.get(voterId);
      if (voterDetail) {
        voterDetail.pointsEarned += 2;
        voterDetail.breakdown.correctDefinitionBonus += 2;
      }
    } else {
      // Find author of this fake definition
      const votedBluff = round.bluffs.find((b) => b.id === optionId);
      if (votedBluff && votedBluff.authorId && votedBluff.authorId !== voterId) {
        // +1 point for each player you fooled
        const authorDetail = detailsMap.get(votedBluff.authorId);
        if (authorDetail) {
          authorDetail.pointsEarned += 1;
          authorDetail.breakdown.bluffVotesEarned += 1;
        }

        // Track who voted for this person's bluff
        const authorPlayer = room.players.find((p) => p.id === votedBluff.authorId);
        const voterPlayer = room.players.find((p) => p.id === voterId);
        if (authorPlayer) {
          authorPlayer.totalVotesReceived = (authorPlayer.totalVotesReceived || 0) + 1;
          if (!authorPlayer.receivedVotesHistory) authorPlayer.receivedVotesHistory = [];
          authorPlayer.receivedVotesHistory.push({
            id: `rv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            voterId: voterId,
            voterName: voterPlayer?.name || 'Jogador',
            voterAvatar: voterPlayer?.avatar || '👤',
            roundNumber: round.roundNumber,
            word: round.word.word,
            bluffText: votedBluff.text,
          });
        }
      }
    }
  }

  // Leader sweep bonus: +3 points to Leader if NO other player guessed the real definition
  const nonLeaderVotes = Object.entries(round.votes).filter(([voterId]) => voterId !== round.leaderId);
  const correctNonLeaderVotes = nonLeaderVotes.filter(([, optId]) => optId === realOptionId).length;

  if (correctNonLeaderVotes === 0 && nonLeaderVotes.length > 0) {
    const leaderDetail = detailsMap.get(round.leaderId);
    if (leaderDetail) {
      leaderDetail.pointsEarned += 3;
      leaderDetail.breakdown.leaderSweepBonus += 3;
    }
  }

  // Apply to cumulative scores
  const scoreDetails: RoundScoreDetail[] = [];
  for (const player of room.players) {
    const detail = detailsMap.get(player.id);
    if (detail) {
      player.score += detail.pointsEarned;
      scoreDetails.push(detail);
    }
  }

  return { scoreDetails, realOptionId };
}

function checkEndGameCondition(room: RoomState): boolean {
  if (!room.currentRound) return false;

  const target = room.settings.targetScore;
  const playersAboveTarget = room.players.filter((p) => p.score >= target);

  if (playersAboveTarget.length === 0) {
    return false;
  }

  // Sort descending by score
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const highestScore = sorted[0].score;
  const leaders = sorted.filter((p) => p.score === highestScore);

  if (leaders.length === 1 && highestScore >= target) {
    // Definitive winner!
    room.winnerId = leaders[0].id;
    room.isTieBreakActive = false;
    return true;
  } else if (leaders.length > 1 && highestScore >= target) {
    // Tie break / Morte súbita!
    room.isTieBreakActive = true;
    return false; // Continues into sudden death round
  }

  return false;
}

function handleStartVotingPhase(room: RoomState) {
  clearRoomTimer(room.roomCode);
  const round = room.currentRound;
  if (!round) return;

  // Add the real dictionary definition formatted uniformly (no accents/tildes, Ç preserved, UPPERCASE, single period)
  const realBluff: BluffEntry = {
    id: 'entry_real_' + Date.now(),
    authorId: 'REAL',
    text: formatConcept(round.word.definition),
    isReal: true,
  };

  const finalBluffs: BluffEntry[] = [...round.bluffs, realBluff];

  // Shuffle bluffs randomly
  finalBluffs.sort(() => Math.random() - 0.5);

  // Assign letters A, B, C, D... H, I, J, K...
  finalBluffs.forEach((b, idx) => {
    b.letterLabel = getAlternativeLetter(idx);
  });

  round.bluffs = finalBluffs;
  round.phase = 'VOTING';
  round.votes = {};
  round.allVotesIn = false;
  round.startTime = Date.now();

  // Reset player voting state
  room.players.forEach((p) => {
    p.hasVoted = false;
  });

  const votingLimit = room.settings.votingTimeLimit;
  if (votingLimit > 0) {
    round.deadline = Date.now() + votingLimit * 1000;
    const timer = setTimeout(() => {
      // When timer expires, mark allVotesIn = true but wait for leader permission
      round.allVotesIn = true;
      broadcastToRoom(room.roomCode, {
        type: 'ROOM_UPDATE',
        room,
      });

      // If leader is a bot, auto-reveal after brief pause
      const leader = room.players.find((p) => p.id === round.leaderId);
      if (leader?.isBot) {
        setTimeout(() => handleStartRevealPhase(room), 1500);
      }
    }, votingLimit * 1000);
    roomTimers.set(room.roomCode, timer);
  } else {
    round.deadline = undefined;
  }

  // Bot auto-voting simulation (with slight delay)
  setTimeout(() => {
    handleBotVotes(room);
  }, 1200);

  broadcastToRoom(room.roomCode, {
    type: 'ROOM_UPDATE',
    room,
  });
}

function handleStartRevealPhase(room: RoomState) {
  clearRoomTimer(room.roomCode);
  const round = room.currentRound;
  if (!round) return;

  const { scoreDetails } = computeRoundPoints(room);
  round.scoreDetails = scoreDetails;
  round.phase = 'REVEAL';

  // Add to round history
  room.roundHistory.unshift({
    roundNumber: round.roundNumber,
    word: round.word.word,
    realDefinition: formatConcept(round.word.definition),
  });

  // Check game over or sudden death: DO NOT set GAME_OVER immediately!
  // Keep phase = 'REVEAL' so all players can analyze who voted for whom, the real definition, and round results.
  const isOver = checkEndGameCondition(room);
  if (isOver) {
    round.isFinalRound = true;
  }

  broadcastToRoom(room.roomCode, {
    type: 'ROOM_UPDATE',
    room,
  });
}

function handleBotSubmissions(room: RoomState) {
  const round = room.currentRound;
  if (!round || round.phase !== 'SUBMISSION') return;

  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const bots = room.players.filter((p) => p.isBot && !p.hasSubmitted);
  bots.forEach((bot, index) => {
    const isLeader = bot.id === round.leaderId;
    const shouldBluff = !isLeader || leaderBluffs;

    if (shouldBluff) {
      const bluffText = formatConcept(getDecoyBluff(round.word, index + 3));
      round.bluffs.push({
        id: 'bot_bluff_' + bot.id,
        authorId: bot.id,
        text: bluffText,
        isReal: false,
      });
      bot.hasSubmitted = true;
    } else {
      bot.hasSubmitted = true;
    }
  });

  checkSubmissionCompletion(room);
}

function handleBotVotes(room: RoomState) {
  const round = room.currentRound;
  if (!round || round.phase !== 'VOTING') return;

  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const bots = room.players.filter((p) => {
    if (!p.isBot || p.hasVoted) return false;
    if (p.id === round.leaderId && !leaderBluffs) return false;
    return true;
  });

  bots.forEach((bot) => {
    // Bot cannot vote for own bluff
    const eligibleOptions = round.bluffs.filter((b) => b.authorId !== bot.id);
    if (eligibleOptions.length > 0) {
      // 40% chance bot picks real definition, 60% chance bot picks another bluff
      const real = eligibleOptions.find((b) => b.isReal);
      let picked = eligibleOptions[Math.floor(Math.random() * eligibleOptions.length)];
      if (real && Math.random() < 0.4) {
        picked = real;
      }
      round.votes[bot.id] = picked.id;
      bot.hasVoted = true;
    }
  });

  checkVotingCompletion(room);
}

function checkSubmissionCompletion(room: RoomState) {
  const round = room.currentRound;
  if (!round || round.phase !== 'SUBMISSION') return;

  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const nonLeaders = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    return p.id !== round.leaderId;
  });

  const leader = room.players.find((p) => p.id === round.leaderId);
  const allNonLeadersSubmitted = nonLeaders.every((p) => p.hasSubmitted);

  let allSubmitted = false;
  if (leaderBluffs) {
    allSubmitted = allNonLeadersSubmitted && Boolean(leader?.hasSubmitted);
  } else {
    // If leader bluffing is optional/never, non-leaders submitting completes the phase
    allSubmitted = allNonLeadersSubmitted;
  }

  if (allSubmitted) {
    handleStartVotingPhase(room);
  } else {
    broadcastToRoom(room.roomCode, {
      type: 'ROOM_UPDATE',
      room,
    });
  }
}

function checkVotingCompletion(room: RoomState) {
  const round = room.currentRound;
  if (!round || round.phase !== 'VOTING') return;

  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const leaderHasBluff = round.bluffs.some((b) => b.authorId === round.leaderId);

  const eligibleVoters = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    if (p.id === round.leaderId && !leaderBluffs && !leaderHasBluff) return false;
    return true;
  });

  const allVoted = eligibleVoters.every((p) => round.votes[p.id] !== undefined);

  if (allVoted) {
    // Crucial rule: DO NOT auto-reveal! Wait for leader permission
    round.allVotesIn = true;
    broadcastToRoom(room.roomCode, {
      type: 'ROOM_UPDATE',
      room,
    });

    // If leader is a bot, auto-reveal after short timeout so bot games do not stall
    const leader = room.players.find((p) => p.id === round.leaderId);
    if (leader?.isBot) {
      setTimeout(() => {
        if (room.currentRound?.phase === 'VOTING' && room.currentRound.allVotesIn) {
          handleStartRevealPhase(room);
        }
      }, 2500);
    }
  } else {
    round.allVotesIn = false;
    broadcastToRoom(room.roomCode, {
      type: 'ROOM_UPDATE',
      room,
    });
  }
}

function startRoundWithWord(room: RoomState, word: any) {
  clearRoomTimer(room.roomCode);

  const round = room.currentRound;
  if (!round) return;

  round.word = word;
  round.phase = 'SUBMISSION';
  round.bluffs = [];
  round.votes = {};
  round.startTime = Date.now();

  // Reset player submission tracking
  room.players.forEach((p) => {
    p.hasSubmitted = false;
    p.hasVoted = false;
  });

  const timeLimit = room.settings.submissionTimeLimit;
  if (timeLimit > 0) {
    round.deadline = Date.now() + timeLimit * 1000;
    const timer = setTimeout(() => {
      handleStartVotingPhase(room);
    }, timeLimit * 1000);
    roomTimers.set(room.roomCode, timer);
  } else {
    round.deadline = undefined;
  }

  // Trigger bot submissions with a short human-like delay
  setTimeout(() => {
    handleBotSubmissions(room);
  }, 1500);

  broadcastToRoom(room.roomCode, {
    type: 'ROOM_UPDATE',
    room,
  });
}

function prepareNextRound(room: RoomState) {
  clearRoomTimer(room.roomCode);

  // If winner has been established or it's the final round, transition to GAME_OVER!
  if (room.winnerId || room.currentRound?.isFinalRound) {
    if (room.currentRound) {
      room.currentRound.phase = 'GAME_OVER';
    }
    broadcastToRoom(room.roomCode, {
      type: 'ROOM_UPDATE',
      room,
    });
    return;
  }

  // Determine next leader in round-robin fashion
  const currentIndex = room.players.findIndex((p) => p.id === room.currentRound?.leaderId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  const nextLeader = room.players[nextIndex] || room.players[0];

  const roundNumber = (room.currentRound?.roundNumber || 0) + 1;
  const rawChoices = getRandomWordChoices(3, [], room.customWords, room.exclusiveCustomWords);
  // Mask definition so leader cannot see the meaning when choosing the word
  const wordChoices = rawChoices.map((w) => ({
    ...w,
    definition: '',
  }));

  room.currentRound = {
    roundNumber,
    leaderId: nextLeader.id,
    word: { ...rawChoices[0], definition: '' },
    phase: 'WORD_CHOICE',
    wordChoices,
    bluffs: [],
    votes: {},
    isTieBreak: room.isTieBreakActive,
  };

  room.players.forEach((p) => {
    p.hasSubmitted = false;
    p.hasVoted = false;
  });

  broadcastToRoom(room.roomCode, {
    type: 'ROOM_UPDATE',
    room,
  });

  // If next leader is a bot, pick automatically after 2 seconds
  if (nextLeader.isBot) {
    setTimeout(() => {
      if (room.currentRound?.phase === 'WORD_CHOICE') {
        startRoundWithWord(room, rawChoices[0]);
      }
    }, 2000);
  }
}

// WebSocket Connection Management
wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    try {
      const action = JSON.parse(message.toString());
      const { type, payload } = action;

      switch (type) {
        case 'CREATE_ROOM': {
          const roomCode = generateRoomCode();
          const hostPlayer: Player = {
            id: payload.playerId || 'player_' + Date.now(),
            name: payload.playerName || 'Jogador 1',
            avatar: payload.avatar || '🎓',
            color: payload.color || '#3B82F6',
            score: 0,
            isHost: true,
            isConnected: true,
          };

          const persistent = loadPersistentWords();
          const roomCustomWords = Array.isArray(payload.customWords) && payload.customWords.length > 0
            ? payload.customWords
            : persistent;

          // If words were passed from host, persist them to disk forever
          if (Array.isArray(payload.customWords) && payload.customWords.length > 0) {
            savePersistentWords(payload.customWords);
          }

          const newRoom: RoomState = {
            roomCode,
            hostId: hostPlayer.id,
            settings: {
              targetScore: payload.targetScore !== undefined ? Number(payload.targetScore) : 20,
              submissionTimeLimit: payload.submissionTimeLimit !== undefined ? Number(payload.submissionTimeLimit) : 0,
              votingTimeLimit: payload.votingTimeLimit !== undefined ? Number(payload.votingTimeLimit) : 0,
              leaderBluffsRule: payload.leaderBluffsRule === 'always' ? 'always' : 'never',
              readingMode: payload.readingMode === 'leader_read' ? 'leader_read' : 'visible',
              twoPlayerDecoyCount: 2,
            },
            players: [hostPlayer],
            currentRound: null,
            roundHistory: [],
            isTieBreakActive: false,
            customWords: roomCustomWords,
            exclusiveCustomWords: roomCustomWords.length > 0 ? true : Boolean(payload.exclusiveCustomWords),
          };
          rooms.set(roomCode, newRoom);
          socketMap.set(ws, { roomCode, playerId: hostPlayer.id });

          ws.send(
            JSON.stringify({
              type: 'ROOM_CREATED',
              room: newRoom,
              playerId: hostPlayer.id,
            })
          );
          break;
        }

        case 'JOIN_ROOM': {
          const code = (payload.roomCode || '').toUpperCase().trim();
          const room = rooms.get(code);

          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'Sala não encontrada. Verifique o código!',
              })
            );
            return;
          }

          // Check if reconnecting player
          const existingPlayer = room.players.find((p) => p.id === payload.playerId);
          let currentPlayer: Player;

          if (existingPlayer) {
            existingPlayer.isConnected = true;
            if (payload.playerName) existingPlayer.name = payload.playerName;
            if (payload.avatar) existingPlayer.avatar = payload.avatar;
            if (payload.color) existingPlayer.color = payload.color;
            currentPlayer = existingPlayer;
          } else {
            // Check if room has reached maximum 10 players
            if (room.players.length >= 10) {
              ws.send(
                JSON.stringify({
                  type: 'ERROR',
                  message: 'A sala atingiu o limite máximo de 10 participantes!',
                })
              );
              return;
            }

            currentPlayer = {
              id: payload.playerId || 'player_' + Date.now() + Math.random().toString(36).substring(2, 6),
              name: payload.playerName || `Jogador ${room.players.length + 1}`,
              avatar: payload.avatar || '🦊',
              color: payload.color || '#EC4899',
              score: 0,
              isHost: false,
              isConnected: true,
            };
            room.players.push(currentPlayer);
          }

          socketMap.set(ws, { roomCode: code, playerId: currentPlayer.id });

          ws.send(
            JSON.stringify({
              type: 'ROOM_JOINED',
              room,
              playerId: currentPlayer.id,
            })
          );

          broadcastToRoom(code, {
            type: 'ROOM_UPDATE',
            room,
          });
          break;
        }

        case 'RECONNECT': {
          const code = (payload.roomCode || '').toUpperCase().trim();
          const room = rooms.get(code);
          if (room) {
            const player = room.players.find((p) => p.id === payload.playerId);
            if (player) {
              player.isConnected = true;
              socketMap.set(ws, { roomCode: code, playerId: player.id });
              ws.send(
                JSON.stringify({
                  type: 'ROOM_UPDATE',
                  room,
                  playerId: player.id,
                })
              );
              broadcastToRoom(code, {
                type: 'ROOM_UPDATE',
                room,
              });
            }
          }
          break;
        }

        case 'UPDATE_SETTINGS': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.settings = {
            ...room.settings,
            ...payload.settings,
          };

          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });
          break;
        }

        case 'ADJUST_PLAYER_SCORE': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          const isHost = room.hostId === meta.playerId;
          const isLeader = room.currentRound?.leaderId === meta.playerId;
          if (!isHost && !isLeader) return;

          const targetPlayerId = payload.playerId;
          const targetPlayer = room.players.find((p) => p.id === targetPlayerId);

          if (targetPlayer) {
            const currentRoundDetail = room.currentRound?.scoreDetails?.find(
              (d) => d.playerId === targetPlayerId
            );

            if (payload.roundPoints !== undefined) {
              // Direct manual set of round points
              const newRoundPts = Math.max(0, Math.round(Number(payload.roundPoints) || 0));
              if (currentRoundDetail) {
                const diff = newRoundPts - currentRoundDetail.pointsEarned;
                currentRoundDetail.pointsEarned = newRoundPts;
                targetPlayer.score = Math.max(0, targetPlayer.score + diff);
              } else {
                targetPlayer.score = Math.max(0, targetPlayer.score + newRoundPts);
              }
            } else if (payload.roundDelta !== undefined) {
              // Delta adjustment to round points
              const rDelta = Number(payload.roundDelta) || 0;
              if (currentRoundDetail) {
                currentRoundDetail.pointsEarned = Math.max(0, currentRoundDetail.pointsEarned + rDelta);
              }
              targetPlayer.score = Math.max(0, targetPlayer.score + rDelta);
            } else if (payload.score !== undefined) {
              // Direct manual set of total score
              const newTotal = Math.max(0, Math.round(Number(payload.score) || 0));
              const diff = newTotal - targetPlayer.score;
              targetPlayer.score = newTotal;
              if (currentRoundDetail) {
                currentRoundDetail.pointsEarned = Math.max(0, currentRoundDetail.pointsEarned + diff);
              }
            } else {
              // Default delta adjustment to total score
              const delta = typeof payload.delta === 'number' ? payload.delta : 0;
              targetPlayer.score = Math.max(0, targetPlayer.score + delta);
              if (currentRoundDetail) {
                currentRoundDetail.pointsEarned = Math.max(0, currentRoundDetail.pointsEarned + delta);
              }
            }

            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'ADD_BOT': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          // Limit to max 10 players in room
          if (room.players.length >= 10) return;

          const currentBots = room.players.filter((p) => p.isBot).length;
          const preset = BOT_PRESETS[currentBots % BOT_PRESETS.length];

          const botPlayer: Player = {
            id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
            name: preset.name,
            avatar: preset.avatar,
            color: preset.color,
            score: 0,
            isHost: false,
            isBot: true,
            isConnected: true,
          };

          room.players.push(botPlayer);

          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });
          break;
        }

        case 'REMOVE_BOT': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          const botIndex = room.players.map((p) => p.isBot).lastIndexOf(true);
          if (botIndex !== -1) {
            room.players.splice(botIndex, 1);
            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'KICK_PLAYER': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          const targetId = payload.targetPlayerId;
          if (targetId && targetId !== room.hostId) {
            room.players = room.players.filter((p) => p.id !== targetId);
            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'START_GAME': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          // Reset all scores and vote stats
          room.players.forEach((p) => {
            p.score = 0;
            p.hasSubmitted = false;
            p.hasVoted = false;
            p.totalVotesReceived = 0;
            p.receivedVotesHistory = [];
          });
          room.roundHistory = [];
          room.winnerId = undefined;
          room.isTieBreakActive = false;

          const leader = room.players[0];
          const rawChoices = getRandomWordChoices(3, [], room.customWords, room.exclusiveCustomWords);
          // Mask definition so leader cannot see the meaning when choosing the word
          const wordChoices = rawChoices.map((w) => ({
            ...w,
            definition: '',
          }));

          room.currentRound = {
            roundNumber: 1,
            leaderId: leader.id,
            word: { ...rawChoices[0], definition: '' },
            phase: 'WORD_CHOICE',
            wordChoices,
            bluffs: [],
            votes: {},
          };

          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });

          if (leader.isBot) {
            setTimeout(() => {
              if (room.currentRound?.phase === 'WORD_CHOICE') {
                startRoundWithWord(room, rawChoices[0]);
              }
            }, 2000);
          }
          break;
        }

        case 'SELECT_WORD': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound) return;
          if (room.currentRound.leaderId !== meta.playerId) return;

          const selectedWord = payload.word;
          if (selectedWord) {
            let authenticWord = (room.customWords || []).find(
              (w) => w.id === selectedWord.id || w.word.toLowerCase() === String(selectedWord.word || '').toLowerCase()
            );
            if (!authenticWord) {
              authenticWord = DICTIONARY_WORDS.find(
                (w) => w.id === selectedWord.id || w.word.toLowerCase() === String(selectedWord.word || '').toLowerCase()
              );
            }
            startRoundWithWord(room, authenticWord || selectedWord);
          }
          break;
        }

        case 'SUBMIT_BLUFF': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound || room.currentRound.phase !== 'SUBMISSION') return;

          const player = room.players.find((p) => p.id === meta.playerId);
          if (!player) return;

          // The leader is ALWAYS allowed to create a bluff to fool players and score points!
          let bluffText = formatConcept(payload.bluffText || '');
          if (!bluffText) return;

          // Check if player already submitted
          const existingIndex = room.currentRound.bluffs.findIndex((b) => b.authorId === player.id);
          const newEntry: BluffEntry = {
            id: 'bluff_' + player.id + '_' + Date.now(),
            authorId: player.id,
            text: bluffText,
            isReal: false,
          };

          if (existingIndex !== -1) {
            room.currentRound.bluffs[existingIndex] = newEntry;
          } else {
            room.currentRound.bluffs.push(newEntry);
          }

          player.hasSubmitted = true;
          checkSubmissionCompletion(room);
          break;
        }

        case 'SUBMIT_VOTE': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound || room.currentRound.phase !== 'VOTING') return;

          const player = room.players.find((p) => p.id === meta.playerId);
          if (!player) return;

          const isLeader = player.id === room.currentRound.leaderId;
          const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
          const leaderHasBluff = room.currentRound.bluffs.some((b) => b.authorId === player.id);

          // If leader is not expected to bluff and did NOT submit a bluff, leader does not vote
          if (isLeader && !leaderBluffs && !leaderHasBluff) {
            return;
          }

          const optionId = payload.optionId;
          const chosenOption = room.currentRound.bluffs.find((b) => b.id === optionId);

          // Prevent voting on own bluff
          if (chosenOption && chosenOption.authorId === player.id) {
            ws.send(
              JSON.stringify({
                type: 'ERROR',
                message: 'Você não pode votar no seu próprio blefe!',
              })
            );
            return;
          }

          room.currentRound.votes[player.id] = optionId;
          player.hasVoted = true;

          checkVotingCompletion(room);
          break;
        }

        case 'REVEAL_RESULTS': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound) return;
          // Only Leader or Host can trigger manual reveal
          if (room.currentRound.leaderId === meta.playerId || room.hostId === meta.playerId) {
            handleStartRevealPhase(room);
          }
          break;
        }

        case 'REQUEST_NEXT_ROUND':
        case 'NEXT_ROUND': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound) return;
          // Leader or Host can request next round
          if (room.currentRound.leaderId !== meta.playerId && room.hostId !== meta.playerId) return;

          // If final round, leader/host clicking immediately advances to Game Over podium
          if (room.winnerId || room.currentRound.isFinalRound) {
            prepareNextRound(room);
            break;
          }

          room.currentRound.nextRoundRequested = true;
          room.currentRound.nextRoundRequesterId = meta.playerId;
          room.currentRound.nextRoundConfirmations = [meta.playerId];

          // Auto-confirm bots
          const bots = room.players.filter((p) => p.isBot);
          bots.forEach((b) => {
            if (!room.currentRound?.nextRoundConfirmations?.includes(b.id)) {
              room.currentRound?.nextRoundConfirmations?.push(b.id);
            }
          });

          // Check if all active players have already confirmed (e.g. 1 human or all confirmed)
          const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
          const allConfirmed = activePlayers.every((p) =>
            room.currentRound?.nextRoundConfirmations?.includes(p.id)
          );

          if (allConfirmed) {
            prepareNextRound(room);
          } else {
            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'CONFIRM_NEXT_ROUND': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound || !room.currentRound.nextRoundRequested) return;

          if (!room.currentRound.nextRoundConfirmations) {
            room.currentRound.nextRoundConfirmations = [];
          }

          if (!room.currentRound.nextRoundConfirmations.includes(meta.playerId)) {
            room.currentRound.nextRoundConfirmations.push(meta.playerId);
          }

          const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
          const allConfirmed = activePlayers.every((p) =>
            room.currentRound?.nextRoundConfirmations?.includes(p.id)
          );

          if (allConfirmed) {
            prepareNextRound(room);
          } else {
            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'FORCE_NEXT_ROUND': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.currentRound) return;
          if (room.hostId === meta.playerId || room.currentRound.leaderId === meta.playerId) {
            prepareNextRound(room);
          }
          break;
        }

        case 'RESTART_GAME': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          clearRoomTimer(room.roomCode);
          room.currentRound = null;
          room.winnerId = undefined;
          room.isTieBreakActive = false;
          room.players.forEach((p) => {
            p.score = 0;
            p.hasSubmitted = false;
            p.hasVoted = false;
          });

          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });
          break;
        }

        case 'ADD_CUSTOM_WORD': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          const word = payload.word;
          if (word && word.word && word.definition) {
            if (!room.customWords) room.customWords = [];
            room.customWords.push({
              id: word.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              word: String(word.word).trim(),
              definition: formatConcept(String(word.definition).trim()),
              partOfSpeech: word.partOfSpeech ? String(word.partOfSpeech).trim() : 'substantivo',
              exampleSentence: word.exampleSentence ? String(word.exampleSentence).trim() : undefined,
              difficulty: word.difficulty || 'medio',
              isCustom: true,
            });
            savePersistentWords(room.customWords);
            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'IMPORT_DICTIONARY': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          const words = payload.words;
          const replaceAll = Boolean(payload.replaceAll);

          if (payload.exclusiveCustomWords !== undefined) {
            room.exclusiveCustomWords = Boolean(payload.exclusiveCustomWords);
          }

          if (Array.isArray(words)) {
            const newWords: typeof room.customWords = replaceAll ? [] : (room.customWords || []);
            const existing = new Set(newWords.map((w) => w.word.toLowerCase()));

            for (const w of words) {
              if (w && w.word && w.definition && !existing.has(String(w.word).toLowerCase())) {
                existing.add(String(w.word).toLowerCase());
                newWords.push({
                  id: w.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  word: String(w.word).trim(),
                  definition: formatConcept(String(w.definition).trim()),
                  partOfSpeech: w.partOfSpeech ? String(w.partOfSpeech).trim() : 'substantivo',
                  exampleSentence: w.exampleSentence ? String(w.exampleSentence).trim() : undefined,
                  difficulty: w.difficulty || 'medio',
                  isCustom: true,
                });
              }
            }
            room.customWords = newWords;
            savePersistentWords(newWords);

            broadcastToRoom(room.roomCode, {
              type: 'ROOM_UPDATE',
              room,
            });
          }
          break;
        }

        case 'RESET_DICTIONARY': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.customWords = [];
          room.exclusiveCustomWords = false;
          savePersistentWords([]);
          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });
          break;
        }

        case 'SET_EXCLUSIVE_DICTIONARY': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.exclusiveCustomWords = Boolean(payload.exclusive);
          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    const meta = socketMap.get(ws);
    if (meta) {
      const room = rooms.get(meta.roomCode);
      if (room) {
        const player = room.players.find((p) => p.id === meta.playerId);
        if (player) {
          player.isConnected = false;
          broadcastToRoom(room.roomCode, {
            type: 'ROOM_UPDATE',
            room,
          });
        }
      }
      socketMap.delete(ws);
    }
  });
});

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size });
});

app.get('/api/words/random', (req, res) => {
  const count = Number(req.query.count) || 3;
  res.json({ words: getRandomWordChoices(count) });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomCode: room.roomCode,
    playerCount: room.players.length,
    phase: room.currentRound?.phase || 'LOBBY',
  });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Jogo do Dicionário Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
