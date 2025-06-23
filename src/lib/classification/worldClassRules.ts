
import { ClassificationResult } from '../types';

/**
 * World-class deterministic classification engine
 * Implements advanced pattern recognition, weighted scoring, and performance optimizations
 */

// Trie data structure for O(1) keyword lookups
class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord = false;
  keyword = '';
  weight = 0;
  category = '';
}

class KeywordTrie {
  private root = new TrieNode();
  private compiledPatterns = new Map<string, RegExp>();

  insert(keyword: string, weight: number, category: string) {
    let current = this.root;
    const normalizedKeyword = keyword.toUpperCase();
    
    for (const char of normalizedKeyword) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    
    current.isEndOfWord = true;
    current.keyword = keyword;
    current.weight = weight;
    current.category = category;
  }

  search(text: string): Array<{ keyword: string; weight: number; category: string }> {
    const matches: Array<{ keyword: string; weight: number; category: string }> = [];
    const normalizedText = text.toUpperCase();
    
    for (let i = 0; i < normalizedText.length; i++) {
      let current = this.root;
      let j = i;
      
      while (j < normalizedText.length && current.children.has(normalizedText[j])) {
        current = current.children.get(normalizedText[j])!;
        j++;
        
        if (current.isEndOfWord) {
          matches.push({
            keyword: current.keyword,
            weight: current.weight,
            category: current.category
          });
        }
      }
    }
    
    return matches;
  }

  getCompiledPattern(pattern: string): RegExp {
    if (!this.compiledPatterns.has(pattern)) {
      this.compiledPatterns.set(pattern, new RegExp(pattern, 'gi'));
    }
    return this.compiledPatterns.get(pattern)!;
  }
}

// Global keyword trie instances
const businessTrie = new KeywordTrie();
const individualTrie = new KeywordTrie();

// Initialize business keywords with weights
const BUSINESS_KEYWORDS_WEIGHTED = [
  // Legal suffixes (highest weight)
  { keyword: 'LLC', weight: 95, category: 'legal_suffix' },
  { keyword: 'INC', weight: 95, category: 'legal_suffix' },
  { keyword: 'CORP', weight: 95, category: 'legal_suffix' },
  { keyword: 'CORPORATION', weight: 95, category: 'legal_suffix' },
  { keyword: 'LTD', weight: 95, category: 'legal_suffix' },
  { keyword: 'LIMITED', weight: 95, category: 'legal_suffix' },
  { keyword: 'COMPANY', weight: 85, category: 'legal_suffix' },
  { keyword: 'CO', weight: 75, category: 'legal_suffix' },
  
  // Business activity terms (high weight)
  { keyword: 'SERVICES', weight: 80, category: 'business_activity' },
  { keyword: 'SOLUTIONS', weight: 80, category: 'business_activity' },
  { keyword: 'CONSULTING', weight: 80, category: 'business_activity' },
  { keyword: 'MANAGEMENT', weight: 75, category: 'business_activity' },
  { keyword: 'SYSTEMS', weight: 75, category: 'business_activity' },
  { keyword: 'TECHNOLOGIES', weight: 75, category: 'business_activity' },
  { keyword: 'ENTERPRISES', weight: 75, category: 'business_activity' },
  { keyword: 'GROUP', weight: 70, category: 'business_activity' },
  { keyword: 'HOLDINGS', weight: 70, category: 'business_activity' },
  { keyword: 'PARTNERS', weight: 70, category: 'business_activity' },
  { keyword: 'ASSOCIATES', weight: 70, category: 'business_activity' },
  
  // Industry-specific terms (medium-high weight)
  { keyword: 'CONSTRUCTION', weight: 85, category: 'industry' },
  { keyword: 'MANUFACTURING', weight: 85, category: 'industry' },
  { keyword: 'ENGINEERING', weight: 85, category: 'industry' },
  { keyword: 'MEDICAL', weight: 80, category: 'industry' },
  { keyword: 'DENTAL', weight: 80, category: 'industry' },
  { keyword: 'HEALTHCARE', weight: 80, category: 'industry' },
  { keyword: 'FINANCIAL', weight: 80, category: 'industry' },
  { keyword: 'INSURANCE', weight: 80, category: 'industry' },
  { keyword: 'RESTAURANT', weight: 75, category: 'industry' },
  { keyword: 'RETAIL', weight: 75, category: 'industry' },
  { keyword: 'WHOLESALE', weight: 75, category: 'industry' },
  
  // Descriptive business terms (medium weight)
  { keyword: 'PROFESSIONAL', weight: 65, category: 'descriptor' },
  { keyword: 'COMMERCIAL', weight: 65, category: 'descriptor' },
  { keyword: 'INDUSTRIAL', weight: 65, category: 'descriptor' },
  { keyword: 'INTERNATIONAL', weight: 60, category: 'descriptor' },
  { keyword: 'GLOBAL', weight: 60, category: 'descriptor' },
  { keyword: 'NATIONAL', weight: 60, category: 'descriptor' },
  { keyword: 'REGIONAL', weight: 55, category: 'descriptor' },
  { keyword: 'LOCAL', weight: 50, category: 'descriptor' }
];

