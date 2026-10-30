import { WordItem } from '../types/game';

const STORAGE_KEY = 'jdd_persistent_custom_words';
const EVENT_NAME = 'jdd_custom_words_updated';

// Read saved words from localStorage (100% client-side, zero backend dependency)
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

// Helper hook / subscription for React components
export function subscribeToCustomWords(callback: (words: WordItem[]) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<WordItem[]>;
    callback(customEvent.detail || getLocalCustomWords());
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
