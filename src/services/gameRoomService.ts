import {
  ref,
  set,
  get,
  update,
  onValue,
  runTransaction,
  onDisconnect,
} from 'firebase/database';
import { getFirebaseDb, isFirebaseConfigured } from './firebase';
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

// Prefixos exclusivos para isolar os dados deste jogo e não afetar outros apps no mesmo Firebase
export const DB_ROOMS_PREFIX = 'dicionario_by_fabulous/rooms';
export const DB_SECRETS_PREFIX = 'dicionario_by_fabulous/secrets';

export const BOT_PRESETS = [
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

/**
 * Remove recursivamente todas as propriedades com valor undefined de um objeto ou array,
 * evitando que o Firebase Realtime Database dispare erro fatal de serialização.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Converte a estrutura de sala do Realtime Database para a tipagem RoomState utilizada pelos componentes React
 */
export function formatRoomSnapshot(raw: any, playerId?: string): RoomState | null {
  if (!raw || !raw.roomCode) return null;

  const playersMap = raw.players || {};
  const playersList: Player[] = Object.values(playersMap);

  playersList.sort((a, b) => {
    if (a.isHost) return -1;
    if (b.isHost) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const room: RoomState = {
    roomCode: raw.roomCode,
    hostId: raw.hostId,
    settings: {
      targetScore: Number(raw.settings?.targetScore ?? 20),
      submissionTimeLimit: Number(raw.settings?.submissionTimeLimit ?? 0),
      votingTimeLimit: Number(raw.settings?.votingTimeLimit ?? 0),
      leaderBluffsRule: raw.settings?.leaderBluffsRule === 'always' ? 'always' : 'never',
      readingMode: raw.settings?.readingMode === 'leader_read' ? 'leader_read' : 'visible',
      twoPlayerDecoyCount: Number(raw.settings?.twoPlayerDecoyCount ?? 2),
    },
    players: playersList,
    currentRound: raw.currentRound || null,
    roundHistory: Array.isArray(raw.roundHistory) ? raw.roundHistory : Object.values(raw.roundHistory || {}),
    winnerId: raw.winnerId || undefined,
    isTieBreakActive: Boolean(raw.isTieBreakActive),
    usedWordIds: Array.isArray(raw.usedWordIds) ? raw.usedWordIds : Object.values(raw.usedWordIds || {}),
  };

  if (room.currentRound) {
    const isRevealOrOver = room.currentRound.phase === 'REVEAL' || room.currentRound.phase === 'GAME_OVER';

    if (!isRevealOrOver) {
      if (room.currentRound.phase === 'VOTING') {
        if (room.currentRound.bluffs) {
          room.currentRound.bluffs = room.currentRound.bluffs.map((b) => ({
            ...b,
            isReal: false,
            authorId: b.authorId === playerId ? playerId : 'MASKED',
          }));
        }
      }
    }
  }

  return room;
}

export function generateRandomRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

/**
 * Criação Atômica de Sala no Firebase Realtime Database
 */
export async function createRoomInDb(
  hostPlayer: Player,
  settings?: Partial<GameSettings>
): Promise<{ success: boolean; roomCode?: string; error?: string }> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase não configurado. Adicione as variáveis de ambiente VITE_FIREBASE_* na Vercel.',
    };
  }

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Banco de dados Realtime Database indisponível.' };

  let attempts = 0;
  let code = generateRandomRoomCode();

  while (attempts < 5) {
    const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${code}`);
    const snap = await get(roomRef);

    if (!snap.exists()) {
      break;
    }
    code = generateRandomRoomCode();
    attempts++;
  }

  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${code}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${code}`);

  const initialSettings: GameSettings = {
    targetScore: settings?.targetScore !== undefined ? Number(settings.targetScore) : 20,
    submissionTimeLimit: settings?.submissionTimeLimit !== undefined ? Number(settings.submissionTimeLimit) : 0,
    votingTimeLimit: settings?.votingTimeLimit !== undefined ? Number(settings.votingTimeLimit) : 0,
    leaderBluffsRule: settings?.leaderBluffsRule === 'always' ? 'always' : 'never',
    readingMode: settings?.readingMode === 'leader_read' ? 'leader_read' : 'visible',
    twoPlayerDecoyCount: 2,
  };

  const initialRoomData = {
    roomCode: code,
    hostId: hostPlayer.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: initialSettings,
    players: {
      [hostPlayer.id]: {
        id: hostPlayer.id,
        name: hostPlayer.name || 'Jogador 1',
        avatar: hostPlayer.avatar || 'palito_classico',
        color: hostPlayer.color || '#F59E0B',
        score: 0,
        isHost: true,
        isConnected: true,
      },
    },
    currentRound: null,
    roundHistory: [],
    winnerId: null,
    isTieBreakActive: false,
    usedWordIds: [],
  };

  try {
    await set(roomRef, initialRoomData);
    await set(secretsRef, {
      realDefinition: '',
      realOptionId: '',
      authorMap: {},
    });
    return { success: true, roomCode: code };
  } catch (err: any) {
    console.error('Erro ao criar sala no Realtime Database:', err);
    return { success: false, error: err?.message || 'Erro ao criar sala no Firebase.' };
  }
}

