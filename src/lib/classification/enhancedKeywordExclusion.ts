
import { KeywordExclusionResult, SimilarityScores } from '../types';
import { calculateCombinedSimilarity, advancedNormalization } from './stringMatching';

/**
 * Key used to store exclusion keywords in localStorage
 */
export const EXCLUDED_KEYWORDS_STORAGE_KEY = 'excludedKeywords';

// Load exclusion keywords from localStorage
function getExclusionKeywords(): string[] {
  try {
    const stored = localStorage.getItem(EXCLUDED_KEYWORDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load exclusion keywords:', error);
    return [];
  }
}

/**
 * Enhanced keyword exclusion with similarity matching and detailed results
 */
export function checkKeywordExclusion(payeeName: string): KeywordExclusionResult {
  const exclusionKeywords = getExclusionKeywords();
  
  if (exclusionKeywords.length === 0) {
    return {
      isExcluded: false,
      matchedKeywords: [],
      confidence: 0,
      reasoning: 'No exclusion keywords configured'
    };
  }
  
  const { normalized, tokens } = advancedNormalization(payeeName);
  const matchedKeywords: string[] = [];
  const similarities: Array<{ keyword: string; similarity: number; scores: SimilarityScores }> = [];
  
  // Check for exact matches first
  for (const keyword of exclusionKeywords) {
    const normalizedKeyword = keyword.toUpperCase().trim();
    
    // Exact match in normalized name
    if (normalized.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
      continue;
    }
    
    // Token-level exact match
    if (tokens.some(token => token === normalizedKeyword)) {
      matchedKeywords.push(keyword);
      continue;
    }
    
    // Fuzzy matching for partial matches
    const similarity = calculateCombinedSimilarity(normalized, normalizedKeyword);
    if (similarity.combined >= 85) { // High similarity threshold for exclusions
      similarities.push({ keyword, similarity: similarity.combined, scores: similarity });
    }
    
    // Check individual tokens for fuzzy matches
    for (const token of tokens) {
      const tokenSimilarity = calculateCombinedSimilarity(token, normalizedKeyword);
      if (tokenSimilarity.combined >= 90) { // Very high threshold for token matches
        similarities.push({ keyword, similarity: tokenSimilarity.combined, scores: tokenSimilarity });
      }
    }
  }
  
  // Add fuzzy matches to matched keywords
  similarities.forEach(({ keyword }) => {
    if (!matchedKeywords.includes(keyword)) {
      matchedKeywords.push(keyword);
    }
  });
  
  const isExcluded = matchedKeywords.length > 0;
  const confidence = isExcluded ? Math.max(
    ...similarities.map(s => s.similarity),
    matchedKeywords.length > similarities.length ? 100 : 0 // 100% for exact matches
  ) : 0;
  
  let reasoning = '';
  if (isExcluded) {
    const exactMatches = matchedKeywords.filter(k => 
      !similarities.some(s => s.keyword === k)
    );
    const fuzzyMatches = similarities.map(s => 
      `${s.keyword} (${s.similarity.toFixed(1)}% similar)`
    );
    
    const parts = [];
    if (exactMatches.length > 0) {
      parts.push(`Exact matches: ${exactMatches.join(', ')}`);
    }
    if (fuzzyMatches.length > 0) {
      parts.push(`Fuzzy matches: ${fuzzyMatches.join(', ')}`);
    }
    
    reasoning = `Excluded due to keyword matches - ${parts.join('; ')}`;
  } else {
    reasoning = 'No exclusion keywords matched';
  }
  
  return {
    isExcluded,
    matchedKeywords,
    confidence,
    reasoning
  };
}

/**
 * Bulk keyword exclusion check for batch processing
 */
export function bulkKeywordExclusion(payeeNames: string[]): Map<string, KeywordExclusionResult> {
  const results = new Map<string, KeywordExclusionResult>();
  
  for (const name of payeeNames) {
    results.set(name, checkKeywordExclusion(name));
  }
  
  return results;
}
