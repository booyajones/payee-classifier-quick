
import { ClassificationResult } from '../types';

/**
 * ENHANCED World-class deterministic classification engine
 * Improved business detection for service companies and professional services
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

// ENHANCED business keywords with service industry focus
const BUSINESS_KEYWORDS = [
  // Core business terms
  "SERVICES", "SOLUTIONS", "CONSULTING", "MANAGEMENT", "SYSTEMS", "TECHNOLOGIES",
  "ENTERPRISES", "GROUP", "HOLDINGS", "PARTNERS", "ASSOCIATES", "AGENCY",
  
  // Service industry (the key missing piece!)
  "LOCKSMITH", "EXPRESS", "AUTO", "AUTOMOTIVE", "REPAIR", "MAINTENANCE", "INSTALLATION",
  "PLUMBING", "ELECTRICAL", "ROOFING", "FLOORING", "PAINTING", "CLEANING", "LANDSCAPING",
  "PEST", "CONTROL", "SECURITY", "ALARM", "FIRE", "PROTECTION", "EMERGENCY",
  
  // Professional services
  "ACCOUNTING", "LEGAL", "INSURANCE", "REAL", "ESTATE", "MORTGAGE", "FINANCE", "FINANCIAL",
  "CONSULTING", "ENGINEERING", "ARCHITECTURE", "DESIGN", "MARKETING", "ADVERTISING",
  
  // Trade and construction
  "CONSTRUCTION", "CONTRACTING", "BUILDING", "MANUFACTURING", "SUPPLY", "EQUIPMENT",
  "TOOLS", "HARDWARE", "MATERIALS", "WHOLESALE", "RETAIL", "DISTRIBUTION",
  
  // Food and hospitality
  "RESTAURANT", "CAFE", "CATERING", "FOOD", "BAKERY", "HOTEL", "MOTEL",
  
  // Healthcare and wellness
  "MEDICAL", "DENTAL", "HEALTH", "CLINIC", "PHARMACY", "THERAPY", "FITNESS",
  
  // Technology
  "TECH", "SOFTWARE", "COMPUTER", "IT", "WEB", "DIGITAL", "COMMUNICATIONS",
  
  // Transportation
  "TRANSPORT", "SHIPPING", "DELIVERY", "MOVING", "STORAGE", "TRUCK", "TAXI",
  
  // Business qualifiers
  "PROFESSIONAL", "QUALITY", "PREMIUM", "EXPERT", "ADVANCED", "QUICK", "FAST", "SAME", "DAY"
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
 * ENHANCED individual detection with better first name recognition
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

  // Strategy 3: ENHANCED first name detection
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

  // Strategy 5: Personal name patterns (but exclude if has business terms)
  const hasBusinessTerms = BUSINESS_KEYWORDS.some(keyword => normalizedName.includes(keyword));
  if (!hasBusinessTerms) {
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
  }

  // Strategy 6: Possessive forms (individual proprietors)
  if (payeeName.includes("'S") || payeeName.includes("'s")) {
    score += 35;
    rules.push("Possessive form (individual proprietor)");
  }

  // Strategy 7: Mixed case personal names (proper nouns) - but only for short names
  if (payeeName !== payeeName.toUpperCase() && words.length <= 3 && !hasBusinessTerms) {
    const hasProperCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(payeeName);
    if (hasProperCase) {
      score += 30;
      rules.push("Proper case personal name");
    }
  }

  return { score, rules };
}

/**
 * SIGNIFICANTLY ENHANCED business detection
 */