/**
 * Entrada Atômica em Sala com runTransaction
 * Validação rigorosa: Reconexão autorizada SOMENTE se player.id (auth.uid) coincidir.
 * Impede que outro usuário assuma a identidade de um jogador ou anfitrião existente apenas pelo nome.
 */
export async function joinRoomInDb(
  roomCode: string,
  player: { id: string; name: string; avatar: string; color: string }
): Promise<{ success: boolean; error?: string }> {
  if (!isFirebaseConfigured()) {
    return {
      success: false,
      error: 'Firebase não configurado. Defina as variáveis de ambiente na Vercel.',
    };
  }

  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Banco de dados Realtime Database indisponível.' };

  const cleanCode = (roomCode || '').toUpperCase().trim();
  if (!cleanCode) return { success: false, error: 'Código de sala inválido.' };

  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);

  try {
    let customError: string | undefined;

    const txnResult = await runTransaction(roomRef, (currentRoom) => {
      if (!currentRoom) {
        return currentRoom;
      }

      if (!currentRoom.players) {
        currentRoom.players = {};
      }

      const playersObj: Record<string, Player> = currentRoom.players;
      const playersList: Player[] = Object.values(playersObj);
      const normTarget = normalizePlayerName(player.name);

      // Reconexão legítima: baseada no player.id autenticado (auth.uid) OU mesmo nome se desconectado
      const existingPlayer = playersObj[player.id];

      if (existingPlayer) {
        existingPlayer.isConnected = true;
        existingPlayer.name = player.name || existingPlayer.name;
        if (player.avatar) existingPlayer.avatar = player.avatar;
        if (player.color) existingPlayer.color = player.color;
      } else {
        // Se um jogador caiu (queda de conexão / fechamento acidental de aba) e retornou com novo UID
        const disconnectedMatch = playersList.find(
          (p) => !p.isConnected && !p.isBot && normalizePlayerName(p.name) === normTarget
        );

        if (disconnectedMatch) {
          // Reassume o jogador preservando a pontuação acumulada!
          const previousScore = disconnectedMatch.score || 0;
          const wasHost = Boolean(disconnectedMatch.isHost);
          delete playersObj[disconnectedMatch.id];

          playersObj[player.id] = {
            id: player.id,
            name: player.name || disconnectedMatch.name,
            avatar: player.avatar || disconnectedMatch.avatar,
            color: player.color || disconnectedMatch.color,
            score: previousScore,
            isHost: wasHost,
            isConnected: true,
          };

          if (wasHost) {
            currentRoom.hostId = player.id;
          }
        } else {
          // Novo participante: impede que utilize o mesmo nome de outro jogador já conectado
          const nameCollision = playersList.some(
            (p) => p.isConnected && normalizePlayerName(p.name) === normTarget
          );

          if (nameCollision) {
            customError = 'Já existe um participante ativo com este nome na sala. Por favor, escolha outro nome.';
            return currentRoom;
          }

          if (playersList.length >= 10) {
            customError = 'A sala atingiu o limite máximo de 10 participantes!';
            return currentRoom;
          }

          playersObj[player.id] = {
            id: player.id,
            name: player.name || `Jogador ${playersList.length + 1}`,
            avatar: player.avatar || 'palito_classico',
            color: player.color || '#EC4899',
            score: 0,
            isHost: false,
            isConnected: true,
          };
        }
      }

      currentRoom.updatedAt = Date.now();
      return currentRoom;
    });

    if (customError) {
      return { success: false, error: customError };
    }

    if (!txnResult.committed || !txnResult.snapshot.exists()) {
      return { success: false, error: 'Sala não encontrada! Verifique o código digitado.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao entrar na sala:', err);
    return { success: false, error: err?.message || 'Falha ao conectar à sala.' };
  }
}

