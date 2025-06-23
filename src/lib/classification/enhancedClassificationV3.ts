
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { checkKeywordExclusion } from './enhancedKeywordExclusion';

// Hard-coded confidence thresholds for intelligent escalation
const CONFIDENCE_THRESHOLDS = {
  HIGH_CONFIDENCE: 95,
  MEDIUM_CONFIDENCE: 85,
  REVIEW_REQUIRED: 75,
  ESCALATE_TO_AI: 65,
  FORCE_WEB_SEARCH: 50
};

// COMPREHENSIVE FIRST NAMES DATABASE - Critical for individual detection
const COMMON_FIRST_NAMES = new Set([
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
]);

// Business entity indicators - reduced to only strong indicators
const BUSINESS_SUFFIXES = [
  'LLC', 'INC', 'CORP', 'LTD', 'CO', 'COMPANY', 'CORPORATION', 'ENTERPRISES', 'GROUP', 'HOLDINGS',
  'PARTNERS', 'ASSOCIATES'
];

// Reduced business keywords - only clear business indicators
const BUSINESS_KEYWORDS = [
  'AGENCY', 'STUDIO', 'MANAGEMENT', 'CONSULTING', 'SERVICES', 'SOLUTIONS', 'SYSTEMS', 'TECHNOLOGIES',
  'DISTRIBUTORS', 'BAKERY', 'ENTERTAINMENT', 'CONSTRUCTION', 'RESTAURANT', 'CAFE', 'BAR', 'HOTEL'
];

// Individual indicators
const INDIVIDUAL_TITLES = [
  'DR', 'MR', 'MRS', 'MS', 'MISS', 'JR', 'SR', 'III', 'IV', 'ESQ', 'MD', 'PHD', 'PROF', 'REV', 'PASTOR', 'RABBI'
];

/**
 * FIXED: Fast individual name detection with improved patterns
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
      confidence += 60;
      break;
    }
  }

  // CRITICAL: Check for common first names - instant individual detection
  if (words.length >= 1) {
    const firstWord = words[0].replace(/[^A-Z]/g, '');
    if (COMMON_FIRST_NAMES.has(firstWord)) {
      reasons.push(`Common first name: ${firstWord}`);
      confidence += 70; // High confidence for first names
    }
  }

  // FIXED: Individual + occupation pattern (e.g., "Tom Plumber", "Christina Manuel")
  if (words.length === 2) {
    const [first, second] = words;
    if (COMMON_FIRST_NAMES.has(first)) {
      // If first word is a name, likely individual even if second word sounds like occupation
      reasons.push(`First name + descriptor pattern: ${first} ${second}`);
      confidence += 50;
    }
  }

  // Personal name patterns
  if (words.length === 2 && confidence < 50) {
    const [first, last] = words;
    if (first.length >= 2 && last.length >= 2 && 
        !BUSINESS_KEYWORDS.includes(first) && !BUSINESS_KEYWORDS.includes(last)) {
      reasons.push('Two-word personal name pattern');
      confidence += 40;
    }
  }

  if (words.length === 3) {
    const [first, middle, last] = words;
    if (first.length >= 2 && middle.length <= 3 && last.length >= 2) {
      reasons.push('Three-word personal name pattern');
      confidence += 35;
    }
  }

  // Possessive form (John's Plumbing) - individual proprietor
  if (/'\s*S\b/.test(name) || name.includes("'S")) {
    reasons.push('Possessive form (individual proprietor)');
    confidence += 50;
  }

  // Last, First format
  if (name.includes(',') && words.length >= 2) {
    reasons.push('Last, First name format');
    confidence += 45;
  }

  // Mixed case personal names
  if (payeeName !== payeeName.toUpperCase() && words.length <= 3) {
    reasons.push('Mixed case personal name');
    confidence += 30;
  }

  return {
    isIndividual: confidence >= 40,
    confidence: Math.min(95, confidence),
    reasons
  };
}

/**
 * FIXED: Business detection with reduced false positives
 */
function detectBusinessEntity(payeeName: string): { isBusiness: boolean; confidence: number; reasons: string[] } {
  const name = payeeName.toUpperCase().trim();
  const words = name.split(/\s+/).filter(w => w.length > 0);
  const reasons: string[] = [];
  let confidence = 0;

  // Legal suffixes - very strong indicators
  for (const suffix of BUSINESS_SUFFIXES) {
    if (name.endsWith(suffix) || name.includes(` ${suffix}`)) {
      reasons.push(`Legal suffix: ${suffix}`);
      confidence += 80;
      break;
    }
  }

  // Business keywords - reduced scoring to avoid false positives
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      reasons.push(`Business keyword: ${keyword}`);
      confidence += 30;
      break;
    }
  }

  // Structural business indicators
  if (words.length >= 5) {
    reasons.push('Very long business name (5+ words)');
    confidence += 20;
  }

  if (name.includes('&') || name.includes(' AND ')) {
    reasons.push('Business partnership indicator');
    confidence += 25;
  }

  // Number patterns in business names
  if (/\b\d{3,}\b/.test(name) && words.length >= 2) {
    reasons.push('Contains numbers (business pattern)');
    confidence += 15;
  }

  // All caps format for longer names
  if (name === payeeName.toUpperCase() && payeeName.length > 20) {
    reasons.push('All caps business format');
    confidence += 20;
  }

  return {
    isBusiness: confidence >= 60, // Raised threshold to reduce false positives
    confidence: Math.min(95, confidence),
    reasons
  };
}

/**
 * Enhanced V3 classification with FIXED individual-first logic
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
    console.log(`[V3-FIXED] Classifying "${payeeName}"`);

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

    // Stage 2: INDIVIDUAL-FIRST detection
    const individualCheck = detectIndividualName(payeeName);
    const businessCheck = detectBusinessEntity(payeeName);

    console.log(`[V3-FIXED] "${payeeName}" - Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`);

    // FIXED: Individual-first decision logic
    if (individualCheck.isIndividual && individualCheck.confidence >= 40) {
      return {
        classification: 'Individual',
        confidence: individualCheck.confidence,
        reasoning: `Individual detected: ${individualCheck.reasons.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.reasons,
        processingMethod: 'Enhanced individual-first detection'
      };
    }

    // Only classify as business if strong indicators AND no individual indicators
    if (businessCheck.isBusiness && businessCheck.confidence > 70 && !individualCheck.isIndividual) {
      return {
        classification: 'Business',
        confidence: businessCheck.confidence,
        reasoning: `Strong business indicators: ${businessCheck.reasons.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: businessCheck.reasons,
        processingMethod: 'Enhanced business detection'
      };
    }

    // Stage 3: Conservative fallback - ALWAYS favor Individual when uncertain
    const fallbackConfidence = Math.max(55, individualCheck.confidence || 55);
    
    return {
      classification: 'Individual',
      confidence: fallbackConfidence,
      reasoning: `Conservative Individual classification. Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`,
      processingTier: 'Rule-Based',
      matchingRules: [...individualCheck.reasons, ...businessCheck.reasons],
      processingMethod: 'Conservative Individual-first fallback'
    };

  } catch (error) {
    console.error(`[V3-FIXED] Error classifying "${payeeName}":`, error);
    
    // Emergency fallback - always return Individual
    return {
      classification: 'Individual',
      confidence: 60,
      reasoning: `Emergency fallback to Individual due to processing error: ${error}`,
      processingTier: 'Rule-Based',
      processingMethod: 'Emergency Individual fallback'
    };
  }
}
