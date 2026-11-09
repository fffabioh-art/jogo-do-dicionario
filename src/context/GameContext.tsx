import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  RoomState,
  Player,
  WordItem,
  GameSettings,
} from '../types/game';
import {
  isFirebaseConfigured,
  ensureAnonymousAuth,
  subscribeToConnectionState,
} from '../services/firebase';
import {
  createRoomInDb,
  joinRoomInDb,
  leaveRoomInDb,
  setupPlayerOnDisconnect,
  updateSettingsInDb,
  addBotInDb,
  removeBotInDb,
  kickPlayerInDb,
  startGameInDb,
  rerollWordsInDb,
  selectWordInDb,
  submitBluffInDb,
  submitVoteInDb,
  revealResultsInDb,
  confirmNextRoundInDb,
  restartGameInDb,
  subscribeToRoom,
  setPlayerConnectedInDb,
} from '../services/gameRoomService';
import { soundManager } from '../utils/soundEffects';
import { getDecoyBluff } from '../data/dictionary';
import { formatConcept, isLeaderBluffing } from '../utils/textFormatting';

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
  isFirebaseReady: boolean;

  // Actions
  createRoom: (
    name: string,
    avatar: string,
    color: string,
    settings?: Partial<GameSettings>,
    customWords?: WordItem[],
    exclusiveCustomWords?: boolean
  ) => Promise<void>;
  joinRoom: (roomCode: string, name: string, avatar: string, color: string) => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  addBot: () => Promise<void>;
  removeBot: () => Promise<void>;
  kickPlayer: (playerId: string) => Promise<void>;
  startGame: () => Promise<void>;
  rerollWordChoices: () => Promise<void>;
  selectWord: (word: WordItem) => Promise<void>;
  submitBluff: (text: string) => Promise<void>;
  submitVote: (optionId: string) => Promise<void>;
  revealResults: () => Promise<void>;
  nextRound: () => Promise<void>;
  requestNextRound: () => Promise<void>;
  confirmNextRound: () => Promise<void>;
  forceNextRound: () => Promise<void>;
  addCustomWord: (word: Partial<WordItem>) => void;
  importDictionary: (words: WordItem[], replaceAll?: boolean, exclusiveCustomWords?: boolean) => void;
  setExclusiveCustomWords: (exclusive: boolean) => void;
  resetDictionary: () => void;
  adjustPlayerScore: (playerId: string, delta: number) => void;
  setPlayerScore: (playerId: string, score: number) => void;
  adjustRoundPoints: (playerId: string, delta: number) => void;
  setRoundPoints: (playerId: string, roundPoints: number) => void;
  restartGame: () => Promise<void>;
  leaveRoom: () => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

