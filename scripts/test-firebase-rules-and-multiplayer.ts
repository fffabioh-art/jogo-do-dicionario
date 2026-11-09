import fs from 'fs';
import path from 'path';
// @ts-ignore
import targaryen from 'targaryen';

console.log('================================================================');
console.log('TESTE OFICIAL DE REGRAS DO FIREBASE REALTIME DATABASE (TARGARYEN)');
console.log('Validação de Regras: Anti-Cheat de Segredos e Proteção de Pontuações');
console.log('================================================================\n');

// 1. Carrega e valida sintaxe estrita do database.rules.json
const rulesPath = path.resolve(process.cwd(), 'database.rules.json');
const rawRules = fs.readFileSync(rulesPath, 'utf8');
const rulesJson = JSON.parse(rawRules); // Garante que é JSON estritamente válido

const ruleset = targaryen.ruleset(rulesJson);
console.log('✓ database.rules.json compilado com sucesso pelo parser do Firebase!\n');

const aliceAuth = { uid: 'uid_alice' };
const bobAuth = { uid: 'uid_bob' };
const carolAuth = { uid: 'uid_carol' };
const unauth: any = null;

let passedTests = 0;
let totalTests = 0;

function assert(description: string, condition: boolean) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASSOU] ${description}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FALHOU] ${description}`);
    throw new Error(`Falha no teste: ${description}`);
  }
}

// TESTE 1: Bloqueio para usuário não autenticado e proteção de outros nós (ex: Mago das Licitações)
console.log('1. Testando segurança básica e proteção de outros apps:');
let db = targaryen.database(ruleset, {});

const unauthRead = db.as(unauth).read('/dicionario_by_fabulous/rooms/TEST');
assert('Usuário não-autenticado é PROIBIDO de ler salas', !unauthRead.allowed);

const unauthWrite = db.as(unauth).write('/dicionario_by_fabulous/rooms/TEST', {
  roomCode: 'TEST',
  hostId: 'anon',
});
assert('Usuário não-autenticado é PROIBIDO de escrever em salas', !unauthWrite.allowed);

const otherAppRead = db.as(aliceAuth).read('/mago_das_licitacoes/dados');
assert('Outros aplicativos (ex: Mago das Licitações) continuam 100% protegidos contra leitura', !otherAppRead.allowed);

const otherAppWrite = db.as(aliceAuth).write('/mago_das_licitacoes/dados', { test: 123 });
assert('Outros aplicativos continuam 100% protegidos contra gravação', !otherAppWrite.allowed);

// TESTE 2: Criação de sala pelo Host (Alice)
console.log('\n2. Testando criação de sala pelo Host (Alice):');
const initialRoomData = {
  roomCode: 'TEST',
  hostId: 'uid_alice',
  settings: {
    targetScore: 20,
    submissionTimeLimit: 0,
    votingTimeLimit: 0,
    leaderBluffsRule: 'never',
    readingMode: 'visible',
    twoPlayerDecoyCount: 2,
  },
  players: {
    uid_alice: {
      id: 'uid_alice',
      name: 'Alice',
      avatar: 'palito_classico',
      color: '#F59E0B',
      score: 0,
      isHost: true,
      isConnected: true,
    },
  },
};

const aliceCreate = db.as(aliceAuth).write('/dicionario_by_fabulous/rooms/TEST', initialRoomData);
assert('Alice (Host autenticado) tem permissão para criar a sala TEST', aliceCreate.allowed);

const aliceCreateSecret = db.as(aliceAuth).write('/dicionario_by_fabulous/secrets/TEST', {
  realDefinition: 'Definição oficial e secreta',
  realOptionId: 'entry_real',
  authorMap: {},
});
assert('Alice tem permissão para inicializar o nó secrets/TEST', aliceCreateSecret.allowed);

// Inicializa banco com a sala criada
let activeData: any = {
  dicionario_by_fabulous: {
    rooms: {
      TEST: JSON.parse(JSON.stringify(initialRoomData)),
    },
    secrets: {
      TEST: {
        realDefinition: 'Definição oficial e secreta',
        realOptionId: 'entry_real',
        authorMap: {},
      },
    },
  },
};
db = targaryen.database(ruleset, activeData);

// TESTE 3: Entrada de jogadores (Bob e Carol) sem PERMISSION_DENIED
console.log('\n3. Testando entrada e sincronização em tempo real de participantes:');
const bobPlayer = {
  id: 'uid_bob',
  name: 'Bob',
  avatar: 'palito_bone',
  color: '#3B82F6',
  score: 0,
  isHost: false,
  isConnected: true,
};

const bobJoin = db.as(bobAuth).write('/dicionario_by_fabulous/rooms/TEST/players/uid_bob', bobPlayer);
assert('Bob pode entrar na sala registrando seu jogador sem erro de permissão', bobJoin.allowed);

// Bob também pode executar a transação na sala para registrar sua entrada
const bobJoinTxn = db.as(bobAuth).write('/dicionario_by_fabulous/rooms/TEST', {
  ...activeData.dicionario_by_fabulous.rooms.TEST,
  players: {
    ...activeData.dicionario_by_fabulous.rooms.TEST.players,
    uid_bob: bobPlayer,
  },
});
assert('Bob pode ingressar via transação atômica da sala sem PERMISSION_DENIED', bobJoinTxn.allowed);

activeData.dicionario_by_fabulous.rooms.TEST.players.uid_bob = bobPlayer;
db = targaryen.database(ruleset, activeData);

const carolPlayer = {
  id: 'uid_carol',
  name: 'Carol',
  avatar: 'palito_mago',
  color: '#10B981',
  score: 0,
  isHost: false,
  isConnected: true,
};
const carolJoin = db.as(carolAuth).write('/dicionario_by_fabulous/rooms/TEST/players/uid_carol', carolPlayer);
assert('Carol pode entrar na sala registrando seu próprio nó', carolJoin.allowed);

activeData.dicionario_by_fabulous.rooms.TEST.players.uid_carol = carolPlayer;
db = targaryen.database(ruleset, activeData);

// TESTE 4: Proteção contra alteração indevida de configurações e pontuações por convidados
console.log('\n4. Testando restrição de configurações e proteção de placar:');
const bobTamperSettings = db.as(bobAuth).write('/dicionario_by_fabulous/rooms/TEST/settings/targetScore', 99);
assert('Bob (convidado) é PROIBIDO de alterar as configurações da sala', !bobTamperSettings.allowed);

const aliceChangeSettings = db.as(aliceAuth).write('/dicionario_by_fabulous/rooms/TEST/settings/targetScore', 30);
assert('Alice (Anfitrião) PODE alterar as configurações da sala', aliceChangeSettings.allowed);

const bobTamperScore = db.as(bobAuth).write('/dicionario_by_fabulous/rooms/TEST/players/uid_bob/score', 50);
assert('Bob é PROIBIDO de alterar sua própria pontuação arbitrariamente', !bobTamperScore.allowed);

// TESTE 5: Proteção de Segredos durante SUBMISSION e VOTING (Anti-Cheat)
console.log('\n5. Testando proteção estrita de segredos (Anti-Cheat):');
activeData.dicionario_by_fabulous.rooms.TEST.currentRound = {
  roundNumber: 1,
  leaderId: 'uid_alice',
  phase: 'SUBMISSION',
  word: { id: 'w1', word: 'Alvíssaras', definition: '' },
  bluffs: [],
  votes: {},
};
db = targaryen.database(ruleset, activeData);

const bobReadSecretInSubmission = db.as(bobAuth).read('/dicionario_by_fabulous/secrets/TEST');
assert('Bob é TERMINANTEMENTE BLOQUEADO de ler a definição oficial durante SUBMISSION', !bobReadSecretInSubmission.allowed);

const aliceReadSecretInSubmission = db.as(aliceAuth).read('/dicionario_by_fabulous/secrets/TEST');
assert('Alice (Host/Líder) PODE ler o segredo para conduzir a rodada', aliceReadSecretInSubmission.allowed);

// Submissão de blefes por convidados
const bobSubmitBluff = db.as(bobAuth).write('/dicionario_by_fabulous/rooms/TEST/currentRound/bluffs', [
  { id: 'bluff_bob', authorId: 'uid_bob', text: 'Premiação em ouro', isReal: false },
]);
assert('Bob pode submeter seu blefe inventado sem PERMISSION_DENIED', bobSubmitBluff.allowed);

// Transição para VOTING
activeData.dicionario_by_fabulous.rooms.TEST.currentRound.phase = 'VOTING';
db = targaryen.database(ruleset, activeData);

const carolReadSecretInVoting = db.as(carolAuth).read('/dicionario_by_fabulous/secrets/TEST');
assert('Carol é TERMINANTEMENTE BLOQUEADA de ler a resposta oficial durante VOTING', !carolReadSecretInVoting.allowed);

const bobVote = db.as(bobAuth).write('/dicionario_by_fabulous/rooms/TEST/currentRound/votes/uid_bob', 'entry_real');
assert('Bob pode votar na opção escolhida sem PERMISSION_DENIED', bobVote.allowed);

// Transição para REVEAL
console.log('\n6. Testando revelação de respostas e aplicação de pontuação:');
activeData.dicionario_by_fabulous.rooms.TEST.currentRound.phase = 'REVEAL';
db = targaryen.database(ruleset, activeData);

const bobReadSecretInReveal = db.as(bobAuth).read('/dicionario_by_fabulous/secrets/TEST');
assert('Bob PODE ler a resposta oficial após a transição para REVEAL', bobReadSecretInReveal.allowed);

const carolReadSecretInReveal = db.as(carolAuth).read('/dicionario_by_fabulous/secrets/TEST');
assert('Carol PODE ler a resposta oficial após a transição para REVEAL', carolReadSecretInReveal.allowed);

const aliceApplyScore = db.as(aliceAuth).write('/dicionario_by_fabulous/rooms/TEST/players/uid_carol/score', 2);
assert('Alice (Host) PODE aplicar as pontuações computadas na rodada', aliceApplyScore.allowed);

// Confirmação de próxima rodada
const bobConfirmNext = db.as(bobAuth).write(
  '/dicionario_by_fabulous/rooms/TEST/currentRound/nextRoundConfirmations',
  ['uid_bob']
);
assert('Bob pode confirmar a próxima rodada sem PERMISSION_DENIED', bobConfirmNext.allowed);

console.log('\n================================================================');
console.log(`SUCESSO COMPLETO: ${passedTests} DE ${totalTests} TESTES DE REGRAS APROVADOS!`);
console.log('Regras simplificadas, seguras e com proteção completa contra trapaças!');
console.log('================================================================\n');
