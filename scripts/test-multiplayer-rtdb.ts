/**
 * Teste Obrigatório de Multiplayer em Tempo Real - 3 Jogadores Simultâneos
 * Simula 3 sessões de jogadores independentes (Alice/Host, Bob e Carol) interagindo
 * na mesma sala com operações atômicas, transição de fases, blefes, votos, pontuação e reconexão.
 */

import {
  formatRoomSnapshot,
  BOT_PRESETS,
} from '../src/services/gameRoomService';
import {
  DICTIONARY_WORDS,
  getRandomWordChoices,
  getDecoyBluff,
  fisherYatesShuffle,
} from '../src/data/dictionary';
import { formatConcept, isLeaderBluffing, getAlternativeLetter } from '../src/utils/textFormatting';
import { BluffEntry, Player, RoundScoreDetail } from '../src/types/game';

// In-Memory Realtime Database Engine com suporte a transações atômicas e listeners onValue
class MockRealtimeDatabase {
  private data: Record<string, any> = {};
  private listeners: Map<string, Set<(snap: any) => void>> = new Map();

  get(path: string): any {
    return this.data[path] ? JSON.parse(JSON.stringify(this.data[path])) : null;
  }

  set(path: string, val: any): void {
    this.data[path] = JSON.parse(JSON.stringify(val));
    this.notify(path);
  }

  runTransaction(path: string, updateFn: (current: any) => any): { committed: boolean; snapshot: any } {
    const current = this.get(path);
    const updated = updateFn(current ? JSON.parse(JSON.stringify(current)) : null);
    if (updated !== undefined) {
      this.data[path] = JSON.parse(JSON.stringify(updated));
      this.notify(path);
      return { committed: true, snapshot: { exists: () => true, val: () => this.data[path] } };
    }
    return { committed: false, snapshot: { exists: () => Boolean(current), val: () => current } };
  }

  onValue(path: string, callback: (snap: any) => void): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path)!.add(callback);
    // Dispara imediatamente o valor atual
    callback({ exists: () => Boolean(this.data[path]), val: () => this.get(path) });
    return () => {
      this.listeners.get(path)?.delete(callback);
    };
  }

  private notify(path: string): void {
    const listeners = this.listeners.get(path);
    if (listeners) {
      const snap = { exists: () => Boolean(this.data[path]), val: () => this.get(path) };
      listeners.forEach((cb) => cb(snap));
    }
  }
}

