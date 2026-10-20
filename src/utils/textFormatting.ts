/**
 * Utility to ensure all concepts and definitions end with a period without duplication.
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
