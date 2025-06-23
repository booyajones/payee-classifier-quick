
import { ClassificationResult } from '../types';
import { probablepeople } from './probablepeople';
import { 
  LEGAL_SUFFIXES, 
  BUSINESS_KEYWORDS, 
  INDUSTRY_IDENTIFIERS, 
  GOVERNMENT_PATTERNS, 
  PROFESSIONAL_TITLES 
} from './config';

/**
 * Enhanced rule-based classification with improved business pattern detection
 */
export async function applyRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  // Convert to uppercase for consistent matching
  const name = payeeName.toUpperCase();
  const originalName = payeeName;
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let isBusinessIndicator = false;
  let isIndividualIndicator = false;
  let confidenceBoost = 0;

  // Use probablepeople to parse the name if available
  const parsedResult = probablepeople.tag(payeeName);
  if (parsedResult) {
    // If probablepeople confidently identifies the type
    if (parsedResult.type === 'Person') {
      matchingRules.push("Identified as person by name structure analysis");
      isIndividualIndicator = true;
      confidenceBoost += 15;
    } else if (parsedResult.type === 'Corporation') {
      matchingRules.push("Identified as corporation by name structure analysis");
      isBusinessIndicator = true;
      confidenceBoost += 15;
    }
  }

  // ENHANCED: Check for business number-letter patterns like "A-1", "24/7", "AAA", etc.
  const businessNumberPatterns = [
    /\b[A-Z]-\d+\b/,          // A-1, B-2, etc.
    /\b\d+-[A-Z]\b/,          // 1-A, 2-B, etc.
    /\b[A-Z]{2,3}\b/,         // AAA, ABC, etc. (2-3 letter abbreviations)
    /\b\d+\/\d+\b/,           // 24/7, 365/24, etc.
    /\b\d+[A-Z]+\b/,          // 24HR, 1ST, etc.
    /\b[A-Z]+\d+\b/           // ABC123, etc.
  ];

  for (const pattern of businessNumberPatterns) {
    if (pattern.test(name)) {
      matchingRules.push("Business alphanumeric pattern detected");
      isBusinessIndicator = true;
      confidenceBoost += 20;
      break;
    }
  }

  // Check for legal suffixes with enhanced matching
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      matchingRules.push(`Legal suffix: ${suffix}`);
      isBusinessIndicator = true;
      confidenceBoost += 25;
      break;
    }
  }

  // ENHANCED: Check for business keywords with higher precision
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      matchingRules.push(`Business keyword: ${keyword}`);
      isBusinessIndicator = true;
      // Higher boost for strong business indicators
      if (['LOCKSMITH', 'EXPRESS', 'AUTO', 'REPAIR', 'SERVICES', 'SOLUTIONS'].includes(keyword)) {
        confidenceBoost += 30;
      } else {
        confidenceBoost += 20;
      }
      break;
    }
  }

  // Check for industry-specific identifiers with enhanced scoring
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchingRules.push(`Industry identifier (${industry}): ${keyword}`);
        isBusinessIndicator = true;
        confidenceBoost += 25;
        break;
      }
    }
    if (isBusinessIndicator) break;
  }

  // Check for government entity patterns
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (name.includes(pattern)) {
      matchingRules.push(`Government entity pattern: ${pattern}`);
      isBusinessIndicator = true;
      confidenceBoost += 20;
      break;
    }
  }

  // Check for professional titles (indicating individuals)
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b|\\b${title}[.,]`, 'i');
    if (titleRegex.test(name)) {
      matchingRules.push(`Professional title: ${title}`);
      isIndividualIndicator = true;
      confidenceBoost += 20;
      break;
    }
  }

  // ENHANCED: Business name patterns with higher confidence
  // Pattern: [Prefix][Number/Letter]-[Descriptor] [Service Type]
  if (/^[A-Z]-?\d+\s+\w+\s+\w+/.test(name)) {
    matchingRules.push("Business naming pattern: Prefix-Number + Service Type");
    isBusinessIndicator = true;
    confidenceBoost += 35;
  }

  // Check for "LLC" pattern at the end (very strong business indicator)
  if (/LLC\s*$/.test(name)) {
    matchingRules.push("Ends with LLC");
    isBusinessIndicator = true;
    confidenceBoost += 40;
  }
  
  // ENHANCED: All caps names are often businesses, but be more specific
  if (originalName === originalName.toUpperCase() && originalName.length > 5 && !/[a-z]/.test(originalName)) {
    // But not if it's a simple two-word name that could be a person
    if (words.length > 2 || words.some(word => word.length > 8)) {
      matchingRules.push("Name in ALL CAPS (typical of businesses)");
      isBusinessIndicator = true;
      confidenceBoost += 15;
    }
  }

  // ENHANCED: Simple name pattern detection for individuals with better logic
  if (!isBusinessIndicator) {
    const namePattern = /^[A-Za-z]+\s+[A-Za-z]+$/; // Simple First Last pattern
    const nameWithMiddlePattern = /^[A-Za-z]+\s+[A-Za-z]\s+[A-Za-z]+$/; // First Middle Last
    const nameWithMiddleInitialPattern = /^[A-Za-z]+\s+[A-Za-z]\.\s+[A-Za-z]+$/; // First M. Last
    const lastFirstPattern = /^[A-Za-z]+,\s*[A-Za-z]+$/; // Last, First

    if (
      namePattern.test(originalName) ||
      nameWithMiddlePattern.test(originalName) ||
      nameWithMiddleInitialPattern.test(originalName) ||
      lastFirstPattern.test(originalName)
    ) {
      // Additional check: make sure it doesn't contain obvious business terms
      const hasBusinessTerms = BUSINESS_KEYWORDS.some(keyword => name.includes(keyword));
      if (!hasBusinessTerms) {
        matchingRules.push("Individual name pattern detected");
        isIndividualIndicator = true;
        confidenceBoost += 25;
      }
    }
  }

  // Calculate final confidence with enhanced scoring
  let baseConfidence = 70;
  if (isBusinessIndicator && !isIndividualIndicator) {
    const finalConfidence = Math.min(95, baseConfidence + confidenceBoost);
    return {
      classification: 'Business',
      confidence: finalConfidence,
      reasoning: `Classified as business based on ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  } else if (isIndividualIndicator && !isBusinessIndicator) {
    const finalConfidence = Math.min(95, baseConfidence + confidenceBoost);
    return {
      classification: 'Individual',
      confidence: finalConfidence,
      reasoning: `Classified as individual based on ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  // If conflicting or no clear indicators, return null to try the next tier
  return null;
}