export async function leaveRoomInDb(roomCode: string, playerId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const playerRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}/players/${playerId}/isConnected`);
  try {
    await set(playerRef, false);
  } catch (err) {
    console.warn('Erro ao atualizar saída do jogador:', err);
  }
}

export async function setPlayerConnectedInDb(roomCode: string, playerId: string, isConnected = true): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const playerRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}/players/${playerId}/isConnected`);
  try {
    await set(playerRef, isConnected);
  } catch (err) {
    console.warn('Erro ao atualizar status de conexão do jogador:', err);
  }
}

export function setupPlayerOnDisconnect(roomCode: string, playerId: string): void {
  const db = getFirebaseDb();
  if (!db) return;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const playerRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}/players/${playerId}/isConnected`);

  try {
    onDisconnect(playerRef).set(false);
  } catch (err) {
    console.warn('Falha ao registrar onDisconnect:', err);
  }
}

export async function updateSettingsInDb(
  roomCode: string,
  hostId: string,
  newSettings: Partial<GameSettings>
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);

  try {
    await runTransaction(roomRef, (room) => {
      if (!room || room.hostId !== hostId) return room;
      room.settings = { ...room.settings, ...newSettings };
      room.updatedAt = Date.now();
      return room;
    });
    return true;
  } catch {
    return false;
  }
}

export async function addBotInDb(roomCode: string, hostId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);

  try {
    await runTransaction(roomRef, (room) => {
      if (!room || room.hostId !== hostId) return room;
      if (!room.players) room.players = {};

      const currentList: Player[] = Object.values(room.players);
      if (currentList.length >= 10) return room;

      const currentBots = currentList.filter((p) => p.isBot).length;
      const preset = BOT_PRESETS[currentBots % BOT_PRESETS.length];
      const botId = 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);

      room.players[botId] = {
        id: botId,
        name: preset.name,
        avatar: preset.avatar,
        color: preset.color,
        score: 0,
        isHost: false,
        isBot: true,
        isConnected: true,
      };

      room.updatedAt = Date.now();
      return room;
    });
    return true;
  } catch {
    return false;
  }
}

export async function removeBotInDb(roomCode: string, hostId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);

  try {
    await runTransaction(roomRef, (room) => {
      if (!room || room.hostId !== hostId) return room;
      if (!room.players) return room;

      const botKeys = Object.keys(room.players).filter((k) => room.players[k]?.isBot);
      if (botKeys.length > 0) {
        const lastBotKey = botKeys[botKeys.length - 1];
        delete room.players[lastBotKey];
      }

      room.updatedAt = Date.now();
      return room;
    });
    return true;
  } catch {
    return false;
  }
}

export async function kickPlayerInDb(roomCode: string, hostId: string, targetId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);

  try {
    await runTransaction(roomRef, (room) => {
      if (!room || room.hostId !== hostId) return room;
      if (targetId === hostId) return room;
      if (room.players && room.players[targetId]) {
        delete room.players[targetId];
      }
      room.updatedAt = Date.now();
      return room;
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Iniciar a Partida (Apenas Host)
 * As escolhas completas com definições são salvas no nó seguro 'secrets',
 * enquanto no nó público da sala as definições são transmitidas vazias.
 */
export async function startGameInDb(roomCode: string, hostId: string): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Database indisponível.' };

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    let errorMsg: string | undefined;
    const rawWordChoices = getRandomWordChoices(3, []);

    // 1. Garante que todos os objetos de palavras estejam 100% livres de propriedades undefined
    const wordChoices = rawWordChoices.map((w) =>
      stripUndefined({
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech || 'substantivo',
        definition: w.definition || '',
        ...(w.falsas && w.falsas.length > 0 ? { falsas: w.falsas } : {}),
        ...(w.difficulty ? { difficulty: w.difficulty } : {}),
      })
    );

    // Salva definições reais no nó protegido de segredos
    await set(
      secretsRef,
      stripUndefined({
        wordChoices,
        realDefinition: '',
        realOptionId: '',
        authorMap: {},
      })
    );

    // 2. Inicia a sala com escolhas sem expor as definições
    const txn = await runTransaction(roomRef, (room) => {
      if (!room) return room;
      if (room.hostId !== hostId) {
        errorMsg = 'Apenas o anfitrião pode iniciar a partida.';
        return room;
      }

      const playersList: Player[] = Object.values(room.players || {});
      if (playersList.length < 2) {
        errorMsg = 'É necessário pelo menos 2 participantes (ou adicione um Bot) para começar!';
        return room;
      }

      Object.keys(room.players).forEach((id) => {
        room.players[id].score = 0;
        room.players[id].hasSubmitted = false;
        room.players[id].hasVoted = false;
        room.players[id].totalVotesReceived = 0;
        room.players[id].receivedVotesHistory = [];
      });

      room.roundHistory = [];
      room.winnerId = null;
      room.isTieBreakActive = false;
      room.usedWordIds = [];

      const leader = playersList.find((p) => p.isHost) || playersList[0];

      const publicChoices = wordChoices.map((w) => ({
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        definition: '',
      }));

      room.currentRound = stripUndefined({
        roundNumber: 1,
        leaderId: leader.id,
        word: {
          id: wordChoices[0].id,
          word: wordChoices[0].word,
          partOfSpeech: wordChoices[0].partOfSpeech,
          definition: '',
        },
        phase: 'WORD_CHOICE',
        wordChoices: publicChoices,
        bluffs: [],
        votes: {},
      });

      room.updatedAt = Date.now();
      return stripUndefined(room);
    });

    if (errorMsg) return { success: false, error: errorMsg };
    return { success: txn.committed };
  } catch (err: any) {
    console.error('Erro ao iniciar partida:', err);
    return { success: false, error: err?.message || 'Falha ao iniciar partida.' };
  }
}

export async function rerollWordsInDb(roomCode: string, requesterId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    const snap = await get(roomRef);
    if (!snap.exists()) return false;
    const room = snap.val();

    if (!room.currentRound || room.currentRound.phase !== 'WORD_CHOICE') return false;
    if (room.currentRound.leaderId !== requesterId && room.hostId !== requesterId) return false;

    const currentIds = (room.currentRound.wordChoices || []).map((w: WordItem) => w.id);
    const used = Array.isArray(room.usedWordIds) ? room.usedWordIds : [];
    const rawChoices = getRandomWordChoices(3, [...used, ...currentIds]);
    const newChoices = rawChoices.map((w) =>
      stripUndefined({
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech || 'substantivo',
        definition: w.definition || '',
        ...(w.falsas && w.falsas.length > 0 ? { falsas: w.falsas } : {}),
        ...(w.difficulty ? { difficulty: w.difficulty } : {}),
      })
    );

    await update(secretsRef, stripUndefined({ wordChoices: newChoices }));

    await runTransaction(roomRef, (r) => {
      if (!r || !r.currentRound) return r;
      r.currentRound.wordChoices = newChoices.map((w) => ({
        id: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        definition: '',
      }));
      r.updatedAt = Date.now();
      return stripUndefined(r);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Selecionar Palavra da Rodada (Líder da Rodada)
 * A definição real é gravada exclusivamente em 'secrets/$roomCode/realDefinition'.
 * O nó público da sala recebe apenas word, partOfSpeech e definition vazia.
 */
export async function selectWordInDb(roomCode: string, leaderId: string, selectedWord: WordItem): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    const authenticWord =
      DICTIONARY_WORDS.find(
        (w) =>
          w.id === selectedWord.id ||
          w.word.toLowerCase() === String(selectedWord.word || '').toLowerCase()
      ) || selectedWord;

    const realDefinitionFormatted = formatConcept(authenticWord.definition);

    // Salva a definição real isolada no nó seguro
    await update(secretsRef, {
      realDefinition: realDefinitionFormatted,
      realOptionId: '',
      authorMap: {},
    });

    await runTransaction(roomRef, (room) => {
      if (!room || !room.currentRound || room.currentRound.phase !== 'WORD_CHOICE') return room;
      if (room.currentRound.leaderId !== leaderId && room.hostId !== leaderId) return room;

      if (!room.usedWordIds) room.usedWordIds = [];
      if (!room.usedWordIds.includes(authenticWord.id)) {
        room.usedWordIds.push(authenticWord.id);
      }

      const timeLimit = Number(room.settings?.submissionTimeLimit ?? 0);

      room.currentRound.word = {
        id: authenticWord.id,
        word: authenticWord.word,
        partOfSpeech: authenticWord.partOfSpeech,
        definition: '', // 100% Protegido contra cheaters na rede
      };
      room.currentRound.phase = 'SUBMISSION';
      room.currentRound.bluffs = [];
      room.currentRound.votes = {};
      room.currentRound.startTime = Date.now();
      if (timeLimit > 0) {
        room.currentRound.deadline = Date.now() + timeLimit * 1000;
      } else {
        delete room.currentRound.deadline;
      }

      Object.keys(room.players || {}).forEach((id) => {
        room.players[id].hasSubmitted = false;
        room.players[id].hasVoted = false;
      });

      room.updatedAt = Date.now();
      return stripUndefined(room);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Enviar Blefe (Jogador)
 * Quando todos os participantes elegíveis enviam, a transição para VOTING é realizada.
 * O mapeamento dos autores e o ID da opção real são gravados em 'secrets/$roomCode'.
 */
export async function submitBluffInDb(
  roomCode: string,
  playerId: string,
  bluffTextRaw: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Database indisponível.' };

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const bluffText = formatConcept(bluffTextRaw || '');
  if (!bluffText) return { success: false, error: 'Texto do blefe não pode ser vazio.' };

  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    let errorMsg: string | undefined;
    let shouldTransitionToVoting = false;
    let transitionSnapshot: any = null;

    const txn = await runTransaction(roomRef, (room) => {
      if (!room || !room.currentRound || room.currentRound.phase !== 'SUBMISSION') return room;

      const player = room.players?.[playerId];
      if (!player) return room;

      const isLeader = player.id === room.currentRound.leaderId;
      const leaderBluffs = isLeaderBluffing(room.settings, Object.keys(room.players).length);
      if (isLeader && !leaderBluffs) {
        errorMsg = 'O líder não escreve nem vota nesta configuração!';
        return room;
      }

      if (!room.currentRound.bluffs) room.currentRound.bluffs = [];

      const existingIndex = room.currentRound.bluffs.findIndex((b: BluffEntry) => b.authorId === player.id);
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

      const playersList: Player[] = Object.values(room.players);
      const eligibleSubmitters = playersList.filter((p) => {
        if (!p.isConnected && !p.isBot) return false;
        if (p.id === room.currentRound.leaderId && !leaderBluffs) return false;
        return true;
      });

      const allSubmitted = eligibleSubmitters.every((p) => p.hasSubmitted);

      if (allSubmitted) {
        shouldTransitionToVoting = true;
        transitionSnapshot = JSON.parse(JSON.stringify(room));
      }

      room.updatedAt = Date.now();
      return room;
    });

    if (errorMsg) return { success: false, error: errorMsg };

    // Se todos submeteram, orquestra transição para votação
    if (shouldTransitionToVoting && transitionSnapshot) {
      await executeVotingTransition(cleanCode, transitionSnapshot);
    }

    return { success: txn.committed };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Transição para Fase de Votação
 * O segredo (realOptionId e authorMap) fica no nó seguro 'secrets'.
 * O nó público da sala recebe apenas opções com isReal=false e sem expor autores.
 */
async function executeVotingTransition(roomCode: string, room: any) {
  const db = getFirebaseDb();
  if (!db) return;

  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${roomCode}`);
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${roomCode}`);

  const secretsSnap = await get(secretsRef);
  const secretData = secretsSnap.exists() ? secretsSnap.val() : {};

  const realDefinition = secretData.realDefinition || 'Definição oficial do dicionário.';
  const realOptionId = 'entry_real_' + Date.now();

  const realBluff: BluffEntry = {
    id: realOptionId,
    authorId: 'REAL',
    text: realDefinition,
    isReal: true,
  };

  const existingBluffs: BluffEntry[] = [...(room.currentRound.bluffs || [])];
  const usedTexts = new Set<string>([
    realDefinition,
    ...existingBluffs.map((b) => formatConcept(b.text)),
  ]);

  const authenticWord = DICTIONARY_WORDS.find((w) => w.id === room.currentRound.word?.id) || {
    id: 'unknown',
    word: room.currentRound.word?.word || '',
    partOfSpeech: room.currentRound.word?.partOfSpeech || '',
    definition: realDefinition,
  };

  let decoyIdx = 0;
  while (existingBluffs.length < 3 && decoyIdx < 6) {
    const candidate = formatConcept(getDecoyBluff(authenticWord, decoyIdx));
    if (candidate && !usedTexts.has(candidate)) {
      usedTexts.add(candidate);
      existingBluffs.push({
        id: `decoy_${room.currentRound.roundNumber}_${decoyIdx}_${Date.now()}`,
        authorId: 'DECOY',
        text: candidate,
        isReal: false,
      });
    }
    decoyIdx++;
  }

  const finalBluffs = fisherYatesShuffle([...existingBluffs, realBluff]);
  const authorMap: Record<string, string> = {};

  finalBluffs.forEach((b, idx) => {
    b.letterLabel = getAlternativeLetter(idx);
    authorMap[b.id] = b.authorId;
  });

  // Salva no nó seguro
  await update(secretsRef, {
    realOptionId,
    authorMap,
  });

  // Publica para a sala com isReal=false e authorId protegido
  const sanitizedBluffs = finalBluffs.map((b) => ({
    id: b.id,
    text: b.text,
    letterLabel: b.letterLabel,
    authorId: 'MASKED',
    isReal: false,
  }));

  const votingLimit = Number(room.settings?.votingTimeLimit ?? 0);

  await runTransaction(roomRef, (r) => {
    if (!r || !r.currentRound || r.currentRound.phase !== 'SUBMISSION') return r;
    r.currentRound.bluffs = sanitizedBluffs;
    r.currentRound.phase = 'VOTING';
    r.currentRound.votes = {};
    r.currentRound.allVotesIn = false;
    r.currentRound.startTime = Date.now();
    if (votingLimit > 0) {
      r.currentRound.deadline = Date.now() + votingLimit * 1000;
    } else {
      delete r.currentRound.deadline;
    }

    Object.keys(r.players || {}).forEach((id) => {
      r.players[id].hasVoted = false;
    });

    r.updatedAt = Date.now();
    return stripUndefined(r);
  });
}

export async function submitVoteInDb(
  roomCode: string,
  playerId: string,
  optionId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Database indisponível.' };

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    let errorMsg: string | undefined;

    const secretsSnap = await get(secretsRef);
    const authorMap = secretsSnap.exists() ? secretsSnap.val().authorMap || {} : {};

    const txn = await runTransaction(roomRef, (room) => {
      if (!room || !room.currentRound || room.currentRound.phase !== 'VOTING') return room;

      const player = room.players?.[playerId];
      if (!player) return room;

      const isLeader = player.id === room.currentRound.leaderId;
      const leaderBluffs = isLeaderBluffing(room.settings, Object.keys(room.players).length);

      if (isLeader && !leaderBluffs) {
        errorMsg = 'Líder não vota nesta rodada!';
        return room;
      }

      // Impede votar no próprio blefe consultando authorMap
      if (authorMap[optionId] === player.id) {
        errorMsg = 'Você não pode votar no seu próprio blefe!';
        return room;
      }

      if (!room.currentRound.votes) room.currentRound.votes = {};
      room.currentRound.votes[player.id] = optionId;
      player.hasVoted = true;

      const playersList: Player[] = Object.values(room.players);
      const eligibleVoters = playersList.filter((p) => {
        if (!p.isConnected && !p.isBot) return false;
        if (p.id === room.currentRound.leaderId && !leaderBluffs) return false;
        return true;
      });

      const allVoted = eligibleVoters.every((p) => room.currentRound.votes[p.id] !== undefined);
      room.currentRound.allVotesIn = allVoted;

      room.updatedAt = Date.now();
      return room;
    });

    if (errorMsg) return { success: false, error: errorMsg };
    return { success: txn.committed };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Revelar Resultados e Contabilizar Pontuação Atômica (Líder ou Host)
 * Lê os dados do nó protegido 'secrets' e calcula as pontuações oficiais:
 * - +1 ponto por jogador enganado pelo seu blefe
 * - +2 pontos por adivinhar o significado real do dicionário
 * - +3 pontos para o Líder se ninguém acertar a correta
 */
export async function revealResultsInDb(roomCode: string, requesterId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    const secretsSnap = await get(secretsRef);
    if (!secretsSnap.exists()) return false;
    const secrets = secretsSnap.val();

    const realOptionId = secrets.realOptionId || '';
    const authorMap: Record<string, string> = secrets.authorMap || {};
    const realDefinition = secrets.realDefinition || 'Definição oficial do dicionário.';

    await runTransaction(roomRef, (room) => {
      if (!room || !room.currentRound || room.currentRound.phase !== 'VOTING') return room;
      if (room.currentRound.leaderId !== requesterId && room.hostId !== requesterId) return room;

      const round = room.currentRound;
      const playersList: Player[] = Object.values(room.players || {});
      const detailsMap = new Map<string, RoundScoreDetail>();

      for (const p of playersList) {
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

      const votes: Record<string, string> = round.votes || {};

      for (const [voterId, optionId] of Object.entries(votes)) {
        if (optionId === realOptionId) {
          const voterDetail = detailsMap.get(voterId);
          if (voterDetail) {
            voterDetail.pointsEarned += 2;
            voterDetail.breakdown.correctDefinitionBonus += 2;
          }
        } else {
          const authorId = authorMap[optionId];
          if (authorId && authorId !== voterId) {
            const authorDetail = detailsMap.get(authorId);
            if (authorDetail) {
              authorDetail.pointsEarned += 1;
              authorDetail.breakdown.bluffVotesEarned += 1;
            }

            const authorPlayer = room.players?.[authorId];
            const voterPlayer = room.players?.[voterId];
            if (authorPlayer) {
              authorPlayer.totalVotesReceived = (authorPlayer.totalVotesReceived || 0) + 1;
              if (!authorPlayer.receivedVotesHistory) authorPlayer.receivedVotesHistory = [];

              const bluffText = round.bluffs?.find((b: BluffEntry) => b.id === optionId)?.text || '';
              authorPlayer.receivedVotesHistory.push({
                id: `rv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                voterId,
                voterName: voterPlayer?.name || 'Jogador',
                voterAvatar: voterPlayer?.avatar || 'palito_classico',
                roundNumber: round.roundNumber,
                word: round.word.word,
                bluffText,
              });
            }
          }
        }
      }

      const nonLeaderVotes = Object.entries(votes).filter(([voterId]) => voterId !== round.leaderId);
      const correctNonLeaderVotes = nonLeaderVotes.filter(([, optId]) => optId === realOptionId).length;

      if (correctNonLeaderVotes === 0 && nonLeaderVotes.length > 0) {
        const leaderDetail = detailsMap.get(round.leaderId);
        if (leaderDetail) {
          leaderDetail.pointsEarned += 3;
          leaderDetail.breakdown.leaderSweepBonus += 3;
        }
      }

      const scoreDetails: RoundScoreDetail[] = [];
      for (const p of playersList) {
        const detail = detailsMap.get(p.id);
        if (detail) {
          room.players[p.id].score = (room.players[p.id].score || 0) + detail.pointsEarned;
          scoreDetails.push(detail);
        }
      }

      round.scoreDetails = scoreDetails;
      round.phase = 'REVEAL';

      if (round.bluffs) {
        round.bluffs = round.bluffs.map((b: BluffEntry) => ({
          ...b,
          authorId: authorMap[b.id] || b.authorId,
          isReal: b.id === realOptionId,
        }));
      }

      if (!room.roundHistory) room.roundHistory = [];
      room.roundHistory.unshift({
        roundNumber: round.roundNumber,
        word: round.word.word,
        realDefinition,
      });

      const targetScore = Number(room.settings?.targetScore ?? 20);
      const updatedList: Player[] = Object.values(room.players);
      const sorted = [...updatedList].sort((a, b) => b.score - a.score);
      const highestScore = sorted[0]?.score ?? 0;
      const topPlayers = sorted.filter((p) => p.score === highestScore);

      if (highestScore >= targetScore) {
        if (topPlayers.length === 1) {
          room.winnerId = topPlayers[0].id;
          room.isTieBreakActive = false;
          round.isFinalRound = true;
        } else if (topPlayers.length > 1) {
          room.isTieBreakActive = true;
        }
      }

      room.updatedAt = Date.now();
      return room;
    });
    return true;
  } catch (err) {
    console.error('Erro ao revelar resultados:', err);
    return false;
  }
}

