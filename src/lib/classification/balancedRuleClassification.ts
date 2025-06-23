import { ClassificationResult } from '../types';
import { LEGAL_SUFFIXES, BUSINESS_KEYWORDS, INDUSTRY_IDENTIFIERS, GOVERNMENT_PATTERNS, PROFESSIONAL_TITLES } from './config';

/**
 * OVERHAULED balanced rule-based classification
 * Fixed individual detection bias and lowered thresholds
 */
export async function balancedRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  console.log(`[BALANCED-RULES] Classifying "${payeeName}"`);

  // INDIVIDUAL DETECTION (ENHANCED AND FIXED)

  // 1. Professional titles - strong individual indicators
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b|\\b${title}[.,]`, 'i');
    if (titleRegex.test(name)) {
      matchingRules.push(`Professional title: ${title}`);
      individualScore += 45; // Increased from 40
      break;
    }
  }

  // 2. CRITICAL FIX: Common first names detection
  const commonFirstNames = [
    "JAMES", "JOHN", "ROBERT", "MICHAEL", "WILLIAM", "DAVID", "RICHARD", "JOSEPH", "THOMAS", "CHARLES",
    "MARY", "PATRICIA", "LINDA", "BARBARA", "ELIZABETH", "JENNIFER", "MARIA", "SUSAN", "MARGARET",
    "TOM", "MIKE", "BOB", "JIM", "BILL", "STEVE", "DAVE", "CHRIS", "MARK", "PAUL", "MATT", "JEFF",
    "SUE", "JANE", "JEAN", "JOAN", "LYNN", "ANNE", "KATE", "ROSE", "CHRISTINA"
  ];
  
  if (words.length >= 1) {
    const firstWord = words[0];
    if (commonFirstNames.includes(firstWord)) {
      matchingRules.push(`Common first name: ${firstWord}`);
      individualScore += 40; // Strong indicator
    }
  }

  // 3. Enhanced name patterns with better scoring
  const namePatterns = [
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+$/, score: 35, desc: "Standard First Last pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]\s+[A-Za-z]+$/, score: 35, desc: "First Middle Last pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]\.\s+[A-Za-z]+$/, score: 40, desc: "First M. Last pattern" },
    { pattern: /^[A-Za-z]+,\s*[A-Za-z]+$/, score: 40, desc: "Last, First pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+\s+(JR|SR|III|IV)\.?$/i, score: 50, desc: "Name with generational suffix" }
  ];

  for (const { pattern, score, desc } of namePatterns) {
    if (pattern.test(payeeName)) {
      matchingRules.push(desc);
      individualScore += score;
      break;
    }
  }

  // 4. Individual-specific patterns (enhanced)
  const individualPatterns = [
    { test: () => /'\s*s\b/i.test(payeeName), score: 30, desc: "Possessive form (individual proprietor)" },
    { test: () => payeeName !== payeeName.toUpperCase() && words.length <= 3, score: 25, desc: "Mixed case personal name" },
    { test: () => words.length === 2 && /^[A-Z][a-z]+$/.test(words[0]) && /^[A-Z][a-z]+$/.test(words[1]), score: 35, desc: "Proper case two-word name" },
    { test: () => /\b(ESTATE|TRUST)\s+OF\b/.test(name), score: 40, desc: "Estate or trust of individual" }
  ];

  for (const pattern of individualPatterns) {
    if (pattern.test()) {
      matchingRules.push(pattern.desc);
      individualScore += pattern.score;
    }
  }

  // BUSINESS DETECTION (Keep existing but adjust scoring)

  // 1. Legal suffixes - very strong indicators
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      matchingRules.push(`Legal suffix: ${suffix}`);
      businessScore += 55; // Reduced from 50
      break;
    }
  }

  // 2. Government patterns
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (name.includes(pattern)) {
      matchingRules.push(`Government entity: ${pattern}`);
      businessScore += 50; // Reduced from 45
      break;
    }
  }

  // 3. Business keywords
  let businessKeywordCount = 0;
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      matchingRules.push(`Business keyword: ${keyword}`);
      businessScore += 18; // Reduced from 20
      businessKeywordCount++;
      if (businessKeywordCount >= 2) break;
    }
  }

  // 4. Industry identifiers
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchingRules.push(`Industry term (${industry}): ${keyword}`);
        businessScore += 12; // Reduced from 15
        break;
      }
    }
  }

  // Enhanced business patterns
  const businessPatterns = [
    { test: () => words.length >= 4, score: 15, desc: "Multi-word business name (4+ words)" },
    { test: () => payeeName === payeeName.toUpperCase() && payeeName.length > 10, score: 20, desc: "All capitals format" },
    { test: () => /[&@#]/.test(name), score: 15, desc: "Business symbols (&, @, #)" },
    { test: () => /\b\d{3,}\b/.test(name), score: 12, desc: "Numeric identifiers" },
    { test: () => /\b(SOLUTIONS|SERVICES|SYSTEMS|TECHNOLOGIES|MANAGEMENT|CONSULTING|GROUP|ENTERPRISES|INTERNATIONAL|GLOBAL)\b/.test(name), score: 25, desc: "Common business terms" },
    { test: () => /\b(SHOP|STORE|MARKET|RETAIL|WHOLESALE|SUPPLY|DISTRIBUTION|MANUFACTURING|CONSTRUCTION|ENGINEERING|DESIGN|STUDIO|AGENCY|FIRM)\b/.test(name), score: 20, desc: "Commercial terms" },
    { test: () => /\b(MEDICAL|DENTAL|HEALTHCARE|CLINIC|HOSPITAL|PHARMACY|WELLNESS|THERAPY|DIAGNOSTIC)\b/.test(name), score: 25, desc: "Healthcare business terms" },
    { test: () => /\b(FINANCIAL|INSURANCE|INVESTMENT|BANKING|MORTGAGE|CREDIT|LOAN|ADVISORY|WEALTH|CAPITAL)\b/.test(name), score: 25, desc: "Financial business terms" }
  ];

  for (const pattern of businessPatterns) {
    if (pattern.test()) {
      matchingRules.push(pattern.desc);
      businessScore += pattern.score;
    }
  }

  // DECISION LOGIC (More aggressive - lower thresholds)
  const minThreshold = 15; // Reduced from 25
  
  console.log(`[BALANCED-RULES] Scores - Individual: ${individualScore}, Business: ${businessScore}`);
  
  if (individualScore >= minThreshold && individualScore >= businessScore) {
    const confidence = Math.min(90, 55 + Math.round((individualScore / (individualScore + businessScore + 1)) * 30));
    return {
      classification: 'Individual',
      confidence,
      reasoning: `Enhanced rule-based classification as Individual (score: ${individualScore} vs ${businessScore}). Rules: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules,
      processingMethod: 'Overhauled balanced rule classification'
    };
  } else if (businessScore >= 25 && businessScore > individualScore) { // Higher threshold for business
    const confidence = Math.min(90, 55 + Math.round((businessScore / (businessScore + individualScore + 1)) * 30));
    return {
      classification: 'Business',
      confidence,
      reasoning: `Enhanced rule-based classification as Business (score: ${businessScore} vs ${individualScore}). Rules: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules,
      processingMethod: 'Overhauled balanced rule classification'
    };
  }

  // Return null to trigger next tier - but this should happen less often now
  console.log(`[BALANCED-RULES] No clear winner, triggering fallback`);
  return null;
}
