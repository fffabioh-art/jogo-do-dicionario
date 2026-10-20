import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { RoomState, Player, WordItem, GameSettings } from '../types/game';
import { soundManager } from '../utils/soundEffects';

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

  // Actions
  createRoom: (name: string, avatar: string, color: string, settings?: Partial<GameSettings>) => void;
  joinRoom: (roomCode: string, name: string, avatar: string, color: string) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  addBot: () => void;
  removeBot: () => void;
  kickPlayer: (playerId: string) => void;
  startGame: () => void;
  selectWord: (word: WordItem) => void;
  submitBluff: (text: string) => void;
  submitVote: (optionId: string) => void;
  revealResults: () => void;
  nextRound: () => void;
  requestNextRound: () => void;
  confirmNextRound: () => void;
  forceNextRound: () => void;
  addCustomWord: (word: Partial<WordItem>) => void;
  importDictionary: (words: WordItem[]) => void;
  resetDictionary: () => void;
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
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_ID) || 'player_' + Date.now();
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMutedState] = useState<boolean>(() => soundManager.getMuted());

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentRoomCodeRef = useRef<string | null>(null);

  // Sync isMuted with soundManager
  const setIsMuted = (muted: boolean) => {
    soundManager.setMuted(muted);
    setIsMutedState(muted);
  };

  const clearError = () => setError(null);

  // Setup WebSocket connection
  const connectSocket = useCallback(() => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      // Attempt reconnect to previous room if any
      const lastRoom = currentRoomCodeRef.current || localStorage.getItem(STORAGE_KEYS.LAST_ROOM);
      if (lastRoom && myPlayerId) {
        ws.send(
          JSON.stringify({
            type: 'RECONNECT',
            payload: {
              roomCode: lastRoom,
              playerId: myPlayerId,
            },
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'ROOM_CREATED':
          case 'ROOM_JOINED':
            setRoom(data.room);
            if (data.playerId) {
              setMyPlayerId(data.playerId);
              localStorage.setItem(STORAGE_KEYS.PLAYER_ID, data.playerId);
            }
            if (data.room.roomCode) {
              currentRoomCodeRef.current = data.room.roomCode;
              localStorage.setItem(STORAGE_KEYS.LAST_ROOM, data.room.roomCode);
            }
            soundManager.playPop();
            break;

          case 'ROOM_UPDATE':
            setRoom((prev) => {
              // Sound effects based on phase transition
              if (prev?.currentRound?.phase !== data.room?.currentRound?.phase) {
                if (data.room?.currentRound?.phase === 'VOTING') {
                  soundManager.playPop();
                } else if (data.room?.currentRound?.phase === 'REVEAL') {
                  soundManager.playCorrect();
                } else if (data.room?.currentRound?.phase === 'GAME_OVER') {
                  soundManager.playFanfare();
                }
              }
              return data.room;
            });
            break;

          case 'ERROR':
            setError(data.message);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Error parsing incoming WS message:', e);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      socketRef.current = null;
      // Auto reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSocket();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket connection error:', err);
    };
  }, [myPlayerId]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [connectSocket]);

  const sendAction = useCallback((type: string, payload: any = {}) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      connectSocket();
      setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type, payload }));
        } else {
          setError('Conexão perdida. Tentando reconectar...');
        }
      }, 500);
      return;
    }
    socketRef.current.send(JSON.stringify({ type, payload }));
  }, [connectSocket]);

  const createRoom = (name: string, avatar: string, color: string, settings?: Partial<GameSettings>) => {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, avatar);
    localStorage.setItem(STORAGE_KEYS.PLAYER_COLOR, color);

    sendAction('CREATE_ROOM', {
      playerId: myPlayerId,
      playerName: name,
      avatar,
      color,
      ...settings,
    });
  };

  const joinRoom = (roomCode: string, name: string, avatar: string, color: string) => {
    localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, avatar);
    localStorage.setItem(STORAGE_KEYS.PLAYER_COLOR, color);
    currentRoomCodeRef.current = roomCode.toUpperCase().trim();

    sendAction('JOIN_ROOM', {
      roomCode,
      playerId: myPlayerId,
      playerName: name,
      avatar,
      color,
    });
  };

  const updateSettings = (settings: Partial<GameSettings>) => {
    sendAction('UPDATE_SETTINGS', { settings });
  };

  const addBot = () => {
    sendAction('ADD_BOT');
    soundManager.playPop();
  };

  const removeBot = () => {
    sendAction('REMOVE_BOT');
    soundManager.playPop();
  };

  const kickPlayer = (playerId: string) => {
    sendAction('KICK_PLAYER', { targetPlayerId: playerId });
  };

  const startGame = () => {
    sendAction('START_GAME');
    soundManager.playPop();
  };

  const selectWord = (word: WordItem) => {
    sendAction('SELECT_WORD', { word });
    soundManager.playPop();
  };

  const submitBluff = (text: string) => {
    sendAction('SUBMIT_BLUFF', { bluffText: text });
    soundManager.playPop();
  };

  const submitVote = (optionId: string) => {
    sendAction('SUBMIT_VOTE', { optionId });
    soundManager.playVote();
  };

  const revealResults = () => {
    sendAction('REVEAL_RESULTS');
    soundManager.playCorrect();
  };

  const nextRound = () => {
    sendAction('REQUEST_NEXT_ROUND');
    soundManager.playPop();
  };

  const requestNextRound = () => {
    sendAction('REQUEST_NEXT_ROUND');
    soundManager.playPop();
  };

  const confirmNextRound = () => {
    sendAction('CONFIRM_NEXT_ROUND');
    soundManager.playPop();
  };

  const forceNextRound = () => {
    sendAction('FORCE_NEXT_ROUND');
    soundManager.playPop();
  };

  const addCustomWord = (word: Partial<WordItem>) => {
    sendAction('ADD_CUSTOM_WORD', { word });
    soundManager.playPop();
  };

  const importDictionary = (words: WordItem[]) => {
    sendAction('IMPORT_DICTIONARY', { words });
    soundManager.playPop();
  };

  const resetDictionary = () => {
    sendAction('RESET_DICTIONARY');
    soundManager.playPop();
  };

  const restartGame = () => {
    sendAction('RESTART_GAME');
    soundManager.playPop();
  };

  const leaveRoom = () => {
    localStorage.removeItem(STORAGE_KEYS.LAST_ROOM);
    currentRoomCodeRef.current = null;
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
        createRoom,
        joinRoom,
        updateSettings,
        addBot,
        removeBot,
        kickPlayer,
        startGame,
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
        resetDictionary,
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
