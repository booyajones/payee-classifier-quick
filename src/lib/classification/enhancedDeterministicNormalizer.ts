
export function normalize(rawString: string): string {
  if (!rawString || typeof rawString !== 'string') {
    return '';
  }

  // Unicode NFC normalization and case folding
  let s = rawString.normalize('NFC').toUpperCase();
  
  // Strip diacritics (simplified approach)
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remove punctuation except '&' and "'"
  s = s.replace(/[^\w\s&']/g, ' ');
  
  // Standardize ampersand
  s = s.replace(/\s*&\s*/g, ' AND ');
  
  // Collapse whitespace and trim
  s = s.replace(/\s+/g, ' ').trim();
  
  return s;
}
