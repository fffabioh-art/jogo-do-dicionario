import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  RoomState,
  Player,
  WordItem,
  GameSettings,
  BluffEntry,
  RoundScoreDetail,
} from './src/types/game';
import {
  DICTIONARY_WORDS,
  getRandomWordChoices,
  getDecoyBluff,
  fisherYatesShuffle,
} from './src/data/dictionary';
import {
  formatConcept,
  isLeaderBluffing,
  getAlternativeLetter,
} from './src/utils/textFormatting';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const rooms = new Map<string, RoomState>();
const roomTimers = new Map<string, NodeJS.Timeout>();
const clientMap = new Map<WebSocket, { roomCode: string; playerId: string }>();

const BOT_PRESETS = [
  { name: 'Machado de Assis', avatar: 'palito_cartola', color: '#8B5CF6' },
  { name: 'Clarice Lispector', avatar: 'palito_gato', color: '#EC4899' },
  { name: 'Aurélio Buarque', avatar: 'palito_mago', color: '#10B981' },
  { name: 'Guimarães Rosa', avatar: 'palito_coelho', color: '#F59E0B' },
  { name: 'O Embusteiro Bot', avatar: 'palito_pirata', color: '#EF4444' },
  { name: 'Carlos Drummond', avatar: 'palito_oculos', color: '#06B6D4' },
  { name: 'Cecília Meireles', avatar: 'palito_urso', color: '#F43F5E' },
  { name: 'Jorge Amado', avatar: 'palito_bone', color: '#D97706' },
  { name: 'Rachel de Queiroz', avatar: 'palito_sapo', color: '#22C55E' },
  { name: 'Mário de Andrade', avatar: 'palito_alien', color: '#6366F1' },
  { name: 'Graciliano Ramos', avatar: 'palito_chifrinho', color: '#DC2626' },
  { name: 'Monteiro Lobato', avatar: 'palito_chef', color: '#14B8A6' },
];