export async function confirmNextRoundInDb(roomCode: string, playerId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    const snap = await get(roomRef);
    if (!snap.exists()) return false;
    const roomSnap = snap.val();

    let allConfirmed = false;
    let nextRoundData: any = null;
    let newWordChoices: WordItem[] = [];

    await runTransaction(roomRef, (room) => {
      if (!room || !room.currentRound) return room;

      if (!room.currentRound.nextRoundConfirmations) {
        room.currentRound.nextRoundConfirmations = [];
      }

      if (!room.currentRound.nextRoundConfirmations.includes(playerId)) {
        room.currentRound.nextRoundConfirmations.push(playerId);
      }

      const playersList: Player[] = Object.values(room.players || {});
      playersList
        .filter((p) => p.isBot)
        .forEach((b) => {
          if (!room.currentRound.nextRoundConfirmations.includes(b.id)) {
            room.currentRound.nextRoundConfirmations.push(b.id);
          }
        });

      const activePlayers = playersList.filter((p) => p.isConnected || p.isBot);
      allConfirmed =
        activePlayers.length > 0 &&
        activePlayers.every((p) => room.currentRound.nextRoundConfirmations.includes(p.id));

      if (allConfirmed) {
        if (room.winnerId || room.currentRound.isFinalRound) {
          room.currentRound.phase = 'GAME_OVER';
        } else {
          const currentIndex = playersList.findIndex((p) => p.id === room.currentRound?.leaderId);
          const nextIndex = (currentIndex + 1) % playersList.length;
          const nextLeader = playersList[nextIndex] || playersList[0];

          const roundNumber = (room.currentRound.roundNumber || 0) + 1;
          const used = Array.isArray(room.usedWordIds) ? room.usedWordIds : [];
          const rawChoices = getRandomWordChoices(3, used);
          newWordChoices = rawChoices.map((w) =>
            stripUndefined({
              id: w.id,
              word: w.word,
              partOfSpeech: w.partOfSpeech || 'substantivo',
              definition: w.definition || '',
              ...(w.falsas && w.falsas.length > 0 ? { falsas: w.falsas } : {}),
              ...(w.difficulty ? { difficulty: w.difficulty } : {}),
            })
          );

          const publicNewChoices = newWordChoices.map((w) => ({
            id: w.id,
            word: w.word,
            partOfSpeech: w.partOfSpeech,
            definition: '',
          }));

          room.currentRound = stripUndefined({
            roundNumber,
            leaderId: nextLeader.id,
            word: {
              id: newWordChoices[0].id,
              word: newWordChoices[0].word,
              partOfSpeech: newWordChoices[0].partOfSpeech,
              definition: '',
            },
            phase: 'WORD_CHOICE',
            wordChoices: publicNewChoices,
            bluffs: [],
            votes: {},
            isTieBreak: Boolean(room.isTieBreakActive),
          });

          Object.keys(room.players).forEach((id) => {
            room.players[id].hasSubmitted = false;
            room.players[id].hasVoted = false;
          });
        }
      }

      room.updatedAt = Date.now();
      return stripUndefined(room);
    });

    if (allConfirmed && newWordChoices.length > 0) {
      await set(
        secretsRef,
        stripUndefined({
          wordChoices: newWordChoices,
          realDefinition: '',
          realOptionId: '',
          authorMap: {},
        })
      );
    }

    return true;
  } catch (err) {
    console.error('Erro ao confirmar próxima rodada:', err);
    return false;
  }
}

