import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  RoomState,
  Player,
  WordItem,
  GameSettings,
  BluffEntry,
  RoundScoreDetail,
} from '../types/game';
import {
  DICTIONARY_WORDS,
  getRandomWordChoices,
  getDecoyBluff,
  fisherYatesShuffle,
} from '../data/dictionary';
import {
  formatConcept,
  isLeaderBluffing,
  getAlternativeLetter,
} from '../utils/textFormatting';
import { soundManager } from '../utils/soundEffects';

export interface SavedReconnectInfo {
  roomCode: string;
  playerName: string;
  avatar: string;
  color: string;
  score: number;
  timestamp: number;
}

interface GameContextType {
  room: RoomState | null;
  myPlayerId: string;
  myPlayer: Player | undefined;
  isHost: boolean;
  isLeader: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  error: string | null;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  clearError: () => void;
  savedReconnectInfo: SavedReconnectInfo | null;
  rejoinSavedRoom: () => void;
  clearSavedReconnectInfo: () => void;

  // Actions
  createRoom: (
    name: string,
    avatar: string,
    color: string,
    settings?: Partial<GameSettings>,
    customWords?: WordItem[],
    exclusiveCustomWords?: boolean
  ) => void;
  joinRoom: (roomCode: string, name: string, avatar: string, color: string) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  addBot: () => void;
  removeBot: () => void;
  kickPlayer: (playerId: string) => void;
  startGame: () => void;
  rerollWordChoices: () => void;
  selectWord: (word: WordItem) => void;
  submitBluff: (text: string) => void;
  submitVote: (optionId: string) => void;
  revealResults: () => void;
  nextRound: () => void;
  requestNextRound: () => void;
  confirmNextRound: () => void;
  forceNextRound: () => void;
  addCustomWord: (word: Partial<WordItem>) => void;
  importDictionary: (words: WordItem[], replaceAll?: boolean, exclusiveCustomWords?: boolean) => void;
  setExclusiveCustomWords: (exclusive: boolean) => void;
  resetDictionary: () => void;
  adjustPlayerScore: (playerId: string, delta: number) => void;
  setPlayerScore: (playerId: string, score: number) => void;
  adjustRoundPoints: (playerId: string, delta: number) => void;
  setRoundPoints: (playerId: string, roundPoints: number) => void;
  restartGame: () => void;
  leaveRoom: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEYS = {
  PLAYER_ID: 'jdd_player_id',
  PLAYER_NAME: 'jdd_player_name',
  PLAYER_AVATAR: 'jdd_player_avatar',
  PLAYER_COLOR: 'jdd_player_color',
  LAST_ROOM: 'jdd_last_room',
  RECONNECT_INFO: 'jdd_reconnect_info_v1',
  ROOMS_DB: 'jdd_client_rooms_v1',
};

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
  if (room.hostId === oldId) room.hostId = newId;
  if (room.winnerId === oldId) room.winnerId = newId;
  const round = room.currentRound;
  if (round) {
    if (round.leaderId === oldId) round.leaderId = newId;
    if (round.nextRoundRequesterId === oldId) round.nextRoundRequesterId = newId;
    if (round.nextRoundConfirmations) {
      round.nextRoundConfirmations = round.nextRoundConfirmations.map((id) =>
        id === oldId ? newId : id
      );
    }
    round.bluffs.forEach((b) => {
      if (b.authorId === oldId) b.authorId = newId;
    });
    if (round.votes[oldId] !== undefined) {
      round.votes[newId] = round.votes[oldId];
      delete round.votes[oldId];
    }
    if (round.scoreDetails) {
      round.scoreDetails.forEach((sd) => {
        if (sd.playerId === oldId) sd.playerId = newId;
      });
    }
  }
}

function generateRoomCode(existingCodes: Set<string>): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return existingCodes.has(code) ? generateRoomCode(existingCodes) : code;
}

function loadRoomsFromStorage(): Record<string, RoomState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROOMS_DB);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveRoomToStorage(room: RoomState) {
  try {
    const all = loadRoomsFromStorage();
    all[room.roomCode] = room;
    localStorage.setItem(STORAGE_KEYS.ROOMS_DB, JSON.stringify(all));
  } catch (err) {
    console.warn('Failed to persist room in localStorage:', err);
  }
}

function loadSavedReconnectInfo(): SavedReconnectInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECONNECT_INFO);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.roomCode) return parsed;
    return null;
  } catch {
    return null;
  }
}

function persistReconnectInfo(info: SavedReconnectInfo | null) {
  try {
    if (!info) {
      localStorage.removeItem(STORAGE_KEYS.RECONNECT_INFO);
    } else {
      localStorage.setItem(STORAGE_KEYS.RECONNECT_INFO, JSON.stringify(info));
    }
  } catch {}
}

