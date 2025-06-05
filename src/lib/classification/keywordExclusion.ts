
// Default exclusion keywords - can be configured
const DEFAULT_EXCLUSION_KEYWORDS = [
  'test',
  'sample',
  'example',
  'dummy',
  'placeholder',
  'temp',
  'temporary',
  'unknown',
  'na',
  'null',
  'undefined',
  'blank',
  'empty',
  'void',
  'pending',
  'processing',
  'error',
  'failed',
  'invalid',
  'debug'
];

export interface ExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  originalName: string;
}

/**
 * Check if a payee name contains any exclusion keywords using whole word matching
 */
export function checkKeywordExclusion(
  payeeName: string, 
  exclusionKeywords: string[] = DEFAULT_EXCLUSION_KEYWORDS
): ExclusionResult {
  if (!payeeName || typeof payeeName !== 'string') {
    return {
      isExcluded: true,
      matchedKeywords: ['invalid-input'],
      originalName: payeeName
    };
  }

  const normalizedName = payeeName.toLowerCase().trim();
  const matchedKeywords: string[] = [];

  // Check each exclusion keyword using word boundaries
  for (const keyword of exclusionKeywords) {
    if (!keyword || typeof keyword !== 'string') continue;
    
    const normalizedKeyword = keyword.toLowerCase().trim();
    if (!normalizedKeyword) continue;

    // Create regex with word boundaries for exact word matching
    const wordRegex = new RegExp(`\\b${normalizedKeyword}\\b`, 'i');
    
    if (wordRegex.test(normalizedName)) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    isExcluded: matchedKeywords.length > 0,
    matchedKeywords,
    originalName: payeeName
  };
}

/**
 * Filter an array of payee names, separating excluded from valid ones
 */
export function filterPayeeNames(
  payeeNames: string[],
  exclusionKeywords: string[] = DEFAULT_EXCLUSION_KEYWORDS
): {
  validNames: string[];
  excludedNames: Array<{ name: string; reason: string[] }>;
} {
  const validNames: string[] = [];
  const excludedNames: Array<{ name: string; reason: string[] }> = [];

  for (const name of payeeNames) {
    const exclusionResult = checkKeywordExclusion(name, exclusionKeywords);
    
    if (exclusionResult.isExcluded) {
      excludedNames.push({
        name: name,
        reason: exclusionResult.matchedKeywords
      });
    } else {
      validNames.push(name);
    }
  }

  return { validNames, excludedNames };
}

/**
 * Get the default exclusion keywords
 */
export function getDefaultExclusionKeywords(): string[] {
  return [...DEFAULT_EXCLUSION_KEYWORDS];
}

/**
 * Validate exclusion keywords array
 */
export function validateExclusionKeywords(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) {
    console.warn('[EXCLUSION] Invalid keywords array, using defaults');
    return DEFAULT_EXCLUSION_KEYWORDS;
  }

  return keywords
    .filter(keyword => keyword && typeof keyword === 'string' && keyword.trim())
    .map(keyword => keyword.trim().toLowerCase());
}