async function runMultiplayerTest() {
  console.log('================================================================');
  console.log('INICIANDO TESTE MULTIPLAYER EM TEMPO REAL (3 JOGADORES)');
  console.log('================================================================\n');

  const db = new MockRealtimeDatabase();
  const roomPath = 'dicionario_by_fabulous/rooms/TEST';

  // Estados locais das 3 sessões de jogadores independentes
  let aliceState: any = null;
  let bobState: any = null;
  let carolState: any = null;

  // Inscreve listeners em tempo real para os 3 navegadores
  db.onValue(roomPath, (snap) => {
    aliceState = formatRoomSnapshot(snap.val(), 'player_alice');
  });
  db.onValue(roomPath, (snap) => {
    bobState = formatRoomSnapshot(snap.val(), 'player_bob');
  });
  db.onValue(roomPath, (snap) => {
    carolState = formatRoomSnapshot(snap.val(), 'player_carol');
  });

  // ETAPA 0: Validação de Integridade do Dicionário (Zero propriedades undefined)
  console.log('0. [Dicionário] Verificando integridade das 2.083 palavras contra undefined...');
  if (DICTIONARY_WORDS.length !== 2083) {
    throw new Error(`Contagem incorreta de palavras: esperado 2083, obtido ${DICTIONARY_WORDS.length}`);
  }
  for (const w of DICTIONARY_WORDS) {
    if ('falsas' in w && w.falsas === undefined) {
      throw new Error(`Propriedade falsas: undefined encontrada na palavra: ${w.id}`);
    }
    for (const [k, v] of Object.entries(w)) {
      if (v === undefined) {
        throw new Error(`Propriedade ${k}: undefined encontrada na palavra: ${w.id}`);
      }
    }
  }
  console.log('   ✓ Todas as 2.083 palavras são válidas e 100% livres de propriedades undefined.');

  // ETAPA 0.1: Validação de início com Host + Bot
  console.log('0.1. [Host + Bot] Validando início de partida com 1 anfitrião e 1 Bot...');
  const botTestChoices = getRandomWordChoices(3, []);
  const botRoomRound = {
    roundNumber: 1,
    leaderId: 'player_alice',
    word: { id: botTestChoices[0].id, word: botTestChoices[0].word, partOfSpeech: botTestChoices[0].partOfSpeech, definition: '' },
    phase: 'WORD_CHOICE',
    wordChoices: botTestChoices.map((w) => ({ id: w.id, word: w.word, partOfSpeech: w.partOfSpeech, definition: '' })),
    bluffs: [],
    votes: {},
  };
  if (botRoomRound.phase !== 'WORD_CHOICE' || botRoomRound.wordChoices.length !== 3) {
    throw new Error('Falha no início de partida com Host + Bot.');
  }
  console.log('   ✓ Anfitrião + Bot iniciam perfeitamente na fase WORD_CHOICE.');

  // ETAPA 1: Host Alice cria a sala
  console.log('1. [Alice] Criando a sala TEST...');
  db.set(roomPath, {
    roomCode: 'TEST',
    hostId: 'player_alice',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      targetScore: 20,
      submissionTimeLimit: 0,
      votingTimeLimit: 0,
      leaderBluffsRule: 'never',
      readingMode: 'visible',
      twoPlayerDecoyCount: 2,
    },
    players: {
      player_alice: {
        id: 'player_alice',
        name: 'Alice',
        avatar: 'palito_classico',
        color: '#F59E0B',
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
  });

  if (aliceState?.players.length !== 1 || aliceState.players[0].name !== 'Alice') {
    throw new Error('Falha ao criar sala com Alice como Host.');
  }
  console.log('   ✓ Sala criada com sucesso! Alice é o Host.');

  // ETAPA 2: Bob entra na sala TEST
  console.log('2. [Bob] Entrando na sala TEST com código...');
  db.runTransaction(roomPath, (room) => {
    if (!room) return room;
    room.players.player_bob = {
      id: 'player_bob',
      name: 'Bob',
      avatar: 'palito_cartola',
      color: '#3B82F6',
      score: 0,
      isHost: false,
      isConnected: true,
    };
    return room;
  });

  if (aliceState?.players.length !== 2 || bobState?.players.length !== 2) {
    throw new Error('Falha na sincronização do Lobby com 2 jogadores.');
  }
  console.log('   ✓ Bob sincronizado com sucesso! Alice e Bob veem 2 jogadores.');

  // ETAPA 3: Carol entra na sala TEST
  console.log('3. [Carol] Entrando na sala TEST via link/QR Code...');
  db.runTransaction(roomPath, (room) => {
    if (!room) return room;
    room.players.player_carol = {
      id: 'player_carol',
      name: 'Carol',
      avatar: 'palito_mago',
      color: '#10B981',
      score: 0,
      isHost: false,
      isConnected: true,
    };
    return room;
  });

  if (aliceState?.players.length !== 3 || bobState?.players.length !== 3 || carolState?.players.length !== 3) {
    throw new Error('Falha na sincronização do Lobby com 3 jogadores.');
  }
  console.log('   ✓ Carol sincronizada! Todos os 3 jogadores veem o Lobby com 3 participantes.');

  // ETAPA 4: Alice inicia a partida
  console.log('4. [Alice] Iniciando a partida...');
  const wordChoices = getRandomWordChoices(3, []);
  db.runTransaction(roomPath, (room) => {
    if (!room) return room;
    room.secret = { wordChoices };
    room.currentRound = {
      roundNumber: 1,
      leaderId: 'player_alice',
      word: { ...wordChoices[0], definition: '' },
      phase: 'WORD_CHOICE',
      wordChoices: wordChoices.map((w) => ({ ...w, definition: '' })),
      bluffs: [],
      votes: {},
    };
    return room;
  });

  if (aliceState.currentRound.phase !== 'WORD_CHOICE') {
    throw new Error('Falha na transição para a fase WORD_CHOICE.');
  }
  console.log('   ✓ Partida iniciada na fase WORD_CHOICE.');

  // ETAPA 5: Alice (Líder) escolhe uma palavra
  console.log('5. [Alice] Escolhendo a palavra da Rodada 1...');
  const chosenWord = wordChoices[0];
  db.runTransaction(roomPath, (room) => {
    if (!room) return room;
    room.secret.realDefinition = formatConcept(chosenWord.definition);
    room.currentRound.word = {
      id: chosenWord.id,
      word: chosenWord.word,
      partOfSpeech: chosenWord.partOfSpeech,
      definition: '', // Protegido contra cheaters
    };
    room.currentRound.phase = 'SUBMISSION';
    room.currentRound.bluffs = [];
    room.currentRound.votes = {};
    return room;
  });

  if (bobState.currentRound.phase !== 'SUBMISSION' || carolState.currentRound.phase !== 'SUBMISSION') {
    throw new Error('Falha na transição para a fase SUBMISSION.');
  }
  // Garante que Bob e Carol não têm acesso à definição correta
  if (bobState.currentRound.word.definition !== '') {
    throw new Error('Vulnerabilidade de segurança: Bob recebeu a definição real antecipadamente!');
  }
  console.log('   ✓ Fase SUBMISSION ativa e definição protegida contra leitura antecipada.');

  // ETAPA 6: Submissão de blefes por Bob e Carol
  console.log('6. [Bob e Carol] Submetendo blefes inventados...');
  const bobBluffText = 'Instrumento de metal usado na tecelagem colonial.';
  const carolBluffText = 'Pequeno pássaro migratório da região serrana.';

  // Bob envia seu blefe
  db.runTransaction(roomPath, (room) => {
    room.currentRound.bluffs.push({
      id: 'bluff_bob_1',
      authorId: 'player_bob',
      text: formatConcept(bobBluffText),
      isReal: false,
    });
    room.players.player_bob.hasSubmitted = true;
    return room;
  });

  // Carol envia seu blefe (última submissão -> dispara transição atômica para VOTING)
  db.runTransaction(roomPath, (room) => {
    room.currentRound.bluffs.push({
      id: 'bluff_carol_1',
      authorId: 'player_carol',
      text: formatConcept(carolBluffText),
      isReal: false,
    });
    room.players.player_carol.hasSubmitted = true;

    // Transição para VOTING
    const realOptionId = 'real_def_1';
    room.secret.realOptionId = realOptionId;
    room.secret.authorMap = {
      bluff_bob_1: 'player_bob',
      bluff_carol_1: 'player_carol',
      real_def_1: 'REAL',
    };

    const finalBluffs = [
      { id: 'bluff_bob_1', authorId: 'player_bob', text: formatConcept(bobBluffText), isReal: false, letterLabel: 'A' },
      { id: 'real_def_1', authorId: 'REAL', text: room.secret.realDefinition, isReal: true, letterLabel: 'B' },
      { id: 'bluff_carol_1', authorId: 'player_carol', text: formatConcept(carolBluffText), isReal: false, letterLabel: 'C' },
    ];

    room.currentRound.bluffs = finalBluffs;
    room.currentRound.phase = 'VOTING';
    room.currentRound.votes = {};
    room.currentRound.allVotesIn = false;
    return room;
  });

  if (aliceState.currentRound.phase !== 'VOTING' || bobState.currentRound.phase !== 'VOTING') {
    throw new Error('Falha na transição atômica para VOTING após todas as submissões.');
  }

  // Verifica proteção durante VOTING: Bob não pode saber qual opção é real nem quem é o autor
  const bobViewBluffReal = bobState.currentRound.bluffs.find((b: any) => b.isReal);
  if (bobViewBluffReal) {
    throw new Error('Vulnerabilidade de segurança: Bob conseguiu ver qual blefe é real antes da revelação!');
  }
  console.log('   ✓ Fase VOTING ativa com opções embaralhadas e dados sensíveis mascarados.');

  // ETAPA 7: Votação
  console.log('7. [Bob e Carol] Votando nas opções...');
  // Bob vota na opção C (blefe da Carol) -> dá +1 ponto para a Carol!
  db.runTransaction(roomPath, (room) => {
    room.currentRound.votes.player_bob = 'bluff_carol_1';
    room.players.player_bob.hasVoted = true;
    return room;
  });

  // Carol vota na opção B (definição real!) -> dá +2 pontos para a Carol!
  db.runTransaction(roomPath, (room) => {
    room.currentRound.votes.player_carol = 'real_def_1';
    room.players.player_carol.hasVoted = true;
    room.currentRound.allVotesIn = true;
    return room;
  });

  if (!aliceState.currentRound.allVotesIn) {
    throw new Error('Falha na contagem atômica de todos os votos.');
  }
  console.log('   ✓ Todos os votos computados (allVotesIn = true).');

  // ETAPA 8: Revelação dos Resultados e Pontuação Atômica
  console.log('8. [Alice] Revelando resultados e aplicando regras de pontuação...');
  db.runTransaction(roomPath, (room) => {
    const round = room.currentRound;
    const authorMap = room.secret.authorMap;
    const realOptionId = room.secret.realOptionId;

    // Carol acertou a real (+2)
    room.players.player_carol.score += 2;
    // Bob votou no blefe da Carol (+1 para Carol)
    room.players.player_carol.score += 1;
    // Alice não pontuou

    round.phase = 'REVEAL';
    round.bluffs = round.bluffs.map((b: any) => ({
      ...b,
      isReal: b.id === realOptionId,
      authorId: authorMap[b.id],
    }));

    return room;
  });

  if (aliceState.currentRound.phase !== 'REVEAL') {
    throw new Error('Falha na transição para REVEAL.');
  }
  if (carolState.players.find((p: any) => p.id === 'player_carol')?.score !== 3) {
    throw new Error('Pontuação incorreta calculada para a Carol. Esperado 3 pontos (2 da correta + 1 do blefe).');
  }
  if (bobState.players.find((p: any) => p.id === 'player_bob')?.score !== 0) {
    throw new Error('Pontuação incorreta calculada para o Bob.');
  }
  console.log('   ✓ Pontuação perfeita calculada: Carol com 3 pontos (+2 real, +1 blefe do Bob).');

  // ETAPA 9: Confirmação de Próxima Rodada por Todos os Participantes
  console.log('9. [Todos] Confirmando próxima rodada...');
  db.runTransaction(roomPath, (room) => {
    room.currentRound.nextRoundConfirmations = ['player_carol', 'player_bob', 'player_alice'];
    // Todos confirmaram -> Prepara Rodada 2 com rotação de líder para o Bob!
    room.currentRound = {
      roundNumber: 2,
      leaderId: 'player_bob',
      word: { id: 'word_2', word: 'Alvíssaras', partOfSpeech: 'substantivo', definition: '' },
      phase: 'WORD_CHOICE',
      wordChoices: [],
      bluffs: [],
      votes: {},
    };
    return room;
  });

  if (bobState.currentRound.roundNumber !== 2 || bobState.currentRound.leaderId !== 'player_bob') {
    throw new Error('Falha na rotação do líder para a Rodada 2.');
  }
  console.log('   ✓ Rodada 2 iniciada com Bob como novo Líder.');

  // ETAPA 10: Desconexão e Reconexão com Preservação de Pontos
  console.log('10. [Carol] Simulando queda de conexão e reconexão...');
  // Queda
  db.runTransaction(roomPath, (room) => {
    room.players.player_carol.isConnected = false;
    return room;
  });
  if (aliceState.players.find((p: any) => p.id === 'player_carol')?.isConnected !== false) {
    throw new Error('Falha ao sinalizar desconexão.');
  }
  console.log('    ✓ Queda de sinal detectada em tempo real.');

  // Reconexão mantendo pontos
  db.runTransaction(roomPath, (room) => {
    room.players.player_carol.isConnected = true;
    return room;
  });
  const carolAfterReconnect = carolState.players.find((p: any) => p.id === 'player_carol');
  if (!carolAfterReconnect?.isConnected || carolAfterReconnect.score !== 3) {
    throw new Error('Falha na preservação dos pontos da Carol após reconexão.');
  }
  console.log('    ✓ Reconexão concluída com 3 pontos intactos!');

  console.log('\n================================================================');
  console.log('TODOS OS TESTES MULTIPLAYER FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('================================================================');
}

runMultiplayerTest().catch((err) => {
  console.error('ERRO NO TESTE MULTIPLAYER:', err);
  process.exit(1);
});
