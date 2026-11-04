import { WordItem, DicionarioJsonItem } from '../types/game';
import { removeAccentsKeepCedilla, ensureConceptPeriod, formatConcept } from '../utils/textFormatting';
import dicionarioStaticJson from './dicionario.json';

export { removeAccentsKeepCedilla, ensureConceptPeriod, formatConcept };

// Acervo definitivo oficial do repositório (2.083 palavras revisadas)
// Somente alterável via código no repositório (src/data/dicionario.json)
export const DICIONARIO_JSON_ITEMS: DicionarioJsonItem[] = dicionarioStaticJson as DicionarioJsonItem[];

export const DICTIONARY_WORDS: WordItem[] = DICIONARIO_JSON_ITEMS.map((item, idx) => ({
  id: `acervo_${idx + 1}`,
  word: item.palavra.trim(),
  partOfSpeech: 'substantivo',
  definition: formatConcept(item.correta),
  falsas: item.falsas ? item.falsas.map((f) => formatConcept(f)) : undefined,
  difficulty: 'dificil',
}));

// Retorna sempre o acervo oficial do repositório com conceitos padronizados
export function getAllWords(_customWords?: WordItem[], _exclusiveCustomWords?: boolean): WordItem[] {
  return DICTIONARY_WORDS;
}

// Pure uniform Fisher-Yates shuffle
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// Sorteia palavras aleatórias do acervo oficial sem repetir na mesma partida
export function getRandomWordChoices(
  count = 3,
  excludeIds: string[] = [],
  _customWords?: WordItem[],
  _exclusiveCustomWords?: boolean
): WordItem[] {
  const all = DICTIONARY_WORDS;
  const excludeSet = new Set(excludeIds);
  const available = all.filter((w) => !excludeSet.has(w.id));
  const pool = available.length >= count ? available : all;

  const shuffled = fisherYatesShuffle(pool);
  return shuffled.slice(0, count);
}

// Mantido apenas para compatibilidade interna de tipagem
export function parseImportedDictionaryText(_rawText: string): { words: WordItem[]; error?: string } {
  return { words: DICTIONARY_WORDS };
}

// Definições falsas convincentes para bots ou partidas com poucos jogadores
export const DECOY_BLUFF_TEMPLATES: Record<string, string[]> = {
  default: [
    'Instrumento náutico de madeira utilizado no século XVIII para medir profundidades em baías rasas.',
    'Pequeno crustáceo fluvial que habita leitos arenosos de rios da bacia amazônica.',
    'Espécie de fungo comestível avermelhado muito apreciado na culinária tradicional serrana.',
    'Antigo imposto colonial cobrado sobre o comércio de tecidos finos e especiarias.',
    'Pessoa que assume a responsabilidade financeira por dívidas de terceiros sem aviso prévio.',
    'Peça curva de ferro forjado que prende o timão aos cabos mestres da embarcação.',
    'Procedimento agrícola ancestral de poda seletiva para acelerar o amadurecimento dos frutos.',
    'Sentimento de nostalgia intensa ou tristeza passageira ao entardecer em dias frios.',
    'Substância resinosa e aromática extraída da casca de árvores do cerrado para perfumaria.',
    'Recipiente de barro cozido com bico fino usado antigamente para servir azeite temperado.',
  ],
};

export function getDecoyBluff(word: WordItem, index = 0): string {
  if (word.falsas && word.falsas.length > 0) {
    return formatConcept(word.falsas[index % word.falsas.length]);
  }
  const templates = DECOY_BLUFF_TEMPLATES.default;
  const pick = templates[(word.word.length + index * 3) % templates.length];
  return formatConcept(pick);
}
