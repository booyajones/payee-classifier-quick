
import { ClassificationResult } from '../types';

/**
 * OVERHAULED World-class deterministic classification engine
 * Fixed to properly detect individuals vs businesses
 * Reduced business bias and improved individual detection
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
  "SUE", "JANE", "JEAN", "JOAN", "LYNN", "ANNE", "KATE", "ROSE", "RUTH", "BETH", "DAWN", "HOPE", "JOY",
  
  // International names
  "JOSE", "JUAN", "FRANCISCO", "ANTONIO", "MANUEL", "CARLOS", "LUIS", "MIGUEL", "JORGE", "PEDRO",
  "MARIA", "ANA", "CARMEN", "ISABEL", "ROSA", "TERESA", "PILAR", "ANGELES", "DOLORES", "CRISTINA",
  "CHRISTINA", "MANUEL", "DIEGO", "RICARDO", "FERNANDO", "ALEJANDRO", "SERGIO", "RAFAEL", "MARTIN",
  
  // Additional variations
  "ROBERT", "BOBBY", "ROB", "ROBERTO", "RUBEN", "RONALD", "RON", "RAYMOND", "RAY", "RALPH",
  "RICHARD", "RICK", "RICKY", "RICARDO", "RANDALL", "RANDY", "ROGER", "ROY", "RUSSELL", "RYAN"
]);

// Common last names for validation
const COMMON_LAST_NAMES = new Set([
  "SMITH", "JOHNSON", "WILLIAMS", "BROWN", "JONES", "GARCIA", "MILLER", "DAVIS", "RODRIGUEZ", "MARTINEZ",
  "HERNANDEZ", "LOPEZ", "GONZALEZ", "WILSON", "ANDERSON", "THOMAS", "TAYLOR", "MOORE", "JACKSON", "MARTIN",
  "LEE", "PEREZ", "THOMPSON", "WHITE", "HARRIS", "SANCHEZ", "CLARK", "RAMIREZ", "LEWIS", "ROBINSON",
  "WALKER", "YOUNG", "ALLEN", "KING", "WRIGHT", "SCOTT", "TORRES", "NGUYEN", "HILL", "FLORES",
  "GREEN", "ADAMS", "NELSON", "BAKER", "HALL", "RIVERA", "CAMPBELL", "MITCHELL", "CARTER", "ROBERTS",
  "TURNER", "PHILLIPS", "PARKER", "EVANS", "EDWARDS", "COLLINS", "STEWART", "SANCHEZ", "MORRIS", "REED",
  "COOK", "MORGAN", "BELL", "MURPHY", "BAILEY", "COOPER", "RICHARDSON", "COX", "HOWARD", "WARD",
  "PETERSON", "GRAY", "RAMIREZ", "JAMES", "WATSON", "BROOKS", "KELLY", "SANDERS", "PRICE", "BENNETT"
]);

// Strong business indicators (legal suffixes)
const BUSINESS_LEGAL_SUFFIXES = [
  "LLC", "INC", "CORP", "CORPORATION", "LTD", "LIMITED", "COMPANY", "CO",
  "LP", "LLP", "PC", "PLC", "GMBH", "SA", "AG", "PTY", "INCORPORATED"
];

// Strong business keywords
const BUSINESS_KEYWORDS = [
  "SERVICES", "SOLUTIONS", "CONSULTING", "MANAGEMENT", "SYSTEMS", "TECHNOLOGIES",
  "ENTERPRISES", "GROUP", "HOLDINGS", "PARTNERS", "ASSOCIATES", "AGENCY",
  "CONSTRUCTION", "MANUFACTURING", "ENGINEERING", "MEDICAL", "DENTAL", "HEALTHCARE",
  "FINANCIAL", "INSURANCE", "RESTAURANT", "RETAIL", "WHOLESALE",
  // Security and emergency services
  "FIRE", "ALARM", "SECURITY", "ELECTRIC"
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
 * Detect individual names using multiple strategies
 */
function detectIndividualPatterns(payeeName: string): { score: number; rules: string[] } {
  const normalizedName = normalizeText(payeeName);
  const words = normalizedName.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  const rules: string[] = [];

  // Strategy 1: Check for professional titles
  for (const title of PROFESSIONAL_TITLES) {
    if (normalizedName.includes(title)) {
      score += 50;
      rules.push(`Professional title: ${title}`);
      break;
    }
  }

  // Strategy 2: Check for name suffixes
  for (const suffix of NAME_SUFFIXES) {
    if (normalizedName.endsWith(suffix) || normalizedName.includes(` ${suffix}`)) {
      score += 45;
      rules.push(`Name suffix: ${suffix}`);
      break;
    }
  }

  // Strategy 3: First name detection (CRITICAL FIX)
  if (words.length >= 1) {
    const firstWord = words[0];
    if (COMMON_FIRST_NAMES.has(firstWord)) {
      score += 40;
      rules.push(`Common first name: ${firstWord}`);
    }
  }

  // Strategy 4: Last name detection
  if (words.length >= 2) {
    const lastWord = words[words.length - 1];
    if (COMMON_LAST_NAMES.has(lastWord)) {
      score += 25;
      rules.push(`Common last name: ${lastWord}`);
    }
  }

  // Strategy 5: Personal name patterns
  const namePatterns = [
    { pattern: /^[A-Z]+\s+[A-Z]+$/, score: 35, desc: "Two-word name pattern" },
    { pattern: /^[A-Z]+\s+[A-Z]+\s+[A-Z]+$/, score: 30, desc: "Three-word name pattern" },
    { pattern: /^[A-Z]+,\s*[A-Z]+/, score: 40, desc: "Last, First format" }
  ];

  for (const { pattern, score: patternScore, desc } of namePatterns) {
    if (pattern.test(normalizedName)) {
      score += patternScore;
      rules.push(desc);
      break;
    }
  }

  // Strategy 6: Possessive forms (individual proprietors)
  if (payeeName.includes("'S") || payeeName.includes("'s")) {
    score += 35;
    rules.push("Possessive form (individual proprietor)");
  }

  // Strategy 7: Mixed case personal names (proper nouns)
  if (payeeName !== payeeName.toUpperCase() && words.length <= 3) {
    const hasProperCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(payeeName);
    if (hasProperCase) {
      score += 30;
      rules.push("Proper case personal name");
    }
  }

  return { score, rules };
}