// Initialize individual keywords with weights
const INDIVIDUAL_KEYWORDS_WEIGHTED = [
  // Professional titles (high weight)
  { keyword: 'DR', weight: 90, category: 'title' },
  { keyword: 'DOCTOR', weight: 90, category: 'title' },
  { keyword: 'MD', weight: 90, category: 'title' },
  { keyword: 'PHD', weight: 85, category: 'title' },
  { keyword: 'PROF', weight: 85, category: 'title' },
  { keyword: 'PROFESSOR', weight: 85, category: 'title' },
  { keyword: 'MR', weight: 80, category: 'title' },
  { keyword: 'MRS', weight: 80, category: 'title' },
  { keyword: 'MS', weight: 80, category: 'title' },
  { keyword: 'MISS', weight: 80, category: 'title' },
  
  // Name suffixes (high weight)
  { keyword: 'JR', weight: 85, category: 'suffix' },
  { keyword: 'SR', weight: 85, category: 'suffix' },
  { keyword: 'III', weight: 85, category: 'suffix' },
  { keyword: 'IV', weight: 80, category: 'suffix' },
  { keyword: 'ESQ', weight: 80, category: 'suffix' },
  
  // Religious/professional titles (medium-high weight)
  { keyword: 'REV', weight: 75, category: 'title' },
  { keyword: 'PASTOR', weight: 75, category: 'title' },
  { keyword: 'RABBI', weight: 75, category: 'title' },
  { keyword: 'FATHER', weight: 75, category: 'title' },
  { keyword: 'SISTER', weight: 75, category: 'title' }
];

// Initialize tries
BUSINESS_KEYWORDS_WEIGHTED.forEach(item => {
  businessTrie.insert(item.keyword, item.weight, item.category);
});

INDIVIDUAL_KEYWORDS_WEIGHTED.forEach(item => {
  individualTrie.insert(item.keyword, item.weight, item.category);
});

/**
 * Advanced string similarity using Jaro-Winkler algorithm
 */
function jaroWinklerSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Identify matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Advanced normalization with smart tokenization
 */
