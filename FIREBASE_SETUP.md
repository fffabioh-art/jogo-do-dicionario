# Guia de Configuração - Firebase Realtime Database (Plano Spark - 100% Gratuito)

Este projeto foi totalmente migrado para arquitetura **100% Client-Side** na Vercel utilizando o **Firebase Realtime Database** e **Firebase Authentication Anônimo** para multiplayer em tempo real sem servidor Express e sem erros de HTTP 405.

O plano Spark do Firebase é permanente e **não exige cartão de crédito nem faturamento Google Cloud**.

---

## Passo 1: Criar o Projeto no Firebase Console
1. Acesse [Firebase Console](https://console.firebase.google.com).
2. Clique em **"Adicionar projeto"** (ou use um projeto existente).
3. Nomeie seu projeto (ex: `jogo-dicionario-fabulous`).
4. O Google Analytics é opcional (pode desmarcar ou manter).
5. Clique em **"Criar projeto"**.

---

## Passo 2: Ativar Autenticação Anônima
1. No menu lateral esquerdo, vá em **Criação (Build)** > **Authentication**.
2. Clique em **Primeiros passos** (Get started).
3. Na aba **Sign-in method**, localize a opção **Anônimo** (Anonymous).
4. Ative a chave seletora e clique em **Salvar**.
> *Isso permite que qualquer jogador entre e jogue instantaneamente pelo celular ou PC sem precisar digitar e-mail ou senha.*

---

## Passo 3: Criar o Realtime Database
1. No menu lateral esquerdo, vá em **Criação (Build)** > **Realtime Database**.
2. Clique em **Criar banco de dados** (Create database).
3. Selecione a localização (ex: `United States (us-central1)`).
4. Em regras iniciais, escolha **Iniciar no modo bloqueado** (ou de teste) e clique em **Ativar**.
5. Na aba **Regras** (Rules), substitua o conteúdo pelas regras de segurança do arquivo `database.rules.json` do repositório:
```json
{
  "rules": {
    "dicionario_by_fabulous": {
      "rooms": {
        "$roomCode": {
          ".read": "auth != null",
          ".write": "auth != null",
          "hostId": {
            ".validate": "!data.exists() || data.val() === newData.val() || data.val() === auth.uid"
          },
          "settings": {
            "targetScore": {
              ".validate": "newData.parent().parent().child('hostId').val() === auth.uid || !data.exists() || data.val() === newData.val()"
            }
          },
          "players": {
            "$playerId": {
              "score": {
                ".validate": "newData.isNumber() && newData.val() >= 0 && (root.child('dicionario_by_fabulous/rooms/' + $roomCode + '/hostId').val() === auth.uid || root.child('dicionario_by_fabulous/rooms/' + $roomCode + '/currentRound/leaderId').val() === auth.uid || !data.exists() || data.val() === newData.val())"
              }
            }
          }
        }
      },
      "secrets": {
        "$roomCode": {
          ".read": "auth != null && (root.child('dicionario_by_fabulous/rooms/' + $roomCode + '/currentRound/phase').val() === 'REVEAL' || root.child('dicionario_by_fabulous/rooms/' + $roomCode + '/currentRound/phase').val() === 'GAME_OVER' || root.child('dicionario_by_fabulous/rooms/' + $roomCode + '/hostId').val() === auth.uid || root.child('dicionario_by_fabulous/rooms/' + $roomCode + '/currentRound/leaderId').val() === auth.uid)",
          ".write": "auth != null"
        }
      }
    }
  }
}
```
6. Clique em **Publicar** (Publish).
> *Nota: Os dados do jogo ficam estritamente isolados sob `dicionario_by_fabulous/rooms`. Nenhum outro dado ou app do seu Firebase é afetado.*

---

## Passo 4: Registrar o Aplicativo Web e Obter as Chaves
1. No menu lateral esquerdo, clique no ícone de engrenagem ao lado de "Visão geral do projeto" > **Configurações do projeto**.
2. Na seção **Seus aplicativos**, clique no ícone Web **`</>`**.
3. Dê um apelido ao app (ex: `dicionario-web`) e clique em **Registrar app**.
4. Copie os valores do objeto `firebaseConfig`:
   - `apiKey` -> `VITE_FIREBASE_API_KEY`
   - `authDomain` -> `VITE_FIREBASE_AUTH_DOMAIN`
   - `databaseURL` -> `VITE_FIREBASE_DATABASE_URL` (se não aparecer no snippet, copie a URL do topo da página do Realtime Database, ex: `https://seu-projeto-default-rtdb.firebaseio.com`)
   - `projectId` -> `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` -> `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` -> `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` -> `VITE_FIREBASE_APP_ID`

---

## Passo 5: Configurar na Vercel
1. Acesse o painel do seu projeto na [Vercel](https://vercel.com).
2. Vá em **Settings** > **Environment Variables**.
3. Adicione cada uma das 7 variáveis com seus respectivos valores:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Selecione os ambientes **Production**, **Preview** e **Development**.
5. Clique em **Save**.
6. Vá na aba **Deployments** e clique em **Redeploy** para recompilar com as novas variáveis ativas.

Pronto! Seu jogo estará rodando 100% online, sem backend, sem custos e sincronizando em tempo real entre celulares e computadores!
