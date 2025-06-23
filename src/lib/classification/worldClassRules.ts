
import { ClassificationResult } from '../types';

/**
 * FIXED World-class deterministic classification engine
 * Now properly detects obvious business patterns like AAARP, ACE-ATlas
 */

// Comprehensive first names database for instant O(1) lookups
const COMMON_FIRST_NAMES = new Set([
  // English names (most common)
  "JAMES", "JOHN", "ROBERT", "MICHAEL", "WILLIAM", "DAVID", "RICHARD", "JOSEPH", "THOMAS", "CHARLES",
  "CHRISTOPHER", "DANIEL", "MATTHEW", "ANTHONY", "MARK", "DONALD", "STEVEN", "PAUL", "ANDREW", "JOSHUA",
  "KENNETH", "KEVIN", "BRIAN", "GEORGE", "TIMOTHY", "RONALD", "JASON", "EDWARD", "JEFFREY", "RYAN",
  "JACOB", "GARY", "NICHOLAS", "ERIC", "JONATHAN", "STEPHEN", "LARRY", "JUSTIN", "SCOTT", "BRANDON",
  "BENJAMIN", "SAMUEL", "GREGORY", "ALEXANDER", "PATRICK", "FRANK", "RAYMOND", "JACK", "DENNIS", "JERRY",
  
  // Female names
  "MARY", "PATRICIA", "LINDA", "BARBARA", "ELIZABETH", "JENNIFER", "MARIA", "SUSAN", "MARGARET", "DOROTHY",
  "LISA", "NANCY", "KAREN", "BETTY", "HELEN", "SANDRA", "DONNA", "CAROL", "RUTH", "SHARON",
  "MICHELLE", "LAURA", "SARAH", "KIMBERLY", "DEBORAH", "JESSICA", "SHIRLEY", "CYNTHIA", "ANGELA", "MELISSA",
  "BRENDA", "AMY", "ANNA", "REBECCA", "VIRGINIA", "KATHLEEN", "PAMELA", "MARTHA", "DEBRA", "AMANDA",
  "STEPHANIE", "CAROLYN", "CHRISTINE", "MARIE", "JANET", "CATHERINE", "FRANCES", "ANN", "JOYCE", "DIANE",
  
  // Additional common names
  "TOM", "MIKE", "BOB", "JIM", "BILL", "STEVE", "DAVE", "CHRIS", "MARK", "PAUL", "MATT", "JEFF", "RICK",
  "SUE", "JANE", "JEAN", "JOAN", "LYNN", "ANNE", "KATE", "ROSE", "RUTH", "BETH", "DAWN", "HOPE", "JOY"
]);

// Strong business indicators (legal suffixes)
const BUSINESS_LEGAL_SUFFIXES = [
  "LLC", "INC", "CORP", "CORPORATION", "LTD", "LIMITED", "COMPANY", "CO",
  "LP", "LLP", "PC", "PLC", "GMBH", "SA", "AG", "PTY", "INCORPORATED"
];

// ENHANCED business keywords with aggressive scoring
const BUSINESS_KEYWORDS = [
  // Core business terms (high confidence)
  "SERVICES", "SOLUTIONS", "CONSULTING", "MANAGEMENT", "SYSTEMS", "TECHNOLOGIES",
  "ENTERPRISES", "GROUP", "HOLDINGS", "PARTNERS", "ASSOCIATES", "AGENCY",
  "INTERNATIONAL", "GLOBAL", "NATIONAL", "PROFESSIONAL", "PROPERTIES",
  
  // Service industry (CRITICAL - highest confidence)
  "LOCKSMITH", "EXPRESS", "AUTO", "AUTOMOTIVE", "REPAIR", "MAINTENANCE", "INSTALLATION",
  "PLUMBING", "ELECTRICAL", "ROOFING", "FLOORING", "PAINTING", "CLEANING", "LANDSCAPING",
  "PEST", "CONTROL", "SECURITY", "ALARM", "FIRE", "PROTECTION", "EMERGENCY",
  "HVAC", "AIR", "CONDITIONING", "HEATING", "MECHANICAL",
  
  // Trade and business
  "CONSTRUCTION", "CONTRACTING", "BUILDING", "MANUFACTURING", "SUPPLY", "EQUIPMENT",
  "TOOLS", "HARDWARE", "MATERIALS", "WHOLESALE", "RETAIL", "DISTRIBUTION",
  "COMMUNICATIONS", "RESOURCES", "DEVELOPMENT", "INDUSTRIES"
];