export async function restartGameInDb(roomCode: string, hostId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);
  const secretsRef = ref(db, `${DB_SECRETS_PREFIX}/${cleanCode}`);

  try {
    await set(secretsRef, {
      realDefinition: '',
      realOptionId: '',
      authorMap: {},
    });

    await runTransaction(roomRef, (room) => {
      if (!room || room.hostId !== hostId) return room;

      room.currentRound = null;
      room.winnerId = null;
      room.isTieBreakActive = false;
      room.roundHistory = [];

      Object.keys(room.players || {}).forEach((id) => {
        room.players[id].score = 0;
        room.players[id].hasSubmitted = false;
        room.players[id].hasVoted = false;
      });

      room.updatedAt = Date.now();
      return room;
    });
    return true;
  } catch {
    return false;
  }
}

export function subscribeToRoom(
  roomCode: string,
  myPlayerId: string,
  onUpdate: (room: RoomState | null) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  if (!db) {
    onUpdate(null);
    return () => {};
  }

  const cleanCode = (roomCode || '').toUpperCase().trim();
  const roomRef = ref(db, `${DB_ROOMS_PREFIX}/${cleanCode}`);

  const unsubscribe = onValue(
    roomRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      const raw = snapshot.val();
      const formatted = formatRoomSnapshot(raw, myPlayerId);
      onUpdate(formatted);
    },
    (err) => {
      console.error('Erro na sincronização em tempo real do Firebase:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubscribe();
  };
}