const STORAGE_KEYS = {
  PLAYER_ID: 'jdd_player_id',
  PLAYER_NAME: 'jdd_player_name',
  PLAYER_AVATAR: 'jdd_player_avatar',
  PLAYER_COLOR: 'jdd_player_color',
  LAST_ROOM: 'jdd_last_room',
  RECONNECT_INFO: 'jdd_reconnect_info_v1',
};

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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
    } catch {
      return null;
    }
  });

  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_ID) || '';
  });

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMutedState] = useState<boolean>(() => soundManager.getMuted());
  const [savedReconnectInfo, setSavedReconnectInfo] = useState<SavedReconnectInfo | null>(() =>
    loadSavedReconnectInfo()
  );

  const roomRef = useRef<RoomState | null>(null);
  roomRef.current = room;

  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirebaseReady = isFirebaseConfigured();

  const clearBotTimer = useCallback(() => {
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

  // 1. Inicializa Autenticação Anônima do Firebase
  useEffect(() => {
    let isMounted = true;

    if (!isFirebaseReady) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    ensureAnonymousAuth()
      .then((user) => {
        if (!isMounted) return;
        if (user && user.uid) {
          setMyPlayerId(user.uid);
          localStorage.setItem(STORAGE_KEYS.PLAYER_ID, user.uid);
        } else {
          setError('Não foi possível autenticar anonimamente com o Firebase.');
        }
      })
      .catch((err) => {
        console.error('Erro na autenticação anônima:', err);
        if (isMounted) {
          setError('Falha de conexão com a autenticação do Firebase.');
        }
      });

    const unsubConnection = subscribeToConnectionState((connected) => {
      if (!isMounted) return;
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    });

    return () => {
      isMounted = false;
      unsubConnection();
    };
  }, [isFirebaseReady]);

  // 2. Escuta mudanças na sala ativa em Tempo Real via Firebase (onValue)
  useEffect(() => {
    if (!activeRoomCode || !isFirebaseReady) return;

    let isMounted = true;

    const unsubscribe = subscribeToRoom(
      activeRoomCode,
      myPlayerId,
      (updatedRoom) => {
        if (!isMounted) return;

        if (!updatedRoom) {
          // Sala não existe mais ou foi encerrada
          roomRef.current = null;
          setRoom(null);
          setActiveRoomCode(null);
          localStorage.removeItem(STORAGE_KEYS.LAST_ROOM);
          return;
        }

        const prevPhase = roomRef.current?.currentRound?.phase;
        const nextPhase = updatedRoom.currentRound?.phase;

        // Efeitos sonoros na troca de fases
        if (prevPhase !== nextPhase) {
          if (nextPhase === 'VOTING') {
            soundManager.playPop();
          } else if (nextPhase === 'REVEAL') {
            soundManager.playCorrect();
          } else if (nextPhase === 'GAME_OVER') {
            soundManager.playFanfare();
          }
        }

        roomRef.current = updatedRoom;
        setRoom(updatedRoom);
        localStorage.setItem(STORAGE_KEYS.LAST_ROOM, updatedRoom.roomCode);

        // Atualiza informações de reconexão
        const me = updatedRoom.players.find((p) => p.id === myPlayerId);
        if (me) {
          if (!me.isConnected) {
            setPlayerConnectedInDb(updatedRoom.roomCode, myPlayerId, true);
          }
          const info: SavedReconnectInfo = {
            roomCode: updatedRoom.roomCode,
            playerName: me.name,
            avatar: me.avatar,
            color: me.color,
            score: me.score,
            timestamp: Date.now(),
          };
          persistReconnectInfo(info);
          setSavedReconnectInfo(info);
        }
      },
      (err) => {
        if (!isMounted) return;
        setError(`Erro de sincronização: ${err.message}`);
      }
    );

    // Registra desconexão automática no Firebase
    setupPlayerOnDisconnect(activeRoomCode, myPlayerId);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeRoomCode, myPlayerId, isFirebaseReady]);

  // 3. Automação de Bots (Gerenciada pelo Host da sala para sincronização consistente)
  useEffect(() => {
    if (!room || room.hostId !== myPlayerId) return;

    const round = room.currentRound;
    if (!round) return;

    clearBotTimer();

    // Fase: WORD_CHOICE - Se o líder for Bot, escolhe automaticamente
    if (round.phase === 'WORD_CHOICE') {
      const leader = room.players.find((p) => p.id === round.leaderId);
      if (leader?.isBot && round.wordChoices && round.wordChoices.length > 0) {
        botTimerRef.current = setTimeout(async () => {
          if (roomRef.current?.currentRound?.phase === 'WORD_CHOICE') {
            const picked = round.wordChoices![0];
            await selectWordInDb(room.roomCode, leader.id, picked);
          }
        }, 1500);
      }
    }

    // Fase: SUBMISSION - Bots submetem seus blefes automaticamente
    if (round.phase === 'SUBMISSION') {
      const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
      const pendingBots = room.players.filter((p) => {
        if (!p.isBot || p.hasSubmitted) return false;
        if (p.id === round.leaderId && !leaderBluffs) return false;
        return true;
      });

      if (pendingBots.length > 0) {
        botTimerRef.current = setTimeout(async () => {
          if (roomRef.current?.currentRound?.phase === 'SUBMISSION') {
            for (let i = 0; i < pendingBots.length; i++) {
              const bot = pendingBots[i];
              const authenticWord = {
                id: round.word?.id || 'word',
                word: round.word?.word || '',
                partOfSpeech: round.word?.partOfSpeech || 'substantivo',
                definition: '',
              };
              const bluffCandidate = formatConcept(getDecoyBluff(authenticWord as any, i));
              await submitBluffInDb(room.roomCode, bot.id, bluffCandidate);
            }
          }
        }, 1200);
      }
    }

    // Fase: VOTING - Bots votam nas opções disponíveis
    if (round.phase === 'VOTING') {
      const leaderBluffs = isLeaderBluffing(room.settings, room.players.length);
      const pendingVotingBots = room.players.filter((p) => {
        if (!p.isBot || p.hasVoted) return false;
        if (p.id === round.leaderId && !leaderBluffs) return false;
        return true;
      });

      if (pendingVotingBots.length > 0 && round.bluffs && round.bluffs.length > 0) {
        botTimerRef.current = setTimeout(async () => {
          if (roomRef.current?.currentRound?.phase === 'VOTING') {
            for (const bot of pendingVotingBots) {
              const eligibleOptions = round.bluffs.filter((b) => b.authorId !== bot.id);
              if (eligibleOptions.length > 0) {
                const picked = eligibleOptions[Math.floor(Math.random() * eligibleOptions.length)];
                await submitVoteInDb(room.roomCode, bot.id, picked.id);
              }
            }
          }
        }, 1400);
      }
    }
  }, [room, myPlayerId, clearBotTimer]);

  // --- Ações de Jogo usando Firebase Realtime Database ---

  const createRoom = async (
    name: string,
    avatar: string,
    color: string,
    settings?: Partial<GameSettings>
  ) => {
    if (!isFirebaseReady) {
      setError(
        'Configuração do Firebase ausente! Adicione as variáveis VITE_FIREBASE_* na Vercel para jogar multiplayer.'
      );
      return;
    }

    // Garante que a autenticação anônima esteja concluída antes de criar a sala
    const user = await ensureAnonymousAuth();
    if (!user || !user.uid) {
      setError('Falha ao autenticar com o Firebase. Verifique sua conexão com a internet.');
      return;
    }
    const effectiveUid = user.uid;
    setMyPlayerId(effectiveUid);
    localStorage.setItem(STORAGE_KEYS.PLAYER_ID, effectiveUid);

    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, avatar);
    localStorage.setItem(STORAGE_KEYS.PLAYER_COLOR, color);

    const hostPlayer: Player = {
      id: effectiveUid,
      name: name || 'Jogador 1',
      avatar: avatar || 'palito_classico',
      color: color || '#F59E0B',
      score: 0,
      isHost: true,
      isConnected: true,
    };

    const res = await createRoomInDb(hostPlayer, settings);

    if (res.success && res.roomCode) {
      localStorage.setItem(STORAGE_KEYS.LAST_ROOM, res.roomCode);
      setActiveRoomCode(res.roomCode);
      // Redireciona o anfitrião imediatamente ao Lobby
      setRoom({
        roomCode: res.roomCode,
        hostId: effectiveUid,
        settings: {
          targetScore: Number(settings?.targetScore ?? 20),
          submissionTimeLimit: Number(settings?.submissionTimeLimit ?? 0),
          votingTimeLimit: Number(settings?.votingTimeLimit ?? 0),
          leaderBluffsRule: settings?.leaderBluffsRule === 'always' ? 'always' : 'never',
          readingMode: settings?.readingMode === 'leader_read' ? 'leader_read' : 'visible',
          twoPlayerDecoyCount: 2,
        },
        players: [hostPlayer],
        currentRound: null,
        roundHistory: [],
        winnerId: undefined,
        isTieBreakActive: false,
        usedWordIds: [],
      });
      soundManager.playPop();
    } else {
      setError(res.error || 'Falha ao criar sala no Firebase.');
    }
  };

  const joinRoom = async (roomCode: string, name: string, avatar: string, color: string) => {
    if (!isFirebaseReady) {
      setError(
        'Configuração do Firebase ausente! Adicione as variáveis VITE_FIREBASE_* na Vercel para jogar multiplayer.'
      );
      return;
    }

    const code = (roomCode || '').toUpperCase().trim();
    if (!code) {
      setError('Por favor, informe o código da sala.');
      return;
    }

    // Garante autenticação anônima antes de entrar
    const user = await ensureAnonymousAuth();
    if (!user || !user.uid) {
      setError('Falha ao autenticar com o Firebase. Verifique sua conexão com a internet.');
      return;
    }
    const effectiveUid = user.uid;
    setMyPlayerId(effectiveUid);
    localStorage.setItem(STORAGE_KEYS.PLAYER_ID, effectiveUid);

    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, avatar);
    localStorage.setItem(STORAGE_KEYS.PLAYER_COLOR, color);

    const res = await joinRoomInDb(code, {
      id: effectiveUid,
      name,
      avatar,
      color,
    });

    if (res.success) {
      localStorage.setItem(STORAGE_KEYS.LAST_ROOM, code);
      setActiveRoomCode(code);
      soundManager.playPop();
    } else {
      setError(res.error || 'Não foi possível entrar na sala.');
    }
  };

  const rejoinSavedRoom = async () => {
    const info = loadSavedReconnectInfo();
    if (!info) return;
    await joinRoom(info.roomCode, info.playerName, info.avatar, info.color);
  };

  const updateSettings = async (settings: Partial<GameSettings>) => {
    if (!room) return;
    await updateSettingsInDb(room.roomCode, myPlayerId, settings);
  };

  const addBot = async () => {
    if (!room) return;
    await addBotInDb(room.roomCode, myPlayerId);
    soundManager.playPop();
  };

  const removeBot = async () => {
    if (!room) return;
    await removeBotInDb(room.roomCode, myPlayerId);
    soundManager.playPop();
  };

  const kickPlayer = async (targetPlayerId: string) => {
    if (!room) return;
    await kickPlayerInDb(room.roomCode, myPlayerId, targetPlayerId);
  };

  const startGame = async () => {
    if (!room) return;
    if (room.players.length < 2) {
      setError('É necessário pelo menos 2 participantes (ou adicione um Bot) para começar!');
      return;
    }

    const res = await startGameInDb(room.roomCode, myPlayerId);
    if (!res.success) {
      setError(res.error || 'Falha ao iniciar a partida. Verifique sua conexão e tente novamente.');
    } else {
      soundManager.playPop();
    }
  };

  const rerollWordChoices = async () => {
    if (!room) return;
    await rerollWordsInDb(room.roomCode, myPlayerId);
    soundManager.playPop();
  };

  const selectWord = async (word: WordItem) => {
    if (!room) return;
    await selectWordInDb(room.roomCode, myPlayerId, word);
    soundManager.playPop();
  };

  const submitBluff = async (text: string) => {
    if (!room) return;
    const res = await submitBluffInDb(room.roomCode, myPlayerId, text);
    if (!res.success && res.error) {
      setError(res.error);
    } else {
      soundManager.playPop();
    }
  };

  const submitVote = async (optionId: string) => {
    if (!room) return;
    const res = await submitVoteInDb(room.roomCode, myPlayerId, optionId);
    if (!res.success && res.error) {
      setError(res.error);
    } else {
      soundManager.playVote();
    }
  };

  const revealResults = async () => {
    if (!room) return;
    await revealResultsInDb(room.roomCode, myPlayerId);
  };

  const requestNextRound = async () => {
    if (!room) return;
    await confirmNextRoundInDb(room.roomCode, myPlayerId);
    soundManager.playPop();
  };

  const nextRound = async () => {
    await requestNextRound();
  };

  const confirmNextRound = async () => {
    if (!room) return;
    await confirmNextRoundInDb(room.roomCode, myPlayerId);
    soundManager.playPop();
  };

  const forceNextRound = async () => {
    if (!room) return;
    await confirmNextRoundInDb(room.roomCode, myPlayerId);
  };

  const addCustomWord = () => {};
  const importDictionary = () => {};
  const setExclusiveCustomWords = () => {};
  const resetDictionary = () => {};
  const adjustPlayerScore = () => {};
  const setPlayerScore = () => {};
  const adjustRoundPoints = () => {};
  const setRoundPoints = () => {};

  const restartGame = async () => {
    if (!room) return;
    await restartGameInDb(room.roomCode, myPlayerId);
    soundManager.playPop();
  };

  const leaveRoom = async () => {
    clearBotTimer();
    if (room) {
      const code = room.roomCode;
      const me = room.players.find((p) => p.id === myPlayerId);
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
      await leaveRoomInDb(code, myPlayerId);
    }

    localStorage.removeItem(STORAGE_KEYS.LAST_ROOM);
    setActiveRoomCode(null);

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
        isFirebaseReady,
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
