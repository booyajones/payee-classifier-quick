
import { ClassificationResult, ClassificationConfig, SimilarityScores } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { checkKeywordExclusion } from './enhancedKeywordExclusion';
import { calculateCombinedSimilarity, advancedNormalization, levenshteinSimilarity } from './stringMatching';
import { consensusClassification } from '../openai/enhancedClassification';

// Hard-coded confidence thresholds for intelligent escalation
const CONFIDENCE_THRESHOLDS = {
  HIGH_CONFIDENCE: 95,
  MEDIUM_CONFIDENCE: 85,
  REVIEW_REQUIRED: 75,
  ESCALATE_TO_AI: 65,
  FORCE_WEB_SEARCH: 50
};

// COMPREHENSIVE FIRST NAMES DATABASE - Critical for individual detection
const COMMON_FIRST_NAMES = [
  'JAMES', 'JOHN', 'ROBERT', 'MICHAEL', 'WILLIAM', 'DAVID', 'RICHARD', 'JOSEPH', 'THOMAS', 'CHARLES',
  'CHRISTOPHER', 'DANIEL', 'MATTHEW', 'ANTHONY', 'MARK', 'DONALD', 'STEVEN', 'PAUL', 'ANDREW', 'JOSHUA',
  'KENNETH', 'KEVIN', 'BRIAN', 'GEORGE', 'TIMOTHY', 'RONALD', 'JASON', 'EDWARD', 'JEFFREY', 'RYAN',
  'JACOB', 'GARY', 'NICHOLAS', 'ERIC', 'JONATHAN', 'STEPHEN', 'LARRY', 'JUSTIN', 'SCOTT', 'BRANDON',
  'BENJAMIN', 'SAMUEL', 'GREGORY', 'ALEXANDER', 'PATRICK', 'FRANK', 'RAYMOND', 'JACK', 'DENNIS', 'JERRY',
  'TYLER', 'AARON', 'JOSE', 'HENRY', 'ADAM', 'DOUGLAS', 'NATHAN', 'PETER', 'ZACHARY', 'KYLE',
  'NOAH', 'ALAN', 'ETHAN', 'JEREMY', 'LIONEL', 'ANGEL', 'MIKE', 'CHRIS', 'TOM', 'JIM', 'BOB', 'BILL',
  'STEVE', 'DAVE', 'MATT', 'JEFF', 'DAN', 'TONY', 'RICH', 'RICK', 'NICK', 'GREG', 'CARL', 'CHAD',
  
  'MARY', 'PATRICIA', 'LINDA', 'BARBARA', 'ELIZABETH', 'JENNIFER', 'MARIA', 'SUSAN', 'MARGARET', 'DOROTHY',
  'LISA', 'NANCY', 'KAREN', 'BETTY', 'HELEN', 'SANDRA', 'DONNA', 'CAROL', 'RUTH', 'SHARON',
  'MICHELLE', 'LAURA', 'SARAH', 'KIMBERLY', 'DEBORAH', 'JESSICA', 'SHIRLEY', 'CYNTHIA', 'ANGELA', 'MELISSA',
  'BRENDA', 'EMMA', 'OLIVIA', 'AMY', 'ANNA', 'REBECCA', 'VIRGINIA', 'KATHLEEN', 'PAMELA', 'MARTHA',
  'DEBRA', 'RACHEL', 'CAROLYN', 'JANET', 'CATHERINE', 'FRANCES', 'CHRISTINE', 'SAMANTHA', 'DEBBIE', 'RACHEL',
  'CHRISTINA', 'JACQUELINE', 'MARIE', 'JANET', 'ROSE', 'JEAN', 'JOYCE', 'JULIE', 'GLORIA', 'DIANA',
  'SUE', 'JANE', 'LYNN', 'ANNE', 'ANN', 'KATE', 'KIM', 'BETH', 'JEN', 'LIZ', 'CHRIS', 'PAT'
];

