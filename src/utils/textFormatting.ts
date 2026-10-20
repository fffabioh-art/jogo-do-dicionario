/**
 * Strips all accents and tildes while preserving 'ç' and 'Ç'.
 * Rule:
 * "Todos as respostas nao podem conter acento ou til. Apenas ç.
 *  Mesmo que a pessoa coloque, retire. Os signigicados tbm tem que aparecer
 *  obedecendo essa regra, para que nao haja diferenciacao"
 */
export function removeAccentsKeepCedilla(text: string): string {
  if (!text) return '';
  // Protect 'ç' and 'Ç' from diacritic stripping
  const protectedText = text
    .replace(/ç/g, '__cedilla_lower__')
    .replace(/Ç/g, '__cedilla_upper__');

  // Strip combining diacritic marks (acute, circumflex, grave, tilde, diaeresis, etc.)
  const normalized = protectedText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Strip any stray standalone accent/tilde characters
  const cleaned = normalized.replace(/[~^´`¨]/g, '');

  // Restore 'ç' and 'Ç'
  return cleaned
    .replace(/__cedilla_lower__/g, 'ç')
    .replace(/__cedilla_upper__/g, 'Ç');
}

/**
 * Utility to ensure all concepts and definitions end with a single period without duplication.
 * Rule:
 * 1. Must obligatorily end with a period '.'.
 * 2. If the user/participant already added a period (or multiple trailing periods), do not add another to prevent duplication.
 * 3. If the user/participant did not add a period, the system adds one automatically.
 */
export function ensureConceptPeriod(concept: string): string {
  if (!concept) return '';
  const trimmed = concept.trim();
  if (!trimmed) return '';

  // Clean trailing non-sentence punctuation (like commas, colons, semicolons, dashes)
  const cleaned = trimmed.replace(/[\s,;:–—-]+$/, '');
  if (!cleaned) return '';

  // If already ends with one or more periods (e.g. '.', '..', '...'), normalize to a single period
  if (/\.+$/.test(cleaned)) {
    return cleaned.replace(/\s*\.+$/, '.');
  }

  // Otherwise, append the period automatically
  return cleaned + '.';
}

/**
 * Master formatter for all bluffs and dictionary definitions.
 * Guarantees:
 * 1. Accents and tildes are completely removed.
 * 2. Cedilla ('ç' and 'Ç') is preserved.
 * 3. All text is in UPPERCASE.
 * 4. Text obligatorily ends with a single period.
 * 5. Perfectly uniform between player responses and dictionary definitions to eliminate tells.
 */
export function formatConcept(text: string): string {
  if (!text) return '';
  const withoutAccents = removeAccentsKeepCedilla(text);
  const upper = withoutAccents.toUpperCase().trim();
  return ensureConceptPeriod(upper);
}

/**
 * Determines whether the round's leader is expected to type/submit a bluff and vote.
 * - 'always': leader always bluffs and votes
 * - 'never': leader NEVER bluffs and NEVER votes (sweep bonus if 0 players guess correctly)
 * - 'auto': leader bluffs if 4 or fewer players
 */
export function isLeaderBluffing(
  settings?: { leaderBluffsRule?: 'auto' | 'always' | 'never' } | null,
  playerCount: number = 0
): boolean {
  const rule = settings?.leaderBluffsRule || 'auto';
  if (rule === 'always') return true;
  if (rule === 'never') return false;
  return playerCount <= 4;
}

