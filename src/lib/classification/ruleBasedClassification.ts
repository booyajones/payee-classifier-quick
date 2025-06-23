
import { ClassificationResult } from '../types';
import { 
  LEGAL_SUFFIXES, 
  BUSINESS_KEYWORDS, 
  INDUSTRY_IDENTIFIERS, 
  PROFESSIONAL_TITLES 
} from './config';

/**
 * AGGRESSIVE rule-based classification with high confidence scoring
 */
export async function applyRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  const name = payeeName.toUpperCase();
  const originalName = payeeName;
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  console.log(`[RULE-BASED] Analyzing "${payeeName}"`);

  // CRITICAL: A-1 Express Locksmith pattern detection (highest priority)
  if (/^[A-Z]-?\d+\s+.*\s+(LOCKSMITH|EXPRESS|AUTO|REPAIR|SERVICE|PLUMBING|ELECTRICAL)/.test(name)) {
    businessScore += 120; // Very high score
    matchingRules.push("Strong business pattern: Letter-Number + Service Type");
    console.log(`[RULE-BASED] STRONG BUSINESS PATTERN DETECTED: ${payeeName}`);
  }

  // Service business keywords (aggressive scoring)
  const serviceKeywords = ['LOCKSMITH', 'EXPRESS', 'AUTO', 'REPAIR', 'PLUMBING', 'ELECTRICAL', 'ROOFING', 'CLEANING', 'SECURITY', 'ALARM', 'EMERGENCY'];
  for (const keyword of serviceKeywords) {
    if (name.includes(keyword)) {
      businessScore += 100; // Very high for service keywords
      matchingRules.push(`Service business keyword: ${keyword}`);
      console.log(`[RULE-BASED] SERVICE KEYWORD FOUND: ${keyword}`);
      break;
    }
  }

  // Legal suffixes (very high confidence)
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      businessScore += 110; // Higher score
      matchingRules.push(`Legal suffix: ${suffix}`);
      break;
    }
  }

  // Business keywords (aggressive)
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      businessScore += 85; // Higher than before
      matchingRules.push(`Business keyword: ${keyword}`);
      break;
    }
  }

  // Industry identifiers (high confidence)
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        businessScore += 95; // Higher score
        matchingRules.push(`Industry identifier (${industry}): ${keyword}`);
        break;
      }
    }
    if (businessScore > 80) break;
  }

  // Compound business names (ReadyRefresh, ZillaState)
  if (words.length === 1 && originalName.length > 8 && /[a-z][A-Z]/.test(originalName)) {
    businessScore += 80;
    matchingRules.push("Compound business name pattern");
  }

  // Multi-word business logic
  if (words.length >= 3) {
    businessScore += 70; // Higher score
    matchingRules.push("Multi-word business name pattern");
  }

  // Professional titles (for individuals)
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b`, 'i');
    if (titleRegex.test(name)) {
      individualScore += 85; // Higher score
      matchingRules.push(`Professional title: ${title}`);
      break;
    }
  }

  // Simple name patterns (for individuals) - only if no business indicators
  if (businessScore < 40) {
    const namePattern = /^[A-Za-z]+\s+[A-Za-z]+$/;
    if (namePattern.test(originalName) && words.length === 2) {
      individualScore += 80; // Higher score
      matchingRules.push("Simple two-word personal name pattern");
    }
  }

  console.log(`[RULE-BASED] Scores - Business: ${businessScore}, Individual: ${individualScore}`);

  // AGGRESSIVE decision logic with high confidence
  if (businessScore >= 50) {
    const confidence = Math.min(98, Math.max(85, 80 + businessScore * 0.15));
    console.log(`[RULE-BASED] BUSINESS CLASSIFICATION: ${confidence}%`);
    return {
      classification: 'Business',
      confidence: Math.round(confidence),
      reasoning: `Business classification based on: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  if (individualScore >= 70) {
    const confidence = Math.min(95, Math.max(85, 80 + individualScore * 0.2));
    return {
      classification: 'Individual',
      confidence: Math.round(confidence),
      reasoning: `Individual classification based on: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules
    };
  }

  // Return null to try next tier if not confident enough
  return null;
}
