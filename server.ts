import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  RoomState,
  Player,
  RoundData,
  GameSettings,
  BluffEntry,
  RoundScoreDetail
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

  // Leader sweep bonus: +3 points to Leader if NO player guessed the real definition
  // Note: Only non-leader votes count toward testing if anyone guessed real!
  if (countCorrectVotes === 0) {
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

  // Add the real dictionary definition in UPPERCASE
  const realBluff: BluffEntry = {
    id: 'entry_real_' + Date.now(),
    authorId: 'REAL',
    text: round.word.definition.trim().toUpperCase(),
    isReal: true,
  };

  const finalBluffs: BluffEntry[] = [...round.bluffs, realBluff];

  // If 2 players, inject decoy definitions in UPPERCASE
  const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
  if (activePlayers.length <= 2 || finalBluffs.length < 3) {
    const decoy1: BluffEntry = {
      id: 'entry_decoy_1',
      authorId: 'BOT_DECOY',
      text: getDecoyBluff(round.word, 0).trim().toUpperCase(),
      isReal: false,
    };
    finalBluffs.push(decoy1);

    if (finalBluffs.length < 4) {
      const decoy2: BluffEntry = {
        id: 'entry_decoy_2',
        authorId: 'BOT_DECOY',
        text: getDecoyBluff(round.word, 1).trim().toUpperCase(),
        isReal: false,
      };
      finalBluffs.push(decoy2);
    }
  }

  // Shuffle bluffs randomly
  finalBluffs.sort(() => Math.random() - 0.5);

  // Assign letters A, B, C, D...
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  finalBluffs.forEach((b, idx) => {
    b.letterLabel = letters[idx] || `${idx + 1}`;
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
    realDefinition: round.word.definition,
  });

  // Check game over or sudden death
  const isOver = checkEndGameCondition(room);
  if (isOver) {
    round.phase = 'GAME_OVER';
  }

  broadcastToRoom(room.roomCode, {
    type: 'ROOM_UPDATE',
    room,
  });
}

function handleBotSubmissions(room: RoomState) {
  const round = room.currentRound;
  if (!round || round.phase !== 'SUBMISSION') return;

  const bots = room.players.filter((p) => p.isBot && !p.hasSubmitted);
  bots.forEach((bot, index) => {
    const isLeader = bot.id === round.leaderId;
    const shouldBluff =
      !isLeader ||
      room.settings.leaderBluffsRule === 'always' ||
      (room.settings.leaderBluffsRule === 'auto' && room.players.length <= 4);

    if (shouldBluff) {
      const bluffText = getDecoyBluff(round.word, index + 3).trim().toUpperCase();
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

  const bots = room.players.filter((p) => p.isBot && !p.hasVoted);
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

  const eligiblePlayers = room.players.filter((p) => {
    if (!p.isConnected && !p.isBot) return false;
    if (p.id === round.leaderId) {
      // Leader eligibility depends on rule
      if (room.settings.leaderBluffsRule === 'never') return false;
      if (room.settings.leaderBluffsRule === 'auto' && room.players.length >= 5) return false;
    }
    return true;
  });

  const allSubmitted = eligiblePlayers.every((p) => p.hasSubmitted);
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

  const activePlayers = room.players.filter((p) => p.isConnected || p.isBot);
  const allVoted = activePlayers.every((p) => round.votes[p.id] !== undefined);

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

  // Determine next leader in round-robin fashion
  const currentIndex = room.players.findIndex((p) => p.id === room.currentRound?.leaderId);
  const nextIndex = (currentIndex + 1) % room.players.length;
  const nextLeader = room.players[nextIndex] || room.players[0];

  const roundNumber = (room.currentRound?.roundNumber || 0) + 1;
  const wordChoices = getRandomWordChoices(3, [], room.customWords);

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

  broadcastToRoom(room.roomCode, {
    type: 'ROOM_UPDATE',
    room,
  });

  // If next leader is a bot, pick automatically after 2 seconds
  if (nextLeader.isBot) {
    setTimeout(() => {
      if (room.currentRound?.phase === 'WORD_CHOICE') {
        startRoundWithWord(room, wordChoices[0]);
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

          const newRoom: RoomState = {
            roomCode,
            hostId: hostPlayer.id,
            settings: {
              targetScore: payload.targetScore || 30,
              submissionTimeLimit: payload.submissionTimeLimit ?? 60,
              votingTimeLimit: payload.votingTimeLimit ?? 45,
              leaderBluffsRule: payload.leaderBluffsRule || 'auto',
              twoPlayerDecoyCount: 2,
            },
            players: [hostPlayer],
            currentRound: null,
            roundHistory: [],
            isTieBreakActive: false,
            customWords: [],
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

        case 'ADD_BOT': {
          const meta = socketMap.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

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
          const wordChoices = getRandomWordChoices(3, [], room.customWords);

          room.currentRound = {
            roundNumber: 1,
            leaderId: leader.id,
            word: wordChoices[0],
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
                startRoundWithWord(room, wordChoices[0]);
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
            startRoundWithWord(room, selectedWord);
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

          const bluffText = (payload.bluffText || '').trim().toUpperCase();
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
              definition: String(word.definition).trim().toUpperCase(),
              partOfSpeech: word.partOfSpeech ? String(word.partOfSpeech).trim() : 'substantivo',
              exampleSentence: word.exampleSentence ? String(word.exampleSentence).trim() : undefined,
              difficulty: word.difficulty || 'medio',
              isCustom: true,
            });
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
          if (Array.isArray(words) && words.length > 0) {
            if (!room.customWords) room.customWords = [];
            const existing = new Set(room.customWords.map((w) => w.word.toLowerCase()));
            for (const w of words) {
              if (w && w.word && w.definition && !existing.has(String(w.word).toLowerCase())) {
                existing.add(String(w.word).toLowerCase());
                room.customWords.push({
                  id: w.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  word: String(w.word).trim(),
                  definition: String(w.definition).trim().toUpperCase(),
                  partOfSpeech: w.partOfSpeech ? String(w.partOfSpeech).trim() : 'substantivo',
                  exampleSentence: w.exampleSentence ? String(w.exampleSentence).trim() : undefined,
                  difficulty: w.difficulty || 'medio',
                  isCustom: true,
                });
              }
            }
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
