import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  Database,
} from 'firebase/database';

export interface FirebaseEnvConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export function getFirebaseConfig(): FirebaseEnvConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
      config.apiKey.length > 5 &&
      config.databaseURL &&
      config.databaseURL.startsWith('http')
  );
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Database | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) return null;

  try {
    const config = getFirebaseConfig();
    if (getApps().length === 0) {
      appInstance = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        databaseURL: config.databaseURL,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      });
    } else {
      appInstance = getApp();
    }
    return appInstance;
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  authInstance = getAuth(app);
  return authInstance;
}

export function getFirebaseDb(): Database | null {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  dbInstance = getDatabase(app);
  return dbInstance;
}

/**
 * Autenticação anônima obrigatória (Spark / Custo Zero)
 * Garante que o jogador possua um UID do Firebase Auth sem exigir email ou login
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  if (auth.currentUser) {
    return auth.currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          unsubscribe();
          resolve(cred.user);
        } catch (err) {
          console.error('Falha no signInAnonymously do Firebase:', err);
          unsubscribe();
          resolve(null);
        }
      }
    });
  });
}

/**
 * Escuta o estado de conexão nativo do Firebase Realtime Database (.info/connected)
 */
export function subscribeToConnectionState(callback: (connected: boolean) => void): () => void {
  const db = getFirebaseDb();
  if (!db) {
    callback(false);
    return () => {};
  }

  const connectedRef = ref(db, '.info/connected');
  const unsubscribe = onValue(connectedRef, (snapshot) => {
    callback(Boolean(snapshot.val()));
  });

  return () => {
    unsubscribe();
  };
}
