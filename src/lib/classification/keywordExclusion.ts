import bundledKeywords from "../../../data/exclusion-keywords.json";

// Fallback comprehensive exclusion keywords bundled with the application
export const BUNDLED_EXCLUSION_KEYWORDS: string[] = bundledKeywords;

let cachedKeywords: string[] | null = null;

/**
 * Load exclusion keywords from the JSON file at runtime.
 * Falls back to the bundled list if loading fails.
 */
export async function loadExclusionKeywords(
  url = "/data/exclusion-keywords.json"
): Promise<string[]> {
  if (cachedKeywords) return cachedKeywords;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json)) {
        cachedKeywords = validateExclusionKeywords(json);
        return cachedKeywords;
      }
    }
  } catch (err) {
    console.warn(`[EXCLUSION] Failed to load keywords from ${url}`, err);
  }

  cachedKeywords = BUNDLED_EXCLUSION_KEYWORDS;
  return cachedKeywords;
}


export interface ExclusionResult {
  isExcluded: boolean;
  matchedKeywords: string[];
  originalName: string;
}

/**
 * Check if a payee name contains any exclusion keywords
 * Uses simple contains matching - if ANY keyword is found, exclude the payee
 * No duplicates - each payee gets ONE result regardless of multiple keyword matches
 */
export function checkKeywordExclusion(
  payeeName: string, 
  exclusionKeywords: string[] = BUNDLED_EXCLUSION_KEYWORDS
): ExclusionResult {
  console.log(`[KEYWORD EXCLUSION] Testing "${payeeName}" against ${exclusionKeywords.length} keywords`);
  
  if (!payeeName || typeof payeeName !== 'string') {
    console.log(`[KEYWORD EXCLUSION] Invalid input: "${payeeName}"`);
    return {
      isExcluded: true,
      matchedKeywords: ['invalid-input'],
      originalName: payeeName
    };
  }

  const normalizedName = payeeName.toUpperCase().trim();
  console.log(`[KEYWORD EXCLUSION] Normalized name: "${normalizedName}"`);

  // Check each exclusion keyword - stop at first match to avoid duplicates
  for (const keyword of exclusionKeywords) {
    if (!keyword || typeof keyword !== 'string') continue;
    
    const normalizedKeyword = keyword.toUpperCase().trim();
    if (!normalizedKeyword) continue;

    // Simple contains matching
    if (normalizedName.includes(normalizedKeyword)) {
      console.log(`[KEYWORD EXCLUSION] MATCH FOUND! "${payeeName}" contains keyword "${keyword}"`);
      return {
        isExcluded: true,
        matchedKeywords: [keyword],
        originalName: payeeName
      };
    }
  }

  console.log(`[KEYWORD EXCLUSION] No match found for "${payeeName}"`);
  return {
    isExcluded: false,
    matchedKeywords: [],
    originalName: payeeName
  };
}

/**
 * Filter an array of payee names, separating excluded from valid ones
 * Ensures no duplicates in results
 */
export function filterPayeeNames(
  payeeNames: string[],
  exclusionKeywords: string[] = BUNDLED_EXCLUSION_KEYWORDS
): {
  validNames: string[];
  excludedNames: Array<{ name: string; reason: string[] }>;
} {
  const validNames: string[] = [];
  const excludedNames: Array<{ name: string; reason: string[] }> = [];
  const processedNames = new Set<string>(); // Prevent duplicates

  for (const name of payeeNames) {
    // Skip if we've already processed this exact name
    if (processedNames.has(name)) {
      continue;
    }
    processedNames.add(name);

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
 * Get the comprehensive exclusion keywords
 */
export function getComprehensiveExclusionKeywords(): string[] {
  return [...BUNDLED_EXCLUSION_KEYWORDS];
}

/**
 * Validate exclusion keywords array
 */
export function validateExclusionKeywords(keywords: string[]): string[] {
  if (!Array.isArray(keywords)) {
    console.warn('[EXCLUSION] Invalid keywords array, using comprehensive list');
    return BUNDLED_EXCLUSION_KEYWORDS;
  }

  return keywords
    .filter(keyword => keyword && typeof keyword === 'string' && keyword.trim())
    .map(keyword => keyword.trim());
}