function detectBusinessPatterns(payeeName: string): { score: number; rules: string[] } {
  const normalizedName = normalizeText(payeeName);
  const originalName = payeeName;
  const words = normalizedName.split(/\s+/).filter(word => word.length > 0);
  let score = 0;
  const rules: string[] = [];

  // Strategy 1: ENHANCED business number/letter patterns
  const businessPatterns = [
    { pattern: /\b[A-Z]-\d+\b/, score: 60, desc: "Alphanumeric business pattern (A-1 format)" },
    { pattern: /\b\d+-[A-Z]\b/, score: 50, desc: "Numeric-letter pattern" },
    { pattern: /\b[A-Z]{2,3}\b/, score: 30, desc: "Business abbreviation pattern" },
    { pattern: /\b\d+\/\d+\b/, score: 40, desc: "24/7 style pattern" },
    { pattern: /\b\d+[A-Z]+\b/, score: 35, desc: "Number-letter combination" }
  ];

  for (const { pattern, score: patternScore, desc } of businessPatterns) {
    if (pattern.test(normalizedName)) {
      score += patternScore;
      rules.push(desc);
      break;
    }
  }

  // Strategy 2: Legal suffixes (strongest indicator)
  for (const suffix of BUSINESS_LEGAL_SUFFIXES) {
    if (normalizedName.endsWith(suffix) || normalizedName.includes(` ${suffix}`)) {
      score += 70;
      rules.push(`Legal business suffix: ${suffix}`);
      break;
    }
  }

  // Strategy 3: ENHANCED business keywords with weighted scoring
  for (const keyword of BUSINESS_KEYWORDS) {
    if (normalizedName.includes(keyword)) {
      // High-value service keywords get extra points
      const highValueKeywords = ['LOCKSMITH', 'EXPRESS', 'AUTO', 'REPAIR', 'SERVICES', 'EMERGENCY', 'PROFESSIONAL'];
      const keywordScore = highValueKeywords.includes(keyword) ? 45 : 25;
      score += keywordScore;
      rules.push(`Business keyword: ${keyword}`);
      break;
    }
  }

  // Strategy 4: Business structure patterns
  if (words.length >= 3) {
    score += 20;
    rules.push("Multi-word business name (3+ words)");
  }

  if (normalizedName.includes("&") || normalizedName.includes("AND")) {
    score += 25;
    rules.push("Partnership indicator (&/AND)");
  }

  if (/\b\d{3,}\b/.test(normalizedName)) {
    score += 15;
    rules.push("Numeric identifiers");
  }

  // Strategy 5: ALL CAPS with business context
  if (originalName === originalName.toUpperCase() && originalName.length > 8 && words.length >= 2) {
    // Only count if it has business indicators or is longer/complex
    const hasBusinessContext = BUSINESS_KEYWORDS.some(keyword => normalizedName.includes(keyword)) || words.length > 3;
    if (hasBusinessContext) {
      score += 25;
      rules.push("All-caps business format with business context");
    }
  }

  return { score, rules };
}

/**
 * ENHANCED World-class classification with better business detection
 */
export async function worldClassClassification(payeeName: string): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: 'Empty or invalid payee name',
      processingTier: 'Rule-Based',
      processingMethod: 'Enhanced world-class engine'
    };
  }

  console.log(`[ENHANCED-WORLD-CLASS] Classifying "${payeeName}"`);

  // Detect individual patterns
  const individualResult = detectIndividualPatterns(payeeName);
  
  // Detect business patterns
  const businessResult = detectBusinessPatterns(payeeName);

  console.log(`[ENHANCED-WORLD-CLASS] Individual score: ${individualResult.score}, Business score: ${businessResult.score}`);

  // ENHANCED decision logic with business preference for clear business indicators
  if (businessResult.score >= 50 || (businessResult.score > individualResult.score && businessResult.score >= 30)) {
    const confidence = Math.min(95, 65 + businessResult.score * 0.4);
    return {
      classification: 'Business',
      confidence: Math.round(confidence),
      reasoning: `Business classification (score: ${businessResult.score} vs ${individualResult.score}). Rules: ${businessResult.rules.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: businessResult.rules,
      processingMethod: 'Enhanced world-class engine'
    };
  }

  if (individualResult.score >= 40 || (individualResult.score > businessResult.score && individualResult.score >= 25)) {
    const confidence = Math.min(95, 60 + individualResult.score * 0.5);
    return {
      classification: 'Individual',
      confidence: Math.round(confidence),
      reasoning: `Individual classification (score: ${individualResult.score} vs ${businessResult.score}). Rules: ${individualResult.rules.join(', ')}`,
      processingTier: 'Rule-Based',
      matchingRules: individualResult.rules,
      processingMethod: 'Enhanced world-class engine'
    };
  }

  // Enhanced fallback logic
  const words = normalizeText(payeeName).split(/\s+/);
  
  // For names like "A-1 Express Locksmith" - favor business
  if (words.length >= 3 || /[A-Z]-\d+/.test(payeeName)) {
    return {
      classification: 'Business',
      confidence: 65,
      reasoning: `Complex name pattern suggests business (${words.length} words)`,
      processingTier: 'Rule-Based',
      processingMethod: 'Enhanced world-class engine (pattern fallback)'
    };
  }

  // For simple 2-word names, default to Individual (safer)
  if (words.length <= 2) {
    return {
      classification: 'Individual',
      confidence: 55,
      reasoning: `Simple name pattern, defaulting to Individual for privacy`,
      processingTier: 'Rule-Based',
      processingMethod: 'Enhanced world-class engine (conservative fallback)'
    };
  }

  // Final fallback
  return {
    classification: 'Business',
    confidence: 52,
    reasoning: `Multi-word name with uncertain classification`,
    processingTier: 'Rule-Based',
    processingMethod: 'Enhanced world-class engine (weak fallback)'
  };
}