async function apiCall(endpoint: string, method = 'GET', body?: any): Promise<any> {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { success: false, error: data?.error || `Erro HTTP ${res.status}` };
    }
    return data;
  } catch (err) {
    console.warn('API network error:', endpoint, err);
    return null;
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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<RoomState | null>(() => {
    // If the user arrived with a ?room= URL parameter from a QR code or invite link,
    // do not load a stale old room from localStorage so the user can easily join the new room!
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room');
      const lastRoomCode = localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
      if (urlRoom && urlRoom.toUpperCase() !== (lastRoomCode || '').toUpperCase()) {
        return null;
      }
    }
    const lastRoomCode = localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
    if (lastRoomCode) {
      const savedRooms = loadRoomsFromStorage();
      if (savedRooms[lastRoomCode]) {
        return savedRooms[lastRoomCode];
      }
    }
    return null;
  });

  const [myPlayerId] = useState<string>(() => {
    const existing = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (existing) return existing;
    const created = 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    localStorage.setItem(STORAGE_KEYS.PLAYER_ID, created);
    return created;
  });

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connected');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMutedState] = useState<boolean>(() => soundManager.getMuted());
  const [savedReconnectInfo, setSavedReconnectInfo] = useState<SavedReconnectInfo | null>(() =>
    loadSavedReconnectInfo()
  );

  const wsRef = useRef<WebSocket | null>(null);
  const wsAvailableRef = useRef<boolean>(false);
  const roomRef = useRef<RoomState | null>(room);
  roomRef.current = room;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
  }, []);

  const setIsMuted = (muted: boolean) => {
    soundManager.setMuted(muted);
    setIsMutedState(muted);
  };

  const clearError = () => setError(null);

  const clearSavedReconnectInfo = useCallback(() => {
    persistReconnectInfo(null);
    setSavedReconnectInfo(null);
  }, []);

  // Commit room state locally, persist to localStorage, and update reconnect info
  const commitRoom = useCallback(
    (updated: RoomState | null, playPhaseSound = true) => {
      const prevPhase = roomRef.current?.currentRound?.phase;
      const nextPhase = updated?.currentRound?.phase;

      if (playPhaseSound && prevPhase !== nextPhase) {
        if (nextPhase === 'VOTING') {
          soundManager.playPop();
        } else if (nextPhase === 'REVEAL') {
          soundManager.playCorrect();
        } else if (nextPhase === 'GAME_OVER') {
          soundManager.playFanfare();
        }
      }

      roomRef.current = updated;
      setRoom(updated ? { ...updated } : null);

      if (updated) {
        localStorage.setItem(STORAGE_KEYS.LAST_ROOM, updated.roomCode);
        saveRoomToStorage(updated);

        const me = updated.players.find((p) => p.id === myPlayerId);
        if (me) {
          const info: SavedReconnectInfo = {
            roomCode: updated.roomCode,
            playerName: me.name,
            avatar: me.avatar,
            color: me.color,
            score: me.score,
            timestamp: Date.now(),
          };
          persistReconnectInfo(info);
          setSavedReconnectInfo(info);
        }

        try {
          channelRef.current?.postMessage({
            type: 'ROOM_SYNC',
            room: updated,
          });
        } catch {}
      }
    },
    [myPlayerId]
  );

  // Send action via WebSocket if available
  const sendWs = useCallback((type: string, payload?: any): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type, payload }));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  // Execute an action on the active room via HTTP REST API and WebSocket simultaneously
  const sendAction = useCallback(
    async (type: string, payload: any = {}): Promise<boolean> => {
      sendWs(type, payload);

      if (roomRef.current?.roomCode) {
        const code = roomRef.current.roomCode;
        const res = await apiCall(`/api/rooms/${code}/action`, 'POST', {
          playerId: myPlayerId,
          type,
          payload,
        });
        if (res && res.success && res.room) {
          commitRoom(res.room, false);
          return true;
        } else if (res && res.error) {
          setError(res.error);
          return false;
        }
      }
      return false;
    },
    [myPlayerId, sendWs, commitRoom]
  );

  // Active room real-time polling (ensures all mobile devices and browsers stay in sync every 1 second)
  useEffect(() => {
    if (!room?.roomCode) return;
    const code = room.roomCode;
    let isMounted = true;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      const res = await apiCall(`/api/rooms/${code}?playerId=${myPlayerId}`);
      if (isMounted && res && res.success && res.room) {
        const currentJson = JSON.stringify(roomRef.current);
        const incomingJson = JSON.stringify(res.room);
        if (currentJson !== incomingJson) {
          commitRoom(res.room, true);
        }
      }
    };

    const pollInterval = setInterval(poll, 1000);
    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [room?.roomCode, myPlayerId, commitRoom]);

  // WebSocket connection for instant low-latency delivery when supported
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let isUnmounted = false;

    const connectWs = () => {
      if (isUnmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws-game`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          wsAvailableRef.current = true;
          setConnectionStatus('connected');

          const activeRoomCode = localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
          const savedName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
          if (activeRoomCode) {
            ws.send(
              JSON.stringify({
                type: 'RECONNECT',
                payload: {
                  roomCode: activeRoomCode,
                  playerId: myPlayerId,
                  playerName: savedName,
                },
              })
            );
          }

          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ROOM_UPDATE' && data.payload) {
              commitRoom(data.payload, true);
            } else if (data.type === 'ERROR' && data.payload?.message) {
              setError(data.payload.message);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          if (pingInterval) clearInterval(pingInterval);
          if (wsAvailableRef.current) {
            reconnectTimeout = setTimeout(connectWs, 2500);
          } else {
            setConnectionStatus('connected');
          }
        };

        ws.onerror = () => {
          // HTTP polling gracefully handles communication if WebSocket is blocked
          setConnectionStatus('connected');
        };
      } catch {
        setConnectionStatus('connected');
      }
    };

    connectWs();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const activeRoomCode = localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
          const savedName = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
          if (activeRoomCode) {
            wsRef.current.send(
              JSON.stringify({
                type: 'RECONNECT',
                payload: {
                  roomCode: activeRoomCode,
                  playerId: myPlayerId,
                  playerName: savedName,
                },
              })
            );
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmounted = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pingInterval) clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [myPlayerId, commitRoom]);

  // Multi-tab BroadcastChannel & storage listener
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('jdd_local_sync_v1');
      channelRef.current = bc;
      bc.onmessage = (event) => {
        const data = event.data;
        if (data?.type === 'ROOM_SYNC' && data.room) {
          const currentCode = roomRef.current?.roomCode || localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
          if (currentCode && data.room.roomCode === currentCode) {
            roomRef.current = data.room;
            setRoom({ ...data.room });
          }
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.ROOMS_DB && e.newValue) {
        try {
          const allRooms = JSON.parse(e.newValue);
          const currentCode = roomRef.current?.roomCode || localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
          if (currentCode && allRooms[currentCode]) {
            roomRef.current = allRooms[currentCode];
            setRoom({ ...allRooms[currentCode] });
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      clearTimers();
      channelRef.current?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearTimers]);

  // --- Client-Side Fallback Engine (when completely offline or server unreachable) ---

  const handleStartRevealPhase = useCallback(
    (targetRoom: RoomState) => {
      clearTimers();
      const round = targetRoom.currentRound;
      if (!round) return;

      const { scoreDetails } = computeRoundPoints(targetRoom);
      round.scoreDetails = scoreDetails;
      round.phase = 'REVEAL';

      targetRoom.roundHistory.unshift({
        roundNumber: round.roundNumber,
        word: round.word.word,
        realDefinition: formatConcept(round.word.definition),
      });

      const isOver = checkEndGameCondition(targetRoom);
      if (isOver) {
        round.isFinalRound = true;
      }

      commitRoom(targetRoom);
    },
    [clearTimers, commitRoom]
  );

  const checkVotingCompletion = useCallback(
    (targetRoom: RoomState) => {
      const round = targetRoom.currentRound;
      if (!round || round.phase !== 'VOTING') return;

      const leaderBluffs = isLeaderBluffing(targetRoom.settings, targetRoom.players.length);
      const leaderHasBluff = round.bluffs.some((b) => b.authorId === round.leaderId);

      const eligibleVoters = targetRoom.players.filter((p) => {
        if (!p.isConnected && !p.isBot) return false;
        if (p.id === round.leaderId && !leaderBluffs && !leaderHasBluff) return false;
        return true;
      });

      const allVoted = eligibleVoters.every((p) => round.votes[p.id] !== undefined);

      if (allVoted) {
        round.allVotesIn = true;
        commitRoom(targetRoom);

        const leader = targetRoom.players.find((p) => p.id === round.leaderId);
        if (leader?.isBot) {
          botTimerRef.current = setTimeout(() => {
            if (
              roomRef.current &&
              roomRef.current.currentRound?.phase === 'VOTING' &&
              roomRef.current.currentRound.allVotesIn
            ) {
              handleStartRevealPhase({ ...roomRef.current });
            }
          }, 1500);
        }
      } else {
        round.allVotesIn = false;
        commitRoom(targetRoom);
      }
    },
    [commitRoom, handleStartRevealPhase]
  );

  const handleBotVotes = useCallback(
    (targetRoom: RoomState) => {
      const round = targetRoom.currentRound;
      if (!round || round.phase !== 'VOTING') return;

      const leaderBluffs = isLeaderBluffing(targetRoom.settings, targetRoom.players.length);
      const bots = targetRoom.players.filter((p) => {
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

      checkVotingCompletion(targetRoom);
    },
    [checkVotingCompletion]
  );

  const handleStartVotingPhase = useCallback(
    (targetRoom: RoomState) => {
      clearTimers();
      const round = targetRoom.currentRound;
      if (!round) return;

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

      targetRoom.players.forEach((p) => {
        p.hasVoted = false;
      });

      const votingLimit = targetRoom.settings.votingTimeLimit;
      if (votingLimit > 0) {
        round.deadline = Date.now() + votingLimit * 1000;
        timerRef.current = setTimeout(() => {
          if (roomRef.current && roomRef.current.currentRound?.phase === 'VOTING') {
            const next = { ...roomRef.current };
            if (next.currentRound) {
              next.currentRound.allVotesIn = true;
              commitRoom(next);
              const leader = next.players.find((p) => p.id === next.currentRound?.leaderId);
              if (leader?.isBot) {
                setTimeout(() => {
                  if (roomRef.current?.currentRound?.phase === 'VOTING') {
                    handleStartRevealPhase({ ...roomRef.current });
                  }
                }, 1200);
              }
            }
          }
        }, votingLimit * 1000);
      } else {
        round.deadline = undefined;
      }

      commitRoom(targetRoom);

      botTimerRef.current = setTimeout(() => {
        if (roomRef.current && roomRef.current.currentRound?.phase === 'VOTING') {
          handleBotVotes({ ...roomRef.current });
        }
      }, 900);
    },
    [clearTimers, commitRoom, handleBotVotes, handleStartRevealPhase]
  );

  const checkSubmissionCompletion = useCallback(
    (targetRoom: RoomState) => {
      const round = targetRoom.currentRound;
      if (!round || round.phase !== 'SUBMISSION') return;

      const leaderBluffs = isLeaderBluffing(targetRoom.settings, targetRoom.players.length);
      const nonLeaders = targetRoom.players.filter((p) => {
        if (!p.isConnected && !p.isBot) return false;
        return p.id !== round.leaderId;
      });

      const leader = targetRoom.players.find((p) => p.id === round.leaderId);
      const allNonLeadersSubmitted = nonLeaders.every((p) => p.hasSubmitted);

      const allSubmitted = leaderBluffs
        ? allNonLeadersSubmitted && Boolean(leader?.hasSubmitted)
        : allNonLeadersSubmitted;

      if (allSubmitted) {
        handleStartVotingPhase(targetRoom);
      } else {
        commitRoom(targetRoom);
      }
    },
    [commitRoom, handleStartVotingPhase]
  );

  const handleBotSubmissions = useCallback(
    (targetRoom: RoomState) => {
      const round = targetRoom.currentRound;
      if (!round || round.phase !== 'SUBMISSION') return;

      const leaderBluffs = isLeaderBluffing(targetRoom.settings, targetRoom.players.length);
      const bots = targetRoom.players.filter((p) => p.isBot && !p.hasSubmitted);

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

      checkSubmissionCompletion(targetRoom);
    },
    [checkSubmissionCompletion]
  );

  const startRoundWithWord = useCallback(
    (targetRoom: RoomState, word: WordItem) => {
      clearTimers();
      const round = targetRoom.currentRound;
      if (!round) return;

      round.word = word;
      round.phase = 'SUBMISSION';
      round.bluffs = [];
      round.votes = {};
      round.startTime = Date.now();

      targetRoom.players.forEach((p) => {
        p.hasSubmitted = false;
        p.hasVoted = false;
      });

      const timeLimit = targetRoom.settings.submissionTimeLimit;
      if (timeLimit > 0) {
        round.deadline = Date.now() + timeLimit * 1000;
        timerRef.current = setTimeout(() => {
          if (roomRef.current && roomRef.current.currentRound?.phase === 'SUBMISSION') {
            handleStartVotingPhase({ ...roomRef.current });
          }
        }, timeLimit * 1000);
      } else {
        round.deadline = undefined;
      }

      commitRoom(targetRoom);

      botTimerRef.current = setTimeout(() => {
        if (roomRef.current && roomRef.current.currentRound?.phase === 'SUBMISSION') {
          handleBotSubmissions({ ...roomRef.current });
        }
      }, 900);
    },
    [clearTimers, commitRoom, handleBotSubmissions, handleStartVotingPhase]
  );

  const prepareNextRound = useCallback(
    (targetRoom: RoomState) => {
      clearTimers();

      if (targetRoom.winnerId || targetRoom.currentRound?.isFinalRound) {
        if (targetRoom.currentRound) {
          targetRoom.currentRound.phase = 'GAME_OVER';
        }
        commitRoom(targetRoom);
        return;
      }

      const currentIndex = targetRoom.players.findIndex(
        (p) => p.id === targetRoom.currentRound?.leaderId
      );
      const nextIndex = (currentIndex + 1) % targetRoom.players.length;
      const nextLeader = targetRoom.players[nextIndex] || targetRoom.players[0];

      const roundNumber = (targetRoom.currentRound?.roundNumber || 0) + 1;
      const rawChoices = getRandomWordChoices(3, targetRoom.usedWordIds || []);

      const wordChoices = rawChoices.map((w) => ({
        ...w,
        definition: '',
      }));

      targetRoom.currentRound = {
        roundNumber,
        leaderId: nextLeader.id,
        word: { ...rawChoices[0], definition: '' },
        phase: 'WORD_CHOICE',
        wordChoices,
        bluffs: [],
        votes: {},
        isTieBreak: targetRoom.isTieBreakActive,
      };

      targetRoom.players.forEach((p) => {
        p.hasSubmitted = false;
        p.hasVoted = false;
      });

      commitRoom(targetRoom);

      if (nextLeader.isBot) {
        botTimerRef.current = setTimeout(() => {
          if (roomRef.current && roomRef.current.currentRound?.phase === 'WORD_CHOICE') {
            const chosen = rawChoices[0];
            const next = { ...roomRef.current };
            if (!next.usedWordIds) next.usedWordIds = [];
            next.usedWordIds.push(chosen.id);
            startRoundWithWord(next, chosen);
          }
        }, 1400);
      }
    },
    [clearTimers, commitRoom, startRoundWithWord]
  );

  // --- ACTIONS ---

  const createRoom = async (
    name: string,
    avatar: string,
    color: string,
    settings?: Partial<GameSettings>
  ) => {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, avatar);
    localStorage.setItem(STORAGE_KEYS.PLAYER_COLOR, color);

    sendWs('CREATE_ROOM', {
      playerId: myPlayerId,
      playerName: name,
      avatar,
      color,
      settings,
    });

    const res = await apiCall('/api/rooms', 'POST', {
      playerId: myPlayerId,
      playerName: name,
      avatar,
      color,
      settings,
    });

    if (res && res.success && res.room) {
      commitRoom(res.room, false);
      soundManager.playPop();
      return;
    }

    // Fallback if network/server is offline
    const allRooms = loadRoomsFromStorage();
    const roomCode = generateRoomCode(new Set(Object.keys(allRooms)));

    const hostPlayer: Player = {
      id: myPlayerId,
      name: name || 'Jogador 1',
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
      players: [hostPlayer], // Zero bots by default
      currentRound: null,
      roundHistory: [],
      isTieBreakActive: false,
      usedWordIds: [],
    };

    commitRoom(newRoom, false);
    soundManager.playPop();
  };

  const joinRoom = async (roomCode: string, name: string, avatar: string, color: string) => {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, avatar);
    localStorage.setItem(STORAGE_KEYS.PLAYER_COLOR, color);

    const code = roomCode.toUpperCase().trim();
    if (!code) return;

    sendWs('JOIN_ROOM', {
      roomCode: code,
      playerId: myPlayerId,
      playerName: name,
      avatar,
      color,
    });

    const res = await apiCall(`/api/rooms/${code}/join`, 'POST', {
      playerId: myPlayerId,
      playerName: name,
      avatar,
      color,
    });

    if (res && res.success && res.room) {
      commitRoom(res.room, false);
      soundManager.playPop();
      return;
    } else if (res && res.error) {
      setError(res.error);
      return;
    }

    // Fallback to local storage if server unreachable
    const allRooms = loadRoomsFromStorage();
    const existingRoom = allRooms[code];

    if (!existingRoom) {
      setError('Sala não encontrada. Verifique o código digitado!');
      return;
    }

    const normTarget = normalizePlayerName(name);
    let existingPlayer = existingRoom.players.find((p) => p.id === myPlayerId);
    if (!existingPlayer && normTarget) {
      existingPlayer = existingRoom.players.find(
        (p) => !p.isBot && normalizePlayerName(p.name) === normTarget
      );
    }

    if (existingPlayer) {
      const oldId = existingPlayer.id;
      existingPlayer.id = myPlayerId;
      migratePlayerIdInRoom(existingRoom, oldId, myPlayerId);
      existingPlayer.isConnected = true;
      existingPlayer.name = name || existingPlayer.name;
      existingPlayer.avatar = avatar || existingPlayer.avatar;
      existingPlayer.color = color || existingPlayer.color;
    } else {
      if (existingRoom.players.length >= 10) {
        setError('A sala atingiu o limite máximo de 10 participantes!');
        return;
      }
      existingRoom.players.push({
        id: myPlayerId,
        name: name || `Jogador ${existingRoom.players.length + 1}`,
        avatar: avatar || 'palito_classico',
        color: color || '#EC4899',
        score: 0,
        isHost: false,
        isConnected: true,
      });
    }

    commitRoom(existingRoom, false);
    soundManager.playPop();
  };

  const rejoinSavedRoom = () => {
    const info = loadSavedReconnectInfo();
    if (!info) return;
    joinRoom(info.roomCode, info.playerName, info.avatar, info.color);
  };

  const updateSettings = async (settings: Partial<GameSettings>) => {
    const ok = await sendAction('UPDATE_SETTINGS', settings);
    if (!ok && roomRef.current) {
      const next = {
        ...roomRef.current,
        settings: {
          ...roomRef.current.settings,
          ...settings,
        },
      };
      commitRoom(next, false);
    }
  };

  const addBot = async () => {
    const ok = await sendAction('ADD_BOT');
    if (!ok && roomRef.current) {
      const next = { ...roomRef.current, players: [...roomRef.current.players] };
      if (next.players.length >= 10) return;

      const currentBots = next.players.filter((p) => p.isBot).length;
      const preset = BOT_PRESETS[currentBots % BOT_PRESETS.length];

      next.players.push({
        id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        name: preset.name,
        avatar: preset.avatar,
        color: preset.color,
        score: 0,
        isHost: false,
        isBot: true,
        isConnected: true,
      });

      commitRoom(next, false);
    }
    soundManager.playPop();
  };

  const removeBot = async () => {
    const ok = await sendAction('REMOVE_BOT');
    if (!ok && roomRef.current) {
      const next = { ...roomRef.current, players: [...roomRef.current.players] };
      const botIndex = next.players.map((p) => p.isBot).lastIndexOf(true);
      if (botIndex !== -1) {
        next.players.splice(botIndex, 1);
        commitRoom(next, false);
      }
    }
    soundManager.playPop();
  };

  const kickPlayer = async (playerId: string) => {
    const ok = await sendAction('KICK_PLAYER', { playerId });
    if (!ok && roomRef.current) {
      const next = {
        ...roomRef.current,
        players: roomRef.current.players.filter(
          (p) => p.id !== playerId || p.id === roomRef.current?.hostId
        ),
      };
      commitRoom(next, false);
    }
  };

  const startGame = async () => {
    if (roomRef.current && roomRef.current.players.length < 2) {
      setError('É necessário pelo menos 2 participantes (ou adicione um Bot) para começar!');
      return;
    }

    const ok = await sendAction('START_GAME');
    if (!ok && roomRef.current) {
      const next = {
        ...roomRef.current,
        players: [...roomRef.current.players],
      };

      next.players.forEach((p) => {
        p.score = 0;
        p.hasSubmitted = false;
        p.hasVoted = false;
        p.totalVotesReceived = 0;
        p.receivedVotesHistory = [];
      });

      next.roundHistory = [];
      next.winnerId = undefined;
      next.isTieBreakActive = false;
      next.usedWordIds = [];

      const leader = next.players[0];
      const rawChoices = getRandomWordChoices(3, []);
      const wordChoices = rawChoices.map((w) => ({
        ...w,
        definition: '',
      }));

      next.currentRound = {
        roundNumber: 1,
        leaderId: leader.id,
        word: { ...rawChoices[0], definition: '' },
        phase: 'WORD_CHOICE',
        wordChoices,
        bluffs: [],
        votes: {},
      };

      commitRoom(next, false);

      if (leader.isBot) {
        botTimerRef.current = setTimeout(() => {
          if (roomRef.current?.currentRound?.phase === 'WORD_CHOICE') {
            const chosen = rawChoices[0];
            const updated = { ...roomRef.current };
            if (!updated.usedWordIds) updated.usedWordIds = [];
            updated.usedWordIds.push(chosen.id);
            startRoundWithWord(updated, chosen);
          }
        }, 1400);
      }
    }
    soundManager.playPop();
  };

  const rerollWordChoices = async () => {
    const ok = await sendAction('REROLL_WORDS');
    if (!ok && roomRef.current && roomRef.current.currentRound) {
      const next = { ...roomRef.current, currentRound: { ...roomRef.current.currentRound } };
      const currentIds = (next.currentRound.wordChoices || []).map((w) => w.id);
      const rawChoices = getRandomWordChoices(3, [...(next.usedWordIds || []), ...currentIds]);
      next.currentRound.wordChoices = rawChoices.map((w) => ({
        ...w,
        definition: '',
      }));
      commitRoom(next, false);
    }
    soundManager.playPop();
  };

  const selectWord = async (selectedWord: WordItem) => {
    const ok = await sendAction('SELECT_WORD', { word: selectedWord });
    if (!ok && roomRef.current && roomRef.current.currentRound) {
      const next = { ...roomRef.current, currentRound: { ...roomRef.current.currentRound } };
      const authenticWord =
        DICTIONARY_WORDS.find(
          (w) =>
            w.id === selectedWord.id ||
            w.word.toLowerCase() === String(selectedWord.word || '').toLowerCase()
        ) || selectedWord;

      if (!next.usedWordIds) next.usedWordIds = [];
      if (!next.usedWordIds.includes(authenticWord.id)) {
        next.usedWordIds.push(authenticWord.id);
      }
      startRoundWithWord(next, authenticWord);
    }
    soundManager.playPop();
  };

  const submitBluff = async (text: string) => {
    const bluffText = formatConcept(text || '');
    if (!bluffText) return;

    const ok = await sendAction('SUBMIT_BLUFF', { text: bluffText });
    if (!ok && roomRef.current && roomRef.current.currentRound?.phase === 'SUBMISSION') {
      const next = {
        ...roomRef.current,
        players: roomRef.current.players.map((p) => ({ ...p })),
        currentRound: {
          ...roomRef.current.currentRound,
          bluffs: [...roomRef.current.currentRound.bluffs],
        },
      };

      const player = next.players.find((p) => p.id === myPlayerId);
      if (!player) return;

      const isPlayerLeader = player.id === next.currentRound.leaderId;
      const leaderBluffs = isLeaderBluffing(next.settings, next.players.length);
      if (isPlayerLeader && !leaderBluffs) {
        setError('O líder não escreve nem vota nesta configuração!');
        return;
      }

      const existingIndex = next.currentRound.bluffs.findIndex((b) => b.authorId === player.id);
      const newEntry: BluffEntry = {
        id: 'bluff_' + player.id + '_' + Date.now(),
        authorId: player.id,
        text: bluffText,
        isReal: false,
      };

      if (existingIndex !== -1) {
        next.currentRound.bluffs[existingIndex] = newEntry;
      } else {
        next.currentRound.bluffs.push(newEntry);
      }

      player.hasSubmitted = true;
      checkSubmissionCompletion(next);
    }
    soundManager.playPop();
  };

  const submitVote = async (optionId: string) => {
    const ok = await sendAction('SUBMIT_VOTE', { optionId });
    if (!ok && roomRef.current && roomRef.current.currentRound?.phase === 'VOTING') {
      const next = {
        ...roomRef.current,
        players: roomRef.current.players.map((p) => ({ ...p })),
        currentRound: {
          ...roomRef.current.currentRound,
          votes: { ...roomRef.current.currentRound.votes },
        },
      };

      const player = next.players.find((p) => p.id === myPlayerId);
      if (!player) return;

      const isPlayerLeader = player.id === next.currentRound.leaderId;
      const leaderBluffs = isLeaderBluffing(next.settings, next.players.length);
      const leaderHasBluff = next.currentRound.bluffs.some((b) => b.authorId === player.id);

      if (isPlayerLeader && !leaderBluffs && !leaderHasBluff) {
        return;
      }

      const chosenOption = next.currentRound.bluffs.find((b) => b.id === optionId);
      if (chosenOption && chosenOption.authorId === player.id) {
        setError('Você não pode votar no seu próprio blefe!');
        return;
      }

      next.currentRound.votes[player.id] = optionId;
      player.hasVoted = true;
      checkVotingCompletion(next);
    }
    soundManager.playVote();
  };

  const revealResults = async () => {
    const ok = await sendAction('REVEAL_RESULTS');
    if (!ok && roomRef.current && roomRef.current.currentRound) {
      handleStartRevealPhase({ ...roomRef.current });
    }
  };

  const requestNextRound = async () => {
    const ok = await sendAction('REQUEST_NEXT_ROUND');
    if (!ok && roomRef.current && roomRef.current.currentRound) {
      const next = {
        ...roomRef.current,
        currentRound: {
          ...roomRef.current.currentRound,
          nextRoundConfirmations: [
            ...(roomRef.current.currentRound.nextRoundConfirmations || []),
          ],
        },
      };

      next.currentRound.nextRoundRequested = true;
      next.currentRound.nextRoundRequesterId = myPlayerId;
      if (!next.currentRound.nextRoundConfirmations!.includes(myPlayerId)) {
        next.currentRound.nextRoundConfirmations!.push(myPlayerId);
      }

      next.players
        .filter((p) => p.isBot)
        .forEach((b) => {
          if (!next.currentRound?.nextRoundConfirmations?.includes(b.id)) {
            next.currentRound?.nextRoundConfirmations?.push(b.id);
          }
        });

      const activePlayers = next.players.filter((p) => p.isConnected || p.isBot);
      const allConfirmed =
        activePlayers.length > 0 &&
        activePlayers.every((p) => next.currentRound?.nextRoundConfirmations?.includes(p.id));

      if (allConfirmed) {
        prepareNextRound(next);
      } else {
        commitRoom(next, false);
      }
    }
    soundManager.playPop();
  };

  const nextRound = () => {
    requestNextRound();
  };

  const confirmNextRound = async () => {
    const ok = await sendAction('CONFIRM_NEXT_ROUND');
    if (!ok && roomRef.current && roomRef.current.currentRound) {
      const next = {
        ...roomRef.current,
        currentRound: {
          ...roomRef.current.currentRound,
          nextRoundConfirmations: [
            ...(roomRef.current.currentRound.nextRoundConfirmations || []),
          ],
        },
      };

      if (!next.currentRound.nextRoundConfirmations!.includes(myPlayerId)) {
        next.currentRound.nextRoundConfirmations!.push(myPlayerId);
      }

      next.players
        .filter((p) => p.isBot)
        .forEach((b) => {
          if (!next.currentRound?.nextRoundConfirmations?.includes(b.id)) {
            next.currentRound?.nextRoundConfirmations?.push(b.id);
          }
        });

      const activePlayers = next.players.filter((p) => p.isConnected || p.isBot);
      const allConfirmed =
        activePlayers.length > 0 &&
        activePlayers.every((p) => next.currentRound?.nextRoundConfirmations?.includes(p.id));

      if (allConfirmed) {
        prepareNextRound(next);
      } else {
        commitRoom(next, false);
      }
    }
    soundManager.playPop();
  };

  const forceNextRound = () => {};
  const addCustomWord = () => {};
  const importDictionary = () => {};
  const setExclusiveCustomWords = () => {};
  const resetDictionary = () => {};
  const adjustPlayerScore = () => {};
  const setPlayerScore = () => {};
  const adjustRoundPoints = () => {};
  const setRoundPoints = () => {};

  const restartGame = async () => {
    const ok = await sendAction('RESTART_GAME');
    if (!ok && roomRef.current) {
      clearTimers();
      const next: RoomState = {
        ...roomRef.current,
        currentRound: null,
        winnerId: undefined,
        isTieBreakActive: false,
        players: roomRef.current.players.map((p) => ({
          ...p,
          score: 0,
          hasSubmitted: false,
          hasVoted: false,
        })),
      };
      commitRoom(next, false);
    }
    soundManager.playPop();
  };

  const leaveRoom = async () => {
    clearTimers();
    if (roomRef.current) {
      const code = roomRef.current.roomCode;
      const me = roomRef.current.players.find((p) => p.id === myPlayerId);
      if (me) {
        const info: SavedReconnectInfo = {
          roomCode: code,
          playerName: me.name,
          avatar: me.avatar,
          color: me.color,
          score: me.score,
          timestamp: Date.now(),
        };
        persistReconnectInfo(info);
        setSavedReconnectInfo(info);
      }
      sendWs('LEAVE_ROOM');
      await apiCall(`/api/rooms/${code}/leave`, 'POST', { playerId: myPlayerId });
    }

    localStorage.removeItem(STORAGE_KEYS.LAST_ROOM);

    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    roomRef.current = null;
    setRoom(null);
  };

  const myPlayer = room?.players.find((p) => p.id === myPlayerId);
  const isHost = Boolean(room && room.hostId === myPlayerId);
  const isLeader = Boolean(room?.currentRound && room.currentRound.leaderId === myPlayerId);

  return (
    <GameContext.Provider
      value={{
        room,
        myPlayerId,
        myPlayer,
        isHost,
        isLeader,
        connectionStatus,
        error,
        isMuted,
        setIsMuted,
        clearError,
        savedReconnectInfo,
        rejoinSavedRoom,
        clearSavedReconnectInfo,
        createRoom,
        joinRoom,
        updateSettings,
        addBot,
        removeBot,
        kickPlayer,
        startGame,
        rerollWordChoices,
        selectWord,
        submitBluff,
        submitVote,
        revealResults,
        nextRound,
        requestNextRound,
        confirmNextRound,
        forceNextRound,
        addCustomWord,
        importDictionary,
        setExclusiveCustomWords,
        resetDictionary,
        adjustPlayerScore,
        setPlayerScore,
        adjustRoundPoints,
        setRoundPoints,
        restartGame,
        leaveRoom,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
};
