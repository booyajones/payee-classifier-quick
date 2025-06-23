
import { ClassificationResult } from '../types';
import { 
  LEGAL_SUFFIXES, 
  BUSINESS_KEYWORDS, 
  INDUSTRY_IDENTIFIERS, 
  PROFESSIONAL_TITLES 
} from './config';

/**
 * FIXED rule-based classification - now detects obvious business patterns
 */
export async function applyRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  const name = payeeName.toUpperCase();
  const originalName = payeeName;
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  console.log(`[RULE-BASED-FIXED] Analyzing "${payeeName}"`);

  // CRITICAL: Obvious business patterns (HIGHEST PRIORITY)
  
  // 1. ALL CAPS ACRONYMS (like AAARP)
  if (/^[A-Z]{2,8}$/.test(originalName) && originalName.length >= 3) {
    businessScore += 150;
    matchingRules.push("All-caps acronym pattern (obvious business)");
    console.log(`[RULE-BASED-FIXED] ACRONYM DETECTED: ${originalName}`);
  }

  // 2. HYPHENATED BUSINESS NAMES (like ACE-ATlas)
  if (originalName.includes('-') && !/^[A-Z][a-z]+-[A-Z][a-z]+$/.test(originalName)) {
    businessScore += 140;
    matchingRules.push("Hyphenated business name pattern");
    console.log(`[RULE-BASED-FIXED] HYPHENATED BUSINESS: ${originalName}`);
  }

  // 3. MIXED CASE COMPOUND WORDS (like ReadyRefresh)
  if (/^[A-Z][a-z]+[A-Z][a-z]+$/.test(originalName) && originalName.length > 6) {
    businessScore += 130;
    matchingRules.push("Compound business name (CamelCase)");
    console.log(`[RULE-BASED-FIXED] COMPOUND BUSINESS: ${originalName}`);
  }

  // 4. Service business patterns (A-1 Express Locksmith)
  if (/^[A-Z]-?\d+\s+.*\s+(LOCKSMITH|EXPRESS|AUTO|REPAIR|SERVICE|PLUMBING|ELECTRICAL)/.test(name)) {
    businessScore += 130;
    matchingRules.push("Service business pattern (Letter-Number + Service)");
    console.log(`[RULE-BASED-FIXED] SERVICE PATTERN: ${payeeName}`);
  }

  // 5. ALPHANUMERIC PATTERNS (like A-1, 24-7)
  if (/^[A-Z]-?\d+/.test(originalName) || /^\d+-[A-Z]/.test(originalName)) {
    businessScore += 120;
    matchingRules.push("Alphanumeric business identifier");
    console.log(`[RULE-BASED-FIXED] ALPHANUMERIC: ${originalName}`);
  }

  // Legal suffixes (very high confidence)
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      businessScore += 110;
      matchingRules.push(`Legal suffix: ${suffix}`);
      break;
    }
  }

  // Service business keywords (aggressive scoring)
  const serviceKeywords = ['LOCKSMITH', 'EXPRESS', 'AUTO', 'REPAIR', 'PLUMBING', 'ELECTRICAL', 'ROOFING', 'CLEANING', 'SECURITY', 'ALARM', 'EMERGENCY'];
  for (const keyword of serviceKeywords) {
    if (name.includes(keyword)) {
      businessScore += 100;
      matchingRules.push(`Service business keyword: ${keyword}`);
      console.log(`[RULE-BASED-FIXED] SERVICE KEYWORD: ${keyword}`);
      break;
    }
  }

  // Business keywords
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      businessScore += 85;
      matchingRules.push(`Business keyword: ${keyword}`);
      break;
    }
  }

  // Industry identifiers
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        businessScore += 95;
        matchingRules.push(`Industry identifier (${industry}): ${keyword}`);
        break;
      }
    }
    if (businessScore > 80) break;
  }

  // Multi-word business logic
  if (words.length >= 3) {
    businessScore += 75;
    matchingRules.push("Multi-word business name pattern");
  }

  // Professional titles (for individuals) - ONLY if no business indicators
  if (businessScore < 50) {
    for (const title of PROFESSIONAL_TITLES) {
      const titleRegex = new RegExp(`\\b${title}\\b`, 'i');
      if (titleRegex.test(name)) {
        individualScore += 85;
        matchingRules.push(`Professional title: ${title}`);
        break;
      }
    }

    // Simple name patterns (for individuals) - only if no business indicators
    const namePattern = /^[A-Za-z]+\s+[A-Za-z]+$/;
    if (namePattern.test(originalName) && words.length === 2) {
      individualScore += 80;
      matchingRules.push("Simple two-word personal name pattern");
    }
  }

  console.log(`[RULE-BASED-FIXED] Scores - Business: ${businessScore}, Individual: ${individualScore}`);

  // AGGRESSIVE decision logic with high confidence
  if (businessScore >= 50) {
    const confidence = Math.min(98, Math.max(85, 80 + businessScore * 0.12));
    console.log(`[RULE-BASED-FIXED] BUSINESS: ${Math.round(confidence)}%`);
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
