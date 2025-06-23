
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG, INDUSTRY_IDENTIFIERS } from './config';
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

// Business entity indicators - strong indicators
const BUSINESS_SUFFIXES = [
  'LLC', 'INC', 'CORP', 'LTD', 'CO', 'COMPANY', 'CORPORATION', 'ENTERPRISES', 'GROUP', 'HOLDINGS',
  'PARTNERS', 'ASSOCIATES', 'SERVICES'
];

// Strong business keywords - expanded and more accurate
const BUSINESS_KEYWORDS = [
  'AGENCY', 'STUDIO', 'MANAGEMENT', 'CONSULTING', 'SERVICES', 'SOLUTIONS', 'SYSTEMS', 'TECHNOLOGIES',
  'DISTRIBUTORS', 'BAKERY', 'ENTERTAINMENT', 'CONSTRUCTION', 'RESTAURANT', 'CAFE', 'BAR', 'HOTEL',
  'FIRE', 'ALARM', 'SECURITY', 'ELECTRIC', 'LOCKSMITH', 'LOCKSMITHS', 'GLAZERS', 'GLAZER', 'MUSHROOMS',
  'CHAMBER', 'LINEN', 'PEST', 'CONTROL', 'CONCEPTS', 'GIFT', 'CARDS', 'BROKERS', 'BROKER'
];

// Individual indicators
const INDIVIDUAL_TITLES = [
  'DR', 'MR', 'MRS', 'MS', 'MISS', 'JR', 'SR', 'III', 'IV', 'ESQ', 'MD', 'PHD', 'PROF', 'REV', 'PASTOR', 'RABBI'
];

/**
 * FIXED: Individual name detection with stricter criteria
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
      confidence += 70;
      break;
    }
  }

  // CRITICAL: Check for common first names - but be more selective
  if (words.length >= 2) {
    const firstWord = words[0].replace(/[^A-Z]/g, '');
    if (COMMON_FIRST_NAMES.has(firstWord)) {
      // Only count as strong individual indicator if it's a clear name pattern
      const secondWord = words[1];
      // Don't count first names followed by obvious business terms
      if (!BUSINESS_KEYWORDS.includes(secondWord) && 
          !['LOCKSMITH', 'LOCKSMITHS', 'GLAZERS', 'MUSHROOMS', 'CONCEPTS'].includes(secondWord)) {
        reasons.push(`Common first name: ${firstWord}`);
        confidence += 60;
      }
    }
  }

  // Personal name patterns - be more restrictive
  if (words.length === 2 && confidence >= 60) {
    const [first, last] = words;
    if (first.length >= 2 && last.length >= 2 && 
        !BUSINESS_KEYWORDS.includes(first) && !BUSINESS_KEYWORDS.includes(last)) {
      reasons.push('Two-word personal name pattern');
      confidence += 30;
    }
  }

  if (words.length === 3) {
    const [first, middle, last] = words;
    // Check for proper name structure
    if (first.length >= 2 && middle.length <= 3 && last.length >= 2 &&
        !BUSINESS_KEYWORDS.some(kw => name.includes(kw))) {
      reasons.push('Three-word personal name pattern');
      confidence += 25;
    }
  }

  // Possessive form (John's Plumbing) - individual proprietor
  if (/'\s*S\b/.test(name) || name.includes("'S")) {
    reasons.push('Possessive form (individual proprietor)');
    confidence += 40;
  }

  // Last, First format
  if (name.includes(',') && words.length >= 2) {
    reasons.push('Last, First name format');
    confidence += 45;
  }

  // Mixed case personal names - only for simple patterns
  if (payeeName !== payeeName.toUpperCase() && words.length <= 2) {
    reasons.push('Mixed case personal name');
    confidence += 25;
  }

  return {
    isIndividual: confidence >= 60, // Raised threshold
    confidence: Math.min(95, confidence),
    reasons
  };
}

/**
 * FIXED: Business detection with expanded keywords
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

  // Business keywords - strong indicators
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      reasons.push(`Business keyword: ${keyword}`);
      confidence += 45; // Increased from 30
      break;
    }
  }

  // Industry terms from config
  const industryTerms = Object.values(INDUSTRY_IDENTIFIERS).flat();
  for (const term of industryTerms) {
    if (name.includes(term)) {
      reasons.push(`Industry term: ${term}`);
      confidence += 35;
      break;
    }
  }

  // Structural business indicators
  if (words.length >= 3) {
    reasons.push('Multi-word business name (3+ words)');
    confidence += 20;
  }

  if (name.includes('&') || name.includes(' AND ')) {
    reasons.push('Business partnership indicator');
    confidence += 30;
  }

  // Number patterns in business names
  if (/\b\d{3,}\b/.test(name) && words.length >= 2) {
    reasons.push('Contains numbers (business pattern)');
    confidence += 20;
  }

  // All caps format for longer names
  if (name === payeeName.toUpperCase() && payeeName.length > 10) {
    reasons.push('All caps business format');
    confidence += 25;
  }

  // Single word business names (common brands)
  if (words.length === 1 && payeeName.length > 5) {
    reasons.push('Single word business name');
    confidence += 35;
  }

  return {
    isBusiness: confidence >= 45, // Lowered threshold
    confidence: Math.min(95, confidence),
    reasons
  };
}

/**
 * Enhanced V3 classification with FIXED business-first logic
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

    // Stage 2: BUSINESS-FIRST detection (FIXED)
    const businessCheck = detectBusinessEntity(payeeName);
    const individualCheck = detectIndividualName(payeeName);

    console.log(`[V3-FIXED] "${payeeName}" - Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`);

    // FIXED: Business-first decision logic
    if (businessCheck.isBusiness && businessCheck.confidence >= 45) {
      return {
        classification: 'Business',
        confidence: businessCheck.confidence,
        reasoning: `Business detected: ${businessCheck.reasons.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: businessCheck.reasons,
        processingMethod: 'Enhanced business-first detection'
      };
    }

    // Only classify as individual if strong indicators AND no business indicators
    if (individualCheck.isIndividual && individualCheck.confidence >= 60 && !businessCheck.isBusiness) {
      return {
        classification: 'Individual',
        confidence: individualCheck.confidence,
        reasoning: `Individual detected: ${individualCheck.reasons.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.reasons,
        processingMethod: 'Enhanced individual detection'
      };
    }

    // Stage 3: Enhanced fallback logic
    const nameUpper = payeeName.toUpperCase();
    const words = nameUpper.split(/\s+/);

    // Check for business indicators in fallback
    const hasBusinessIndicator = 
      BUSINESS_KEYWORDS.some(k => nameUpper.includes(k)) ||
      words.length >= 3 ||
      /\b\d+\b/.test(nameUpper) ||
      nameUpper.includes('&') ||
      (payeeName === payeeName.toUpperCase() && payeeName.length > 8);

    if (hasBusinessIndicator) {
      return {
        classification: 'Business',
        confidence: 65,
        reasoning: `Fallback business classification based on patterns. Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`,
        processingTier: 'Rule-Based',
        matchingRules: [...individualCheck.reasons, ...businessCheck.reasons],
        processingMethod: 'Business-oriented fallback'
      };
    }

    // Final fallback - still conservative toward Individual for privacy
    return {
      classification: 'Individual',
      confidence: 55,
      reasoning: `Conservative Individual classification. Individual: ${individualCheck.confidence}%, Business: ${businessCheck.confidence}%`,
      processingTier: 'Rule-Based',
      matchingRules: [...individualCheck.reasons, ...businessCheck.reasons],
      processingMethod: 'Conservative Individual fallback'
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