// Business entity indicators
const BUSINESS_SUFFIXES = [
  'LLC', 'INC', 'CORP', 'LTD', 'CO', 'COMPANY', 'CORPORATION', 'ENTERPRISES', 'GROUP', 'HOLDINGS',
  'PARTNERS', 'ASSOCIATES', 'SERVICES', 'SOLUTIONS', 'SYSTEMS', 'TECHNOLOGIES', 'CONSULTING'
];

const BUSINESS_KEYWORDS = [
  'AGENCY', 'STUDIO', 'MANAGEMENT', 'GRAPHICS', 'POOLS', 'TRAVEL', 'EVENTS', 'PLANNERS', 'MAINTENANCE',
  'DISTRIBUTORS', 'BAKERY', 'CREATIVE', 'ENDEAVOR', 'MECHANICAL', 'PRO', 'HVAC', 'RESOURCING', 'GAS',
  'LOCAL', 'CRUISE', 'DESIGNS', 'HATCHED', 'HOMEBOY', 'CITIZEN', 'MATTER', 'SURFACE', 'IMAGE', 'CURATED',
  'ENTERTAINMENT', 'AIR', 'ADVANCED', 'ADMIRAL', 'AV', 'EXPERT', 'LOCKSMITH', 'PLUMBING', 'ELECTRIC',
  'CONSTRUCTION', 'ROOFING', 'PAINTING', 'LANDSCAPING', 'CLEANING', 'REPAIR', 'AUTO', 'SHOP', 'STORE',
  'MARKET', 'RESTAURANT', 'CAFE', 'BAR', 'HOTEL', 'MOTEL'
];

// Individual indicators
const INDIVIDUAL_TITLES = [
  'DR', 'MR', 'MRS', 'MS', 'MISS', 'JR', 'SR', 'III', 'IV', 'ESQ', 'MD', 'PHD', 'PROF', 'REV', 'PASTOR', 'RABBI'
];

/**
 * CRITICAL: Fast individual name detection using comprehensive patterns
 */
function detectIndividualName(payeeName: string): { isIndividual: boolean; confidence: number; reasons: string[] } {
  const name = payeeName.toUpperCase().trim();
  const words = name.split(/\s+/).filter(w => w.length > 0);
  const reasons: string[] = [];
  let confidence = 0;

  // Check for professional titles
  for (const title of INDIVIDUAL_TITLES) {
    if (name.includes(title)) {
      reasons.push(`Professional title: ${title}`);
      confidence += 50;
      break;
    }
  }

  // Check for common first names - CRITICAL FIX
  if (words.length >= 1) {
    const firstWord = words[0].replace(/[^A-Z]/g, '');
    if (COMMON_FIRST_NAMES.includes(firstWord)) {
      reasons.push(`Common first name: ${firstWord}`);
      confidence += 60; // High confidence for first names
    }
  }

  // Personal name patterns
  if (words.length === 2) {
    // First Last pattern
    const [first, last] = words;
    if (first.length >= 2 && last.length >= 2 && !BUSINESS_KEYWORDS.includes(first) && !BUSINESS_KEYWORDS.includes(last)) {
      reasons.push('Two-word personal name pattern');
      confidence += 30;
    }
  }

  if (words.length === 3) {
    // First Middle Last pattern
    const [first, middle, last] = words;
    if (first.length >= 2 && middle.length <= 3 && last.length >= 2) {
      reasons.push('Three-word personal name pattern');
      confidence += 25;
    }
  }

  // Possessive form (John's Plumbing)
  if (/'\s*S\b/.test(name)) {
    reasons.push('Possessive form (individual proprietor)');
    confidence += 40;
  }

  // Last, First format
  if (name.includes(',') && words.length === 2) {
    reasons.push('Last, First name format');
    confidence += 35;
  }

  // Mixed case personal names
  if (payeeName !== payeeName.toUpperCase() && words.length <= 3) {
    reasons.push('Mixed case personal name');
    confidence += 20;
  }

  return {
    isIndividual: confidence >= 40,
    confidence: Math.min(95, confidence),
    reasons
  };
}

/**
 * CRITICAL: Fast business detection using clear indicators
 */
