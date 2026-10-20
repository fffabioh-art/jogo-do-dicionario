import { WordItem } from '../types/game';

const STORAGE_KEY = 'jdd_persistent_custom_words';
const EVENT_NAME = 'jdd_custom_words_updated';

// Read saved words from localStorage
export function getLocalCustomWords(): WordItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('Error reading saved custom words from localStorage:', err);
  }
  return [];
}

// Save words to localStorage and notify all listeners
export function saveLocalCustomWords(words: WordItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: words }));
  } catch (err) {
    console.error('Error saving custom words to localStorage:', err);
  }
}

// Clear words from localStorage and notify
export function clearLocalCustomWords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
  } catch (err) {
    console.error('Error clearing custom words from localStorage:', err);
  }
}

// Sync with server persistent storage (API)
export async function syncCustomWordsWithServer(): Promise<WordItem[]> {
  try {
    const res = await fetch('/api/dictionary/custom');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.words)) {
        const localWords = getLocalCustomWords();
        // If server has words, store them locally
        if (data.words.length > 0) {
          saveLocalCustomWords(data.words);
          return data.words;
        } else if (localWords.length > 0) {
          // If local has words but server doesn't, push local to server
          await pushLocalCustomWordsToServer(localWords);
          return localWords;
        }
      }
    }
  } catch (err) {
    console.warn('Could not sync custom words with server, using local storage:', err);
  }
  return getLocalCustomWords();
}

// Push local words to server to persist on server disk
export async function pushLocalCustomWordsToServer(words: WordItem[], replaceAll = true): Promise<boolean> {
  try {
    const res = await fetch('/api/dictionary/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words, replaceAll }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Error pushing custom words to server:', err);
    return false;
  }
}

// Delete words from server disk
export async function deleteCustomWordsFromServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/dictionary/custom', {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Error deleting custom words from server:', err);
    return false;
  }
}

// Helper hook / subscription for React components
export function subscribeToCustomWords(callback: (words: WordItem[]) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<WordItem[]>;
    callback(customEvent.detail || getLocalCustomWords());
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