function normalizePlayerName(name: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function migratePlayerIdInRoom(room: RoomState, oldId: string, newId: string) {
  if (oldId === newId) return;
  if (room.hostId === oldId) {
    room.hostId = newId;
  }
  if (room.winnerId === oldId) {
    room.winnerId = newId;
  }
  const round = room.currentRound;
  if (round) {
    if (round.leaderId === oldId) {
      round.leaderId = newId;
    }
    if (round.nextRoundRequesterId === oldId) {
      round.nextRoundRequesterId = newId;
    }
    if (round.nextRoundConfirmations) {
      round.nextRoundConfirmations = round.nextRoundConfirmations.map((id) =>
        id === oldId ? newId : id
      );
    }
    round.bluffs.forEach((b) => {
      if (b.authorId === oldId) {
        b.authorId = newId;
      }
    });
    if (round.votes[oldId] !== undefined) {
      round.votes[newId] = round.votes[oldId];
      delete round.votes[oldId];
    }
    if (round.scoreDetails) {
      round.scoreDetails.forEach((sd) => {
        if (sd.playerId === oldId) {
          sd.playerId = newId;
        }
      });
    }
  }
}

function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function clearRoomTimer(roomCode: string) {
  const existing = roomTimers.get(roomCode);
  if (existing) {
    clearTimeout(existing);
    roomTimers.delete(roomCode);
  }
}

function getSanitizedRoomForPlayer(room: RoomState, _playerId: string): RoomState {
  const clone: RoomState = JSON.parse(JSON.stringify(room));
  if (clone.currentRound) {
    const phase = clone.currentRound.phase;
    if (phase === 'WORD_CHOICE') {
      clone.currentRound.word.definition = '';
      if (clone.currentRound.wordChoices) {
        clone.currentRound.wordChoices = clone.currentRound.wordChoices.map((w) => ({
          ...w,
          definition: '',
        }));
      }
    } else if (phase === 'SUBMISSION') {
      clone.currentRound.word.definition = '';
    } else if (phase === 'VOTING') {
      clone.currentRound.word.definition = '';
      clone.currentRound.bluffs = clone.currentRound.bluffs.map((b) => ({
        ...b,
        isReal: false,
      }));
    }
  }
  return clone;
}

function broadcastRoom(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  for (const [ws, info] of clientMap.entries()) {
    if (info.roomCode === roomCode && ws.readyState === WebSocket.OPEN) {
      const sanitized = getSanitizedRoomForPlayer(room, info.playerId);
      ws.send(
        JSON.stringify({
          type: 'ROOM_UPDATE',
          payload: sanitized,
        })
      );
    }
  }
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: 'ERROR',
        payload: { message },
      })
    );
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

  for (const [voterId, optionId] of Object.entries(round.votes)) {
    if (optionId === realOptionId) {
      const voterDetail = detailsMap.get(voterId);
      if (voterDetail) {
        voterDetail.pointsEarned += 2;
        voterDetail.breakdown.correctDefinitionBonus += 2;
      }
    } else {
      const votedBluff = round.bluffs.find((b) => b.id === optionId);
      if (votedBluff && votedBluff.authorId && votedBluff.authorId !== voterId) {
        const authorDetail = detailsMap.get(votedBluff.authorId);
        if (authorDetail) {
          authorDetail.pointsEarned += 1;
          authorDetail.breakdown.bluffVotesEarned += 1;
        }

        const authorPlayer = room.players.find((p) => p.id === votedBluff.authorId);
        const voterPlayer = room.players.find((p) => p.id === voterId);
        if (authorPlayer) {
          authorPlayer.totalVotesReceived = (authorPlayer.totalVotesReceived || 0) + 1;
          if (!authorPlayer.receivedVotesHistory) authorPlayer.receivedVotesHistory = [];
          authorPlayer.receivedVotesHistory.push({
            id: `rv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            voterId,
            voterName: voterPlayer?.name || 'Jogador',
            voterAvatar: voterPlayer?.avatar || 'palito_classico',
            roundNumber: round.roundNumber,
            word: round.word.word,
            bluffText: votedBluff.text,
          });
        }
      }
    }
  }

  const nonLeaderVotes = Object.entries(round.votes).filter(
    ([voterId]) => voterId !== round.leaderId
  );
  const correctNonLeaderVotes = nonLeaderVotes.filter(
    ([, optId]) => optId === realOptionId
  ).length;

  if (correctNonLeaderVotes === 0 && nonLeaderVotes.length > 0) {
    const leaderDetail = detailsMap.get(round.leaderId);
    if (leaderDetail) {
      leaderDetail.pointsEarned += 3;
      leaderDetail.breakdown.leaderSweepBonus += 3;
    }
  }

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
  if (playersAboveTarget.length === 0) return false;

  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const highestScore = sorted[0].score;
  const leaders = sorted.filter((p) => p.score === highestScore);

  if (leaders.length === 1 && highestScore >= target) {
    room.winnerId = leaders[0].id;
    room.isTieBreakActive = false;
    return true;
  } else if (leaders.length > 1 && highestScore >= target) {
    room.isTieBreakActive = true;
    return false;
  }

  return false;
}

function handleStartRevealPhase(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound) return;

  clearRoomTimer(roomCode);

  const round = room.currentRound;
  const { scoreDetails } = computeRoundPoints(room);
  round.scoreDetails = scoreDetails;
  round.phase = 'REVEAL';

  room.roundHistory.unshift({
    roundNumber: round.roundNumber,
    word: round.word.word,
    realDefinition: formatConcept(round.word.definition),
  });

  const isOver = checkEndGameCondition(room);
  if (isOver) {
    round.isFinalRound = true;
  }

  broadcastRoom(roomCode);
}

function checkVotingCompletion(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound || room.currentRound.phase !== 'VOTING') return;

  const round = room.currentRound;
  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const leaderHasBluff = round.bluffs.some((b) => b.authorId === round.leaderId);

  const eligibleVoters = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    if (p.id === round.leaderId && !leaderBluffs && !leaderHasBluff) return false;
    return true;
  });

  const allVoted = eligibleVoters.every((p) => round.votes[p.id] !== undefined);

  if (allVoted) {
    clearRoomTimer(roomCode);
    round.allVotesIn = true;
    broadcastRoom(roomCode);

    const leader = room.players.find((p) => p.id === round.leaderId);
    if (leader?.isBot) {
      setTimeout(() => {
        const currentRoom = rooms.get(roomCode);
        if (currentRoom?.currentRound?.phase === 'VOTING' && currentRoom.currentRound.allVotesIn) {
          handleStartRevealPhase(roomCode);
        }
      }, 1500);
    }
  } else {
    round.allVotesIn = false;
    broadcastRoom(roomCode);
  }
}

function handleBotVotes(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound || room.currentRound.phase !== 'VOTING') return;

  const round = room.currentRound;
  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const bots = room.players.filter((p) => {
    if (!p.isBot || p.hasVoted) return false;
    if (p.id === round.leaderId && !leaderBluffs) return false;
    return true;
  });

  bots.forEach((bot) => {
    const eligibleOptions = round.bluffs.filter((b) => b.authorId !== bot.id);
    if (eligibleOptions.length > 0) {
      const real = eligibleOptions.find((b) => b.isReal);
      let picked = eligibleOptions[Math.floor(Math.random() * eligibleOptions.length)];
      if (real && Math.random() < 0.4) {
        picked = real;
      }
      round.votes[bot.id] = picked.id;
      bot.hasVoted = true;
    }
  });

  checkVotingCompletion(roomCode);
}

function handleStartVotingPhase(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound) return;

  clearRoomTimer(roomCode);

  const round = room.currentRound;
  const realFormatted = formatConcept(round.word.definition);
  const realBluff: BluffEntry = {
    id: 'entry_real_' + Date.now(),
    authorId: 'REAL',
    text: realFormatted,
    isReal: true,
  };

  const existingBluffs = [...round.bluffs];
  const usedTexts = new Set<string>([
    realFormatted,
    ...existingBluffs.map((b) => formatConcept(b.text)),
  ]);

  let decoyIdx = 0;
  while (existingBluffs.length < 3 && decoyIdx < 6) {
    const candidate = formatConcept(getDecoyBluff(round.word, decoyIdx));
    if (candidate && !usedTexts.has(candidate)) {
      usedTexts.add(candidate);
      existingBluffs.push({
        id: `decoy_${round.roundNumber}_${decoyIdx}_${Date.now()}`,
        authorId: 'DECOY',
        text: candidate,
        isReal: false,
      });
    }
    decoyIdx++;
  }

  const finalBluffs: BluffEntry[] = fisherYatesShuffle([...existingBluffs, realBluff]);
  finalBluffs.forEach((b, idx) => {
    b.letterLabel = getAlternativeLetter(idx);
  });

  round.bluffs = finalBluffs;
  round.phase = 'VOTING';
  round.votes = {};
  round.allVotesIn = false;
  round.startTime = Date.now();

  room.players.forEach((p) => {
    p.hasVoted = false;
  });

  const votingLimit = room.settings.votingTimeLimit;
  if (votingLimit > 0) {
    round.deadline = Date.now() + votingLimit * 1000;
    const t = setTimeout(() => {
      const r = rooms.get(roomCode);
      if (r && r.currentRound && r.currentRound.phase === 'VOTING') {
        r.currentRound.allVotesIn = true;
        broadcastRoom(roomCode);
        const leader = r.players.find((p) => p.id === r.currentRound?.leaderId);
        if (leader?.isBot) {
          setTimeout(() => {
            if (rooms.get(roomCode)?.currentRound?.phase === 'VOTING') {
              handleStartRevealPhase(roomCode);
            }
          }, 1200);
        }
      }
    }, votingLimit * 1000);
    roomTimers.set(roomCode, t);
  } else {
    round.deadline = undefined;
  }

  broadcastRoom(roomCode);
  setTimeout(() => handleBotVotes(roomCode), 900);
}

function checkSubmissionCompletion(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound || room.currentRound.phase !== 'SUBMISSION') return;

  const round = room.currentRound;
  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const nonLeaders = room.players.filter(
    (p) => (p.isConnected || p.isBot) && p.id !== round.leaderId
  );
  const leader = room.players.find((p) => p.id === round.leaderId);

  const allNonLeadersSubmitted = nonLeaders.every((p) => p.hasSubmitted);
  const allSubmitted = leaderBluffs
    ? allNonLeadersSubmitted && Boolean(leader?.hasSubmitted)
    : allNonLeadersSubmitted;

  if (allSubmitted) {
    handleStartVotingPhase(roomCode);
  } else {
    broadcastRoom(roomCode);
  }
}

function handleBotSubmissions(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound || room.currentRound.phase !== 'SUBMISSION') return;

  const round = room.currentRound;
  const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
  const bots = room.players.filter((p) => p.isBot && !p.hasSubmitted);

  bots.forEach((bot, index) => {
    const isBotLeader = bot.id === round.leaderId;
    const shouldBluff = !isBotLeader || leaderBluffs;

    if (shouldBluff) {
      const bluffText = formatConcept(getDecoyBluff(round.word, index));
      round.bluffs.push({
        id: 'bot_bluff_' + bot.id + '_' + Date.now(),
        authorId: bot.id,
        text: bluffText,
        isReal: false,
      });
      bot.hasSubmitted = true;
    } else {
      bot.hasSubmitted = true;
    }
  });

  checkSubmissionCompletion(roomCode);
}

function startRoundWithWord(roomCode: string, word: WordItem) {
  const room = rooms.get(roomCode);
  if (!room || !room.currentRound) return;

  clearRoomTimer(roomCode);

  const round = room.currentRound;
  round.word = word;
  round.phase = 'SUBMISSION';
  round.bluffs = [];
  round.votes = {};
  round.startTime = Date.now();

  room.players.forEach((p) => {
    p.hasSubmitted = false;
    p.hasVoted = false;
  });

  const timeLimit = room.settings.submissionTimeLimit;
  if (timeLimit > 0) {
    round.deadline = Date.now() + timeLimit * 1000;
    const t = setTimeout(() => {
      handleStartVotingPhase(roomCode);
    }, timeLimit * 1000);
    roomTimers.set(roomCode, t);
  } else {
    round.deadline = undefined;
  }

  broadcastRoom(roomCode);
  setTimeout(() => handleBotSubmissions(roomCode), 900);
}

function prepareNextRound(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  clearRoomTimer(roomCode);

  if (room.winnerId || room.currentRound?.isFinalRound) {
    if (room.currentRound) {
      room.currentRound.phase = 'GAME_OVER';
    }
    broadcastRoom(roomCode);
    return;
  }

  const currentIndex = room.players.findIndex((p) => p.id === room.currentRound?.leaderId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  const nextLeader = room.players[nextIndex] || room.players[0];

  const roundNumber = (room.currentRound?.roundNumber || 0) + 1;
  const wordChoices = getRandomWordChoices(3, room.usedWordIds || []);

  room.currentRound = {
    roundNumber,
    leaderId: nextLeader.id,
    word: wordChoices[0],
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

  broadcastRoom(roomCode);

  if (nextLeader.isBot) {
    setTimeout(() => {
      const currentRoom = rooms.get(roomCode);
      if (currentRoom && currentRoom.currentRound?.phase === 'WORD_CHOICE') {
        const chosen = wordChoices[0];
        if (!currentRoom.usedWordIds) currentRoom.usedWordIds = [];
        currentRoom.usedWordIds.push(chosen.id);
        startRoundWithWord(roomCode, chosen);
      }
    }, 1500);
  }
}

// --- Central Shared Room Logic (invoked by both HTTP REST API and WebSockets) ---

export function createRoomLogic(payload: {
  playerId: string;
  playerName: string;
  avatar: string;
  color: string;
  settings?: any;
}) {
  const { playerId, playerName, avatar, color, settings } = payload;
  const roomCode = generateRoomCode();
  const hostPlayer: Player = {
    id: playerId,
    name: playerName || 'Jogador 1',
    avatar: avatar || 'palito_classico',
    color: color || '#F59E0B',
    score: 0,
    isHost: true,
    isConnected: true,
  };

  const newRoom: RoomState = {
    roomCode,
    hostId: hostPlayer.id,
    settings: {
      targetScore: settings?.targetScore !== undefined ? Number(settings.targetScore) : 20,
      submissionTimeLimit:
        settings?.submissionTimeLimit !== undefined ? Number(settings.submissionTimeLimit) : 0,
      votingTimeLimit:
        settings?.votingTimeLimit !== undefined ? Number(settings.votingTimeLimit) : 0,
      leaderBluffsRule: settings?.leaderBluffsRule === 'always' ? 'always' : 'never',
      readingMode: settings?.readingMode === 'leader_read' ? 'leader_read' : 'visible',
      twoPlayerDecoyCount: 2,
    },
    players: [hostPlayer], // No bots added by default, as requested!
    currentRound: null,
    roundHistory: [],
    isTieBreakActive: false,
    usedWordIds: [],
  };

  rooms.set(roomCode, newRoom);
  broadcastRoom(roomCode);
  return { success: true, roomCode, room: getSanitizedRoomForPlayer(newRoom, hostPlayer.id) };
}

export function joinRoomLogic(payload: {
  roomCode: string;
  playerId: string;
  playerName: string;
  avatar?: string;
  color?: string;
}) {
  const { roomCode: rawCode, playerId, playerName, avatar, color } = payload;
  const roomCode = (rawCode || '').toUpperCase().trim();
  const room = rooms.get(roomCode);

  if (!room) {
    return { success: false, error: 'Sala não encontrada! Verifique o código digitado.' };
  }

  // 1. Check by exact playerId OR by normalized playerName (recovering slot and score!)
  const normTarget = normalizePlayerName(playerName);
  let existingPlayer = room.players.find((p) => p.id === playerId);
  if (!existingPlayer && normTarget) {
    existingPlayer = room.players.find(
      (p) => !p.isBot && normalizePlayerName(p.name) === normTarget
    );
  }

  if (existingPlayer) {
    const oldId = existingPlayer.id;
    existingPlayer.id = playerId;
    migratePlayerIdInRoom(room, oldId, playerId);
    existingPlayer.isConnected = true;
    existingPlayer.name = playerName || existingPlayer.name;
    if (avatar) existingPlayer.avatar = avatar;
    if (color) existingPlayer.color = color;
  } else {
    if (room.players.length >= 10) {
      return { success: false, error: 'A sala atingiu o limite máximo de 10 participantes!' };
    }
    const newPlayer: Player = {
      id: playerId,
      name: playerName || `Jogador ${room.players.length + 1}`,
      avatar: avatar || 'palito_classico',
      color: color || '#EC4899',
      score: 0,
      isHost: false,
      isConnected: true,
    };
    room.players.push(newPlayer);
  }

  broadcastRoom(roomCode);
  return { success: true, roomCode, room: getSanitizedRoomForPlayer(room, playerId) };
}

export function getRoomLogic(roomCode: string, playerId: string) {
  const code = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return { success: false, error: 'Sala não encontrada' };
  }
  return { success: true, room: getSanitizedRoomForPlayer(room, playerId) };
}

export function leaveRoomLogic(roomCode: string, playerId: string) {
  const code = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (room) {
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
    }
    broadcastRoom(code);
  }
  return { success: true };
}

export function executeActionLogic(roomCode: string, playerId: string, type: string, payload: any) {
  const code = (roomCode || '').toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) {
    return { success: false, error: 'Sala não encontrada' };
  }

  switch (type) {
    case 'UPDATE_SETTINGS': {
      if (room.hostId !== playerId) return { success: false, error: 'Apenas o Host pode alterar configurações.' };
      room.settings = { ...room.settings, ...payload };
      broadcastRoom(code);
      break;
    }

    case 'ADD_BOT': {
      if (room.hostId !== playerId) return { success: false, error: 'Apenas o Host pode adicionar bots.' };
      if (room.players.length >= 10) return { success: false, error: 'Limite de 10 participantes atingido.' };

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
      broadcastRoom(code);
      break;
    }

    case 'REMOVE_BOT': {
      if (room.hostId !== playerId) return { success: false, error: 'Apenas o Host pode remover bots.' };
      const botIndex = room.players.map((p) => p.isBot).lastIndexOf(true);
      if (botIndex !== -1) {
        room.players.splice(botIndex, 1);
        broadcastRoom(code);
      }
      break;
    }

    case 'KICK_PLAYER': {
      if (room.hostId !== playerId) return { success: false, error: 'Apenas o Host pode remover jogadores.' };
      const targetId = payload?.playerId;
      if (targetId === room.hostId) return { success: false, error: 'Não é possível remover o Host.' };
      room.players = room.players.filter((p) => p.id !== targetId);
      broadcastRoom(code);
      break;
    }

    case 'START_GAME': {
      if (room.hostId !== playerId) return { success: false, error: 'Apenas o Host pode iniciar a partida.' };
      if (room.players.length < 2) {
        return { success: false, error: 'É necessário pelo menos 2 participantes (ou adicione um Bot) para começar!' };
      }

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
      room.usedWordIds = [];

      const leader = room.players[0];
      const wordChoices = getRandomWordChoices(3, []);

      room.currentRound = {
        roundNumber: 1,
        leaderId: leader.id,
        word: wordChoices[0],
        phase: 'WORD_CHOICE',
        wordChoices,
        bluffs: [],
        votes: {},
      };

      broadcastRoom(code);

      if (leader.isBot) {
        setTimeout(() => {
          const currentRoom = rooms.get(code);
          if (currentRoom?.currentRound?.phase === 'WORD_CHOICE') {
            const chosen = wordChoices[0];
            if (!currentRoom.usedWordIds) currentRoom.usedWordIds = [];
            currentRoom.usedWordIds.push(chosen.id);
            startRoundWithWord(code, chosen);
          }
        }, 1400);
      }
      break;
    }

    case 'REROLL_WORDS': {
      if (!room.currentRound) return { success: false };
      if (room.currentRound.leaderId !== playerId && room.hostId !== playerId) {
        return { success: false, error: 'Apenas o líder ou host pode sortear novas palavras.' };
      }

      const currentIds = (room.currentRound.wordChoices || []).map((w) => w.id);
      const newChoices = getRandomWordChoices(3, [...(room.usedWordIds || []), ...currentIds]);
      room.currentRound.wordChoices = newChoices;
      broadcastRoom(code);
      break;
    }

    case 'SELECT_WORD': {
      if (!room.currentRound) return { success: false };
      if (room.currentRound.leaderId !== playerId && room.hostId !== playerId) {
        return { success: false, error: 'Apenas o líder pode escolher a palavra.' };
      }

      const selectedWord: WordItem = payload.word;
      const authenticWord =
        DICTIONARY_WORDS.find(
          (w) =>
            w.id === selectedWord.id ||
            w.word.toLowerCase() === String(selectedWord.word || '').toLowerCase()
        ) || selectedWord;

      if (!room.usedWordIds) room.usedWordIds = [];
      if (!room.usedWordIds.includes(authenticWord.id)) {
        room.usedWordIds.push(authenticWord.id);
      }
      startRoundWithWord(code, authenticWord);
      break;
    }

    case 'SUBMIT_BLUFF': {
      if (!room.currentRound || room.currentRound.phase !== 'SUBMISSION') return { success: false };

      const player = room.players.find((p) => p.id === playerId);
      if (!player) return { success: false };

      const isLeader = player.id === room.currentRound.leaderId;
      const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
      if (isLeader && !leaderBluffs) {
        return { success: false, error: 'O líder não escreve nem vota nesta configuração!' };
      }

      const bluffText = formatConcept(payload.text || '');
      if (!bluffText) return { success: false };

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
      checkSubmissionCompletion(code);
      break;
    }

    case 'SUBMIT_VOTE': {
      if (!room.currentRound || room.currentRound.phase !== 'VOTING') return { success: false };

      const player = room.players.find((p) => p.id === playerId);
      if (!player) return { success: false };

      const isLeader = player.id === room.currentRound.leaderId;
      const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
      const leaderHasBluff = room.currentRound.bluffs.some((b) => b.authorId === player.id);

      if (isLeader && !leaderBluffs && !leaderHasBluff) {
        return { success: false };
      }

      const optionId: string = payload.optionId;
      const chosenOption = room.currentRound.bluffs.find((b) => b.id === optionId);
      if (chosenOption && chosenOption.authorId === player.id) {
        return { success: false, error: 'Você não pode votar no seu próprio blefe!' };
      }

      room.currentRound.votes[player.id] = optionId;
      player.hasVoted = true;
      checkVotingCompletion(code);
      break;
    }

    case 'REVEAL_RESULTS': {
      if (!room.currentRound || room.currentRound.phase !== 'VOTING') return { success: false };
      if (room.currentRound.leaderId !== playerId && room.hostId !== playerId) return { success: false };

      handleStartRevealPhase(code);
      break;
    }

    case 'REQUEST_NEXT_ROUND':
    case 'NEXT_ROUND': {
      if (!room.currentRound) return { success: false };

      if (!room.currentRound.nextRoundConfirmations) {
        room.currentRound.nextRoundConfirmations = [];
      }

      room.currentRound.nextRoundRequested = true;
      room.currentRound.nextRoundRequesterId = playerId;

      if (!room.currentRound.nextRoundConfirmations.includes(playerId)) {
        room.currentRound.nextRoundConfirmations.push(playerId);
      }

      room.players
        .filter((p) => p.isBot)
        .forEach((b) => {
          if (!room.currentRound?.nextRoundConfirmations?.includes(b.id)) {
            room.currentRound?.nextRoundConfirmations?.push(b.id);
          }
        });

      const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
      const allConfirmed =
        activePlayers.length > 0 &&
        activePlayers.every((p) => room.currentRound?.nextRoundConfirmations?.includes(p.id));

      if (allConfirmed) {
        prepareNextRound(code);
      } else {
        broadcastRoom(code);
      }
      break;
    }

    case 'CONFIRM_NEXT_ROUND': {
      if (!room.currentRound) return { success: false };

      if (!room.currentRound.nextRoundConfirmations) {
        room.currentRound.nextRoundConfirmations = [];
      }

      if (!room.currentRound.nextRoundConfirmations.includes(playerId)) {
        room.currentRound.nextRoundConfirmations.push(playerId);
      }

      room.players
        .filter((p) => p.isBot)
        .forEach((b) => {
          if (!room.currentRound?.nextRoundConfirmations?.includes(b.id)) {
            room.currentRound?.nextRoundConfirmations?.push(b.id);
          }
        });

      const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
      const allConfirmed =
        activePlayers.length > 0 &&
        activePlayers.every((p) => room.currentRound?.nextRoundConfirmations?.includes(p.id));

      if (allConfirmed) {
        prepareNextRound(code);
      } else {
        broadcastRoom(code);
      }
      break;
    }

    case 'RESTART_GAME': {
      if (room.hostId !== playerId) return { success: false, error: 'Apenas o host pode reiniciar.' };

      clearRoomTimer(code);
      room.currentRound = null;
      room.winnerId = undefined;
      room.isTieBreakActive = false;
      room.players.forEach((p) => {
        p.score = 0;
        p.hasSubmitted = false;
        p.hasVoted = false;
      });

      broadcastRoom(code);
      break;
    }
  }

  const updatedRoom = rooms.get(code);
  return {
    success: true,
    room: updatedRoom ? getSanitizedRoomForPlayer(updatedRoom, playerId) : undefined,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS support for mobile devices and preview frames
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- HTTP REST API ENDPOINTS (100% Reliable on all cell phones, QR codes, and proxies) ---
  app.post('/api/rooms', (req, res) => {
    try {
      const result = createRoomLogic(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro ao criar sala' });
    }
  });

  app.get('/api/rooms/:code', (req, res) => {
    try {
      const roomCode = req.params.code;
      const playerId = (req.query.playerId as string) || '';
      const result = getRoomLogic(roomCode, playerId);
      if (!result.success) {
        return res.status(404).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro ao buscar sala' });
    }
  });

  app.post('/api/rooms/:code/join', (req, res) => {
    try {
      const roomCode = req.params.code;
      const result = joinRoomLogic({ ...req.body, roomCode });
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro ao entrar na sala' });
    }
  });

  app.post('/api/rooms/:code/action', (req, res) => {
    try {
      const roomCode = req.params.code;
      const { playerId, type, payload } = req.body;
      const result = executeActionLogic(roomCode, playerId, type, payload);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro na ação' });
    }
  });

  app.post('/api/rooms/:code/leave', (req, res) => {
    try {
      const roomCode = req.params.code;
      const { playerId } = req.body;
      const result = leaveRoomLogic(roomCode, playerId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Erro ao sair' });
    }
  });

  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/ws-game') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (raw: string) => {
      try {
        const message = JSON.parse(raw.toString());
        const { type, payload } = message;

        switch (type) {
          case 'PING': {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PONG' }));
            }
            break;
          }

          case 'CREATE_ROOM': {
            const res = createRoomLogic(payload);
            clientMap.set(ws, { roomCode: res.roomCode, playerId: payload.playerId });
            break;
          }

          case 'JOIN_ROOM': {
            const res = joinRoomLogic(payload);
            if (!res.success || !res.roomCode) {
              sendError(ws, res.error || 'Erro ao entrar na sala');
            } else {
              clientMap.set(ws, { roomCode: res.roomCode, playerId: payload.playerId });
            }
            break;
          }

          case 'RECONNECT': {
            const res = joinRoomLogic(payload);
            if (res.success && res.roomCode) {
              clientMap.set(ws, { roomCode: res.roomCode, playerId: payload.playerId });
            }
            break;
          }

          case 'LEAVE_ROOM': {
            const info = clientMap.get(ws);
            if (info) {
              leaveRoomLogic(info.roomCode, info.playerId);
              clientMap.delete(ws);
            }
            break;
          }

          default: {
            const info = clientMap.get(ws);
            if (info) {
              const res = executeActionLogic(info.roomCode, info.playerId, type, payload);
              if (!res.success && res.error) {
                sendError(ws, res.error);
              }
            }
            break;
          }
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    });

    ws.on('close', () => {
      const info = clientMap.get(ws);
      if (info) {
        leaveRoomLogic(info.roomCode, info.playerId);
        clientMap.delete(ws);
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
