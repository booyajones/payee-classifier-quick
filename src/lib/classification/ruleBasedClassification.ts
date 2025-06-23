
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
 * FIXED rule-based classification with proper business detection
 */
export async function applyRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  const name = payeeName.toUpperCase();
  const originalName = payeeName;
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  console.log(`[RULE-BASED] Analyzing "${payeeName}"`);

  // CRITICAL FIX: A-1 Express Locksmith pattern detection
  if (/^[A-Z]-?\d+\s+.*\s+(LOCKSMITH|EXPRESS|AUTO|REPAIR|SERVICE|PLUMBING|ELECTRICAL)/.test(name)) {
    businessScore += 90;
    matchingRules.push("Strong business pattern: Letter-Number + Service Type");
    console.log(`[RULE-BASED] STRONG BUSINESS PATTERN DETECTED: ${payeeName}`);
  }

  // Service business keywords (highest priority)
  const serviceKeywords = ['LOCKSMITH', 'EXPRESS', 'AUTO', 'REPAIR', 'PLUMBING', 'ELECTRICAL', 'ROOFING', 'CLEANING'];
  for (const keyword of serviceKeywords) {
    if (name.includes(keyword)) {
      businessScore += 80;
      matchingRules.push(`Service business keyword: ${keyword}`);
      console.log(`[RULE-BASED] SERVICE KEYWORD FOUND: ${keyword}`);
      break;
    }
  }

  // Legal suffixes
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      businessScore += 85;
      matchingRules.push(`Legal suffix: ${suffix}`);
      break;
    }
  }

  // Business keywords
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      businessScore += 60;
      matchingRules.push(`Business keyword: ${keyword}`);
      break;
    }
  }

  // Industry identifiers
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        businessScore += 70;
        matchingRules.push(`Industry identifier (${industry}): ${keyword}`);
        break;
      }
    }
    if (businessScore > 60) break;
  }

  // Professional titles (for individuals)
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b`, 'i');
    if (titleRegex.test(name)) {
      individualScore += 70;
      matchingRules.push(`Professional title: ${title}`);
      break;
    }
  }

  // Simple name patterns (for individuals) - but only if no business indicators
  if (businessScore < 30) {
    const namePattern = /^[A-Za-z]+\s+[A-Za-z]+$/;
    if (namePattern.test(originalName) && words.length === 2) {
      individualScore += 60;
      matchingRules.push("Simple two-word personal name pattern");
    }
  }

  console.log(`[RULE-BASED] Scores - Business: ${businessScore}, Individual: ${individualScore}`);

  // FIXED decision logic
  if (businessScore >= 60) {
    const confidence = Math.min(95, 70 + businessScore * 0.3);
    console.log(`[RULE-BASED] BUSINESS CLASSIFICATION: ${confidence}%`);
    return {
      classification: 'Business',
      confidence: Math.round(confidence),
      reasoning: `Business classification based on: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  if (individualScore >= 60) {
    const confidence = Math.min(95, 70 + individualScore * 0.3);
    return {
      classification: 'Individual',
      confidence: Math.round(confidence),
      reasoning: `Individual classification based on: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  // If no strong indicators, return null to try next tier
  return null;
}