// Professional titles indicating individuals
const PROFESSIONAL_TITLES = [
  "DR", "DOCTOR", "MD", "PHD", "PROF", "PROFESSOR", "MR", "MRS", "MS", "MISS",
  "REV", "PASTOR", "RABBI", "FATHER", "SISTER", "ESQ", "ATTY", "JUDGE", "HON"
];

// Name suffixes indicating individuals
const NAME_SUFFIXES = ["JR", "SR", "III", "IV", "V", "ESQ"];

/**
 * Advanced text normalization
 */
function normalizeText(text: string): string {
  return text.toUpperCase().trim().replace(/[.,\-_]/g, " ").replace(/\s+/g, " ");
}

/**
 * CRITICAL: Detect obvious business patterns that are NOT names
 */
function detectObviousBusinessPatterns(payeeName: string): { score: number; rules: string[] } {
  const normalizedName = normalizeText(payeeName);
  const originalName = payeeName;
  let score = 0;
  const rules: string[] = [];

  console.log(`[WORLD-CLASS] Checking obvious business patterns for "${payeeName}"`);

  // 1. ALL CAPS ACRONYMS (like AAARP) - HIGHEST PRIORITY
  if (/^[A-Z]{2,8}$/.test(originalName) && originalName.length >= 3) {
    score += 150; // Very high score
    rules.push("All-caps acronym (obvious business pattern)");
    console.log(`[WORLD-CLASS] ACRONYM DETECTED: ${originalName}`);
  }

  // 2. HYPHENATED BUSINESS NAMES (like ACE-ATlas) - HIGHEST PRIORITY
  if (originalName.includes('-') && !/^[A-Z][a-z]+-[A-Z][a-z]+$/.test(originalName)) {
    score += 140; // Very high score
    rules.push("Hyphenated business name pattern");
    console.log(`[WORLD-CLASS] HYPHENATED BUSINESS: ${originalName}`);
  }

  // 3. MIXED CASE COMPOUND WORDS (like ReadyRefresh)
  if (/^[A-Z][a-z]+[A-Z][a-z]+$/.test(originalName) && originalName.length > 6) {
    score += 130;
    rules.push("Compound business name (CamelCase)");
    console.log(`[WORLD-CLASS] COMPOUND BUSINESS: ${originalName}`);
  }

  // 4. ALPHANUMERIC PATTERNS (like A-1, 24-7)
  if (/^[A-Z]-?\d+/.test(originalName) || /^\d+-[A-Z]/.test(originalName)) {
    score += 125;
    rules.push("Alphanumeric business identifier");
    console.log(`[WORLD-CLASS] ALPHANUMERIC BUSINESS: ${originalName}`);
  }

  // 5. ALL CAPS MULTI-WORD (likely business)
  if (originalName === originalName.toUpperCase() && originalName.includes(' ') && originalName.length > 5) {
    const words = originalName.split(/\s+/);
    const hasObviousPersonName = words.some(word => COMMON_FIRST_NAMES.has(word));
    if (!hasObviousPersonName) {
      score += 120;
      rules.push("All-caps multi-word business name");
      console.log(`[WORLD-CLASS] ALL-CAPS BUSINESS: ${originalName}`);
    }
  }

  // 6. SINGLE WORD BUSINESS NAMES (more than 8 chars, not common first names)
  const words = normalizedName.split(/\s+/);
  if (words.length === 1 && originalName.length > 8 && !COMMON_FIRST_NAMES.has(normalizedName)) {
    score += 110;
    rules.push("Single long word business name");
    console.log(`[WORLD-CLASS] SINGLE WORD BUSINESS: ${originalName}`);
  }

  return { score, rules };
}

/**
 * Enhanced business pattern detection with service focus
 */
function detectBusinessPatterns(payeeName: string): { score: number; rules: string[] } {
  const normalizedName = normalizeText(payeeName);
  const words = normalizedName.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  const rules: string[] = [];

  console.log(`[WORLD-CLASS] Analyzing business patterns for "${payeeName}"`);

  // First check obvious patterns
  const obviousResult = detectObviousBusinessPatterns(payeeName);
  score += obviousResult.score;
  rules.push(...obviousResult.rules);

  // Legal suffixes (very high confidence)
  for (const suffix of BUSINESS_LEGAL_SUFFIXES) {
    if (normalizedName.endsWith(suffix) || normalizedName.includes(` ${suffix}`)) {
      score += 110;
      rules.push(`Legal business suffix: ${suffix}`);
      break;
    }
  }

  // Business keywords
  const foundBusinessKeyword = BUSINESS_KEYWORDS.find(keyword => normalizedName.includes(keyword));
  if (foundBusinessKeyword) {
    score += 100;
    rules.push(`Business keyword: ${foundBusinessKeyword}`);
  }

  // Multi-word business names
  if (words.length >= 3) {
    score += 80;
    rules.push("Multi-word business name (3+ words)");
  }

  console.log(`[WORLD-CLASS] Business score: ${score}, rules: ${rules.join(', ')}`);
  return { score, rules };
}

