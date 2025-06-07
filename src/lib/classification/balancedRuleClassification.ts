
import { ClassificationResult } from '../types';
import { LEGAL_SUFFIXES, BUSINESS_KEYWORDS, INDUSTRY_IDENTIFIERS, GOVERNMENT_PATTERNS, PROFESSIONAL_TITLES } from './config';

/**
 * Balanced rule-based classification that doesn't over-classify as business
 */
export async function balancedRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  // Strong business indicators (high confidence)
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      matchingRules.push(`Legal suffix: ${suffix}`);
      businessScore += 40; // Strong indicator
      break;
    }
  }

  // Professional titles (strong individual indicators)
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b|\\b${title}[.,]`, 'i');
    if (titleRegex.test(name)) {
      matchingRules.push(`Professional title: ${title}`);
      individualScore += 35; // Strong indicator
      break;
    }
  }

  // Business keywords (moderate indicators)
  let businessKeywordCount = 0;
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      matchingRules.push(`Business keyword: ${keyword}`);
      businessScore += 15; // Moderate indicator
      businessKeywordCount++;
      if (businessKeywordCount >= 2) break; // Don't over-score
    }
  }

  // Government patterns
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (name.includes(pattern)) {
      matchingRules.push(`Government entity: ${pattern}`);
      businessScore += 30;
      break;
    }
  }

  // Industry identifiers (more conservative)
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchingRules.push(`Industry term (${industry}): ${keyword}`);
        businessScore += 10; // Lower score, more conservative
        break;
      }
    }
  }

  // Individual name patterns (improved detection)
  const simpleNamePattern = /^[A-Za-z]+\s+[A-Za-z]+$/; // First Last
  const nameWithMiddlePattern = /^[A-Za-z]+\s+[A-Za-z]\s+[A-Za-z]+$/; // First Middle Last
  const nameWithMiddleInitialPattern = /^[A-Za-z]+\s+[A-Za-z]\.\s+[A-Za-z]+$/; // First M. Last
  const lastFirstPattern = /^[A-Za-z]+,\s*[A-Za-z]+$/; // Last, First

  if (simpleNamePattern.test(payeeName) || 
      nameWithMiddlePattern.test(payeeName) ||
      nameWithMiddleInitialPattern.test(payeeName) ||
      lastFirstPattern.test(payeeName)) {
    matchingRules.push("Standard personal name pattern");
    individualScore += 25;
  }

  // Possessive forms typically indicate individuals
  if (/'\s*s\b/.test(payeeName)) {
    matchingRules.push("Possessive form (individual proprietor)");
    individualScore += 20;
  }

  // More conservative business indicators
  if (words.length >= 4 && businessScore > 0) {
    matchingRules.push("Multi-word business name with business indicators");
    businessScore += 10;
  }

  // Only classify if we have strong confidence
  const minConfidenceThreshold = 30;
  
  if (businessScore >= minConfidenceThreshold && businessScore > individualScore) {
    const confidence = Math.min(95, 60 + businessScore);
    return {
      classification: 'Business',
      confidence,
      reasoning: `Balanced classification as business: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  } else if (individualScore >= minConfidenceThreshold && individualScore > businessScore) {
    const confidence = Math.min(95, 60 + individualScore);
    return {
      classification: 'Individual',
      confidence,
      reasoning: `Balanced classification as individual: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  // If scores are close or below threshold, return null to escalate to AI
  return null;
}