function advancedNormalization(text: string): {
  normalized: string;
  tokens: string[];
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  isAllCaps: boolean;
  wordCount: number;
} {
  // Normalize Unicode characters
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  
  // Smart tokenization - preserve meaningful punctuation
  const tokens = normalized.split(/[\s,.-]+/).filter(token => token.length > 0);
  
  const hasNumbers = /\d/.test(normalized);
  const hasSpecialChars = /[&@#$%^*()+=\[\]{}|\\:";'<>?,./]/.test(normalized);
  const isAllCaps = text === text.toUpperCase() && text.length > 3;
  const wordCount = tokens.length;
  
  return {
    normalized,
    tokens,
    hasNumbers,
    hasSpecialChars,
    isAllCaps,
    wordCount
  };
}

/**
 * Context-aware weighted scoring with exponential rule combinations
 */
function calculateAdvancedScore(
  payeeName: string,
  keywordMatches: Array<{ keyword: string; weight: number; category: string }>,
  structuralFeatures: ReturnType<typeof advancedNormalization>
): { score: number; reasoning: string[]; confidence: number } {
  let baseScore = 0;
  const reasoning: string[] = [];
  
  // Keyword-based scoring with category bonuses
  const categoryWeights = new Map<string, number>();
  
  keywordMatches.forEach(match => {
    baseScore += match.weight;
    reasoning.push(`${match.category}: ${match.keyword} (+${match.weight})`);
    
    const currentWeight = categoryWeights.get(match.category) || 0;
    categoryWeights.set(match.category, currentWeight + match.weight);
  });
  
  // Exponential bonuses for multiple categories
  if (categoryWeights.size > 1) {
    const categoryBonus = Math.pow(categoryWeights.size, 1.5) * 10;
    baseScore += categoryBonus;
    reasoning.push(`Multi-category bonus: +${categoryBonus.toFixed(1)}`);
  }
  
  // Context-aware structural bonuses
  if (structuralFeatures.isAllCaps && structuralFeatures.wordCount > 2) {
    baseScore += 15;
    reasoning.push('All-caps multi-word pattern (+15)');
  }
  
  if (structuralFeatures.hasNumbers && keywordMatches.some(m => m.category === 'legal_suffix')) {
    baseScore += 20;
    reasoning.push('Numbers + legal suffix combination (+20)');
  }
  
  if (structuralFeatures.hasSpecialChars) {
    baseScore += 10;
    reasoning.push('Special characters (+10)');
  }
  
  // Length-based scoring
  if (payeeName.length > 25) {
    baseScore += 8;
    reasoning.push('Long name pattern (+8)');
  }
  
  // Calculate confidence with diminishing returns
  let confidence = Math.min(98, baseScore);
  
  // Apply confidence calibration
  if (confidence > 90) {
    confidence = 90 + (confidence - 90) * 0.5; // Reduce overconfidence
  }
  
  return { score: baseScore, reasoning, confidence };
}

/**
 * Pattern-based individual name detection
 */
function detectIndividualPatterns(payeeName: string): { score: number; patterns: string[] } {
  let score = 0;
  const patterns: string[] = [];
  
  // Name pattern detection with regex
  const namePatterns = [
    { pattern: /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, score: 40, desc: 'First Last pattern' },
    { pattern: /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+$/, score: 45, desc: 'First M. Last pattern' },
    { pattern: /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/, score: 35, desc: 'First Middle Last pattern' },
    { pattern: /^[A-Z][a-z]+,\s*[A-Z][a-z]+$/, score: 45, desc: 'Last, First pattern' },
    { pattern: /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+(Jr|Sr|III|IV)\.?$/i, score: 50, desc: 'Name with generational suffix' }
  ];
  
  for (const { pattern, score: patternScore, desc } of namePatterns) {
    if (pattern.test(payeeName)) {
      score += patternScore;
      patterns.push(desc);
      break; // Only count first matching pattern
    }
  }
  
  // Possessive form detection
  if (/'\s*s\b/.test(payeeName)) {
    score += 30;
    patterns.push('Possessive form (individual proprietor)');
  }
  
  return { score, patterns };
}

/**
 * World-class deterministic classification engine
 */
export async function worldClassClassification(payeeName: string): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: 'Empty or invalid payee name',
      processingTier: 'Rule-Based',
      processingMethod: 'World-class deterministic engine'
    };
  }
  
  console.log(`[WORLD-CLASS] Classifying "${payeeName}"`);
  
  // Advanced normalization
  const features = advancedNormalization(payeeName);
  
  // Business keyword matching with Trie
  const businessMatches = businessTrie.search(payeeName);
  const businessScore = calculateAdvancedScore(payeeName, businessMatches, features);
  
  // Individual keyword matching with Trie
  const individualMatches = individualTrie.search(payeeName);
  const individualKeywordScore = calculateAdvancedScore(payeeName, individualMatches, features);
  
  // Individual pattern detection
  const individualPatterns = detectIndividualPatterns(payeeName);
  const totalIndividualScore = {
    score: individualKeywordScore.score + individualPatterns.score,
    reasoning: [...individualKeywordScore.reasoning, ...individualPatterns.patterns],
    confidence: Math.min(98, individualKeywordScore.confidence + individualPatterns.score * 0.5)
  };
  
  // Early exit for high-confidence classifications
  if (businessScore.confidence >= 95) {
    return {
      classification: 'Business',
      confidence: businessScore.confidence,
      reasoning: `High-confidence business classification: ${businessScore.reasoning.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: businessScore.reasoning,
      processingMethod: 'World-class deterministic engine (early exit)'
    };
  }
  
  if (totalIndividualScore.confidence >= 95) {
    return {
      classification: 'Individual',
      confidence: totalIndividualScore.confidence,
      reasoning: `High-confidence individual classification: ${totalIndividualScore.reasoning.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: totalIndividualScore.reasoning,
      processingMethod: 'World-class deterministic engine (early exit)'
    };
  }
  
  // Determine final classification
  const finalClassification = businessScore.score > totalIndividualScore.score ? 'Business' : 'Individual';
  const winningScore = finalClassification === 'Business' ? businessScore : totalIndividualScore;
  const losingScore = finalClassification === 'Business' ? totalIndividualScore.score : businessScore.score;
  
  // Calculate confidence with margin consideration
  const scoreDifference = Math.abs(winningScore.score - losingScore);
  const baseConfidence = Math.min(95, winningScore.confidence);
  const marginBonus = Math.min(10, scoreDifference * 0.2);
  const finalConfidence = Math.min(98, baseConfidence + marginBonus);
  
  console.log(`[WORLD-CLASS] "${payeeName}" -> ${finalClassification} (${finalConfidence.toFixed(1)}%)`);
  
  return {
    classification: finalClassification,
    confidence: Math.round(finalConfidence),
    reasoning: `World-class classification as ${finalClassification} (score: ${winningScore.score.toFixed(1)} vs ${losingScore.toFixed(1)}). Rules: ${winningScore.reasoning.join(', ')}`,
    processingTier: 'Rule-Based',
    matchingRules: winningScore.reasoning,
    processingMethod: 'World-class deterministic engine'
  };
}