/**
 * Individual pattern detection (conservative - only obvious personal names)
 */
function detectIndividualPatterns(payeeName: string): { score: number; rules: string[] } {
  const normalizedName = normalizeText(payeeName);
  const words = normalizedName.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  const rules: string[] = [];

  console.log(`[WORLD-CLASS] Analyzing individual patterns for "${payeeName}"`);

  // Check for obvious business patterns first - if found, don't score as individual
  const obviousBusinessResult = detectObviousBusinessPatterns(payeeName);
  if (obviousBusinessResult.score > 0) {
    console.log(`[WORLD-CLASS] Has obvious business patterns, skipping individual scoring`);
    return { score: 0, rules: [] };
  }

  // Professional titles
  for (const title of PROFESSIONAL_TITLES) {
    if (normalizedName.includes(title)) {
      score += 90;
      rules.push(`Professional title: ${title}`);
      break;
    }
  }

  // Name suffixes
  for (const suffix of NAME_SUFFIXES) {
    if (normalizedName.endsWith(suffix) || normalizedName.includes(` ${suffix}`)) {
      score += 85;
      rules.push(`Name suffix: ${suffix}`);
      break;
    }
  }

  // First name detection
  if (words.length >= 1) {
    const firstWord = words[0];
    if (COMMON_FIRST_NAMES.has(firstWord)) {
      score += 80;
      rules.push(`Common first name: ${firstWord}`);
    }
  }

  // Simple name patterns - ONLY if no business indicators
  if (words.length === 2 && score > 0) {
    const namePattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+$/;
    if (namePattern.test(payeeName)) {
      score += 70;
      rules.push("Two-word personal name pattern");
    }
  }

  console.log(`[WORLD-CLASS] Individual score: ${score}, rules: ${rules.join(', ')}`);
  return { score, rules };
}

/**
 * FIXED world-class classification with proper business detection
 */
export async function worldClassClassification(payeeName: string): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: 'Empty or invalid payee name',
      processingTier: 'Rule-Based',
      processingMethod: 'Fixed world-class engine'
    };
  }

  console.log(`[WORLD-CLASS] Classifying "${payeeName}"`);

  const businessResult = detectBusinessPatterns(payeeName);
  const individualResult = detectIndividualPatterns(payeeName);

  console.log(`[WORLD-CLASS] Final scores - Business: ${businessResult.score}, Individual: ${individualResult.score}`);

  // AGGRESSIVE decision logic - business wins if ANY business indicators
  if (businessResult.score >= 50) {
    const confidence = Math.min(98, Math.max(85, 80 + businessResult.score * 0.12));
    console.log(`[WORLD-CLASS] BUSINESS CLASSIFICATION: ${Math.round(confidence)}%`);
    return {
      classification: 'Business',
      confidence: Math.round(confidence),
      reasoning: `Business classification (score: ${businessResult.score}). Rules: ${businessResult.rules.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: businessResult.rules,
      processingMethod: 'Fixed world-class engine'
    };
  }

  if (individualResult.score >= 70) {
    const confidence = Math.min(95, Math.max(82, 75 + individualResult.score * 0.2));
    return {
      classification: 'Individual',
      confidence: Math.round(confidence),
      reasoning: `Individual classification (score: ${individualResult.score}). Rules: ${individualResult.rules.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: individualResult.rules,
      processingMethod: 'Fixed world-class engine'
    };
  }

  // Default logic - be more aggressive about business classification
  const words = normalizeText(payeeName).split(/\s+/);
  
  // Any compound word or unusual pattern defaults to business
  if (words.length === 1 && payeeName.length > 6) {
    return {
      classification: 'Business',
      confidence: 85,
      reasoning: `Single compound word likely business name`,
      processingTier: 'Rule-Based',
      processingMethod: 'Fixed world-class engine (compound default)'
    };
  }

  // Multi-word defaults to business unless clear personal name
  if (words.length >= 3) {
    return {
      classification: 'Business',
      confidence: 83,
      reasoning: `Multi-word name likely business (${words.length} words)`,
      processingTier: 'Rule-Based',
      processingMethod: 'Fixed world-class engine (multi-word default)'
    };
  }

  return {
    classification: 'Individual',
    confidence: 80,
    reasoning: `Conservative individual classification`,
    processingTier: 'Rule-Based',
    processingMethod: 'Fixed world-class engine (conservative fallback)'
  };
}