function detectBusinessEntity(payeeName: string): { isBusiness: boolean; confidence: number; reasons: string[] } {
  const name = payeeName.toUpperCase().trim();
  const words = name.split(/\s+/).filter(w => w.length > 0);
  const reasons: string[] = [];
  let confidence = 0;

  // Legal suffixes - very strong indicators
  for (const suffix of BUSINESS_SUFFIXES) {
    if (name.includes(suffix)) {
      reasons.push(`Legal suffix: ${suffix}`);
      confidence += 70;
      break;
    }
  }

  // Business keywords
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      reasons.push(`Business keyword: ${keyword}`);
      confidence += 25;
      break; // Only count one to avoid over-scoring
    }
  }

  // Structural business indicators
  if (words.length >= 4) {
    reasons.push('Multi-word business name');
    confidence += 15;
  }

  if (name.includes('&') || name.includes(' AND ')) {
    reasons.push('Business partnership indicator');
    confidence += 20;
  }

  if (/\d/.test(name) && words.length >= 2) {
    reasons.push('Contains numbers (business pattern)');
    confidence += 10;
  }

  if (name === payeeName.toUpperCase() && payeeName.length > 15) {
    reasons.push('All caps business format');
    confidence += 15;
  }

  return {
    isBusiness: confidence >= 50,
    confidence: Math.min(95, confidence),
    reasons
  };
}

/**
 * Enhanced V3 classification with FIXED individual detection
 */
export async function enhancedClassifyPayeeV3(
  payeeName: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
  retryCount: number = 0
): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 50,
      reasoning: "Empty payee name - defaulting to Individual",
      processingTier: 'Rule-Based',
      processingMethod: 'Input validation fallback'
    };
  }

  try {
    console.log(`[V3] Classifying "${payeeName}"`);

    // Stage 1: Keyword exclusion check
    const keywordExclusion = checkKeywordExclusion(payeeName);
    if (keywordExclusion.isExcluded) {
      return {
        classification: 'Business',
        confidence: Math.max(keywordExclusion.confidence, CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE),
        reasoning: keywordExclusion.reasoning,
        processingTier: 'Excluded',
        keywordExclusion,
        processingMethod: 'Keyword exclusion'
      };
    }

    // Stage 2: CRITICAL - Individual name detection FIRST
    const individualCheck = detectIndividualName(payeeName);
    const businessCheck = detectBusinessEntity(payeeName);

    console.log(`[V3] "${payeeName}" - Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`);

    // Decision logic - Individual bias when uncertain
    if (individualCheck.isIndividual && individualCheck.confidence >= businessCheck.confidence) {
      return {
        classification: 'Individual',
        confidence: individualCheck.confidence,
        reasoning: `Individual name detected: ${individualCheck.reasons.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.reasons,
        processingMethod: 'Enhanced individual detection'
      };
    }

    if (businessCheck.isBusiness && businessCheck.confidence > individualCheck.confidence + 20) {
      return {
        classification: 'Business',
        confidence: businessCheck.confidence,
        reasoning: `Business entity detected: ${businessCheck.reasons.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: businessCheck.reasons,
        processingMethod: 'Enhanced business detection'
      };
    }

    // Stage 3: Conservative fallback - default to Individual when uncertain
    const fallbackConfidence = Math.max(60, Math.max(individualCheck.confidence, businessCheck.confidence));
    const fallbackClassification = individualCheck.confidence >= businessCheck.confidence ? 'Individual' : 'Business';

    return {
      classification: fallbackClassification,
      confidence: fallbackConfidence,
      reasoning: `Conservative classification based on available indicators. Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`,
      processingTier: 'Rule-Based',
      matchingRules: [...individualCheck.reasons, ...businessCheck.reasons],
      processingMethod: 'Conservative fallback classification'
    };

  } catch (error) {
    console.error(`[V3] Error classifying "${payeeName}":`, error);
    
    // Emergency fallback - always return a result
    return {
      classification: 'Individual',
      confidence: 60,
      reasoning: `Emergency fallback to Individual due to processing error: ${error}`,
      processingTier: 'Rule-Based',
      processingMethod: 'Emergency fallback'
    };
  }
}
