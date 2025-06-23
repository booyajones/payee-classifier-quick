
/**
 * Phase A: Normalization utilities for deterministic classifier
 */
export function normalizePayeeName(input: string): string {
  if (!input || input.trim() === '') {
    return '';
  }

  // Convert to upper-case using Unicode NFC normalization
  let normalized = input.normalize('NFC').toUpperCase();
  
  // Strip all diacritics
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove all punctuation except & and '
  normalized = normalized.replace(/[^\w\s&']/g, ' ');
  
  // Replace standalone & with AND
  normalized = normalized.replace(/\b&\b/g, 'AND');
  
  // Collapse repeating whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Trim leading and trailing whitespace
  return normalized.trim();
}