/**
 * Detect business entities using clear indicators
 */
function detectBusinessPatterns(payeeName: string): { score: number; rules: string[] } {
  const normalizedName = normalizeText(payeeName);
  const words = normalizedName.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  const rules: string[] = [];

  // Strategy 1: Legal suffixes (strongest indicator)
  for (const suffix of BUSINESS_LEGAL_SUFFIXES) {
    if (normalizedName.endsWith(suffix) || normalizedName.includes(` ${suffix}`)) {
      score += 60;
      rules.push(`Legal business suffix: ${suffix}`);
      break;
    }
  }

  // Strategy 2: Business keywords
  for (const keyword of BUSINESS_KEYWORDS) {
    if (normalizedName.includes(keyword)) {
      score += 25;
      rules.push(`Business keyword: ${keyword}`);
      break;
    }
  }

  // Strategy 3: Business patterns
  if (words.length >= 4) {
    score += 15;
    rules.push("Multi-word business name (4+ words)");
  }

  if (normalizedName.includes("&") || normalizedName.includes("AND")) {
    score += 20;
    rules.push("Partnership indicator (&/AND)");
  }

  if (/\b\d{3,}\b/.test(normalizedName)) {
    score += 10;
    rules.push("Numeric identifiers");
  }

  // Strategy 4: All caps business names
  if (payeeName === payeeName.toUpperCase() && payeeName.length > 10 && words.length >= 2) {
    score += 15;
    rules.push("All-caps business format");
  }

  return { score, rules };
}

/**
 * OVERHAULED World-class classification with individual bias fix
 */
export async function worldClassClassification(payeeName: string): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: 'Empty or invalid payee name',
      processingTier: 'Rule-Based',
      processingMethod: 'Overhauled world-class engine'
    };
  }

  console.log(`[OVERHAULED-WORLD-CLASS] Classifying "${payeeName}"`);

  // Detect individual patterns
  const individualResult = detectIndividualPatterns(payeeName);
  
  // Detect business patterns
  const businessResult = detectBusinessPatterns(payeeName);

  console.log(`[OVERHAULED-WORLD-CLASS] Individual score: ${individualResult.score}, Business score: ${businessResult.score}`);

  // CRITICAL FIX: Better decision logic with individual bias
  if (individualResult.score >= 40 || (individualResult.score > businessResult.score && individualResult.score >= 25)) {
    const confidence = Math.min(95, 60 + individualResult.score * 0.5);
    return {
      classification: 'Individual',
      confidence: Math.round(confidence),
      reasoning: `Individual classification (score: ${individualResult.score} vs ${businessResult.score}). Rules: ${individualResult.rules.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: individualResult.rules,
      processingMethod: 'Overhauled world-class engine'
    };
  }

  if (businessResult.score >= 50 || (businessResult.score > individualResult.score && businessResult.score >= 30)) {
    const confidence = Math.min(95, 60 + businessResult.score * 0.4);
    return {
      classification: 'Business',
      confidence: Math.round(confidence),
      reasoning: `Business classification (score: ${businessResult.score} vs ${individualResult.score}). Rules: ${businessResult.rules.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: businessResult.rules,
      processingMethod: 'Overhauled world-class engine'
    };
  }

  // CRITICAL FIX: Default to Individual when uncertain (safer for privacy)
  const words = normalizeText(payeeName).split(/\s+/);
  if (words.length <= 3) {
    return {
      classification: 'Individual',
      confidence: 55,
      reasoning: `Default to Individual for short name (${words.length} words) - safer assumption`,
      processingTier: 'Rule-Based',
      processingMethod: 'Overhauled world-class engine (conservative fallback)'
    };
  }

  // For longer names, slightly favor business but with low confidence
  return {
    classification: 'Business',
    confidence: 52,
    reasoning: `Weak business classification for multi-word name (${words.length} words)`,
    processingTier: 'Rule-Based',
    processingMethod: 'Overhauled world-class engine (weak fallback)'
  };
}
