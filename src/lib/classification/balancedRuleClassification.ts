
import { ClassificationResult } from '../types';
import { LEGAL_SUFFIXES, BUSINESS_KEYWORDS, INDUSTRY_IDENTIFIERS, GOVERNMENT_PATTERNS, PROFESSIONAL_TITLES } from './config';

/**
 * Enhanced balanced rule-based classification for better coverage
 * More aggressive pattern matching to reduce the need for AI fallback
 */
export async function balancedRuleBasedClassification(payeeName: string): Promise<ClassificationResult | null> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  // BUSINESS DETECTION (Enhanced)

  // 1. Legal suffixes - very strong indicators
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      matchingRules.push(`Legal suffix: ${suffix}`);
      businessScore += 50; // Very strong
      break;
    }
  }

  // 2. Government patterns
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (name.includes(pattern)) {
      matchingRules.push(`Government entity: ${pattern}`);
      businessScore += 45;
      break;
    }
  }

  // 3. Business keywords
  let businessKeywordCount = 0;
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      matchingRules.push(`Business keyword: ${keyword}`);
      businessScore += 20;
      businessKeywordCount++;
      if (businessKeywordCount >= 2) break;
    }
  }

  // 4. Industry identifiers
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchingRules.push(`Industry term (${industry}): ${keyword}`);
        businessScore += 15;
        break;
      }
    }
  }

  // 5. Enhanced business patterns
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

  // INDIVIDUAL DETECTION (Enhanced)

  // 1. Professional titles
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b|\\b${title}[.,]`, 'i');
    if (titleRegex.test(name)) {
      matchingRules.push(`Professional title: ${title}`);
      individualScore += 40;
      break;
    }
  }

  // 2. Enhanced name patterns
  const namePatterns = [
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+$/, score: 35, desc: "Standard First Last pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]\s+[A-Za-z]+$/, score: 35, desc: "First Middle Last pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]\.\s+[A-Za-z]+$/, score: 40, desc: "First M. Last pattern" },
    { pattern: /^[A-Za-z]+,\s*[A-Za-z]+$/, score: 40, desc: "Last, First pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+\s+JR\.?$/i, score: 45, desc: "Name with Jr. suffix" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+\s+SR\.?$/i, score: 45, desc: "Name with Sr. suffix" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+\s+III$/i, score: 45, desc: "Name with III suffix" }
  ];

  for (const { pattern, score, desc } of namePatterns) {
    if (pattern.test(payeeName)) {
      matchingRules.push(desc);
      individualScore += score;
      break; // Only count first matching pattern
    }
  }

  // 3. Individual-specific patterns
  const individualPatterns = [
    { test: () => /'\s*s\b/.test(payeeName), score: 25, desc: "Possessive form (individual proprietor)" },
    { test: () => payeeName !== payeeName.toUpperCase() && payeeName !== payeeName.toLowerCase() && words.length <= 3, score: 20, desc: "Mixed case personal name" },
    { test: () => words.length === 2 && /^[A-Z][a-z]+$/.test(words[0]) && /^[A-Z][a-z]+$/.test(words[1]), score: 30, desc: "Proper case two-word name" },
    { test: () => /\b(ESTATE|TRUST)\s+OF\b/.test(name), score: 35, desc: "Estate or trust of individual" }
  ];

  for (const pattern of individualPatterns) {
    if (pattern.test()) {
      matchingRules.push(pattern.desc);
      individualScore += pattern.score;
    }
  }

  // DECISION LOGIC (More aggressive - lower thresholds)
  const minThreshold = 25; // Lowered threshold for better coverage
  
  if (businessScore >= minThreshold && businessScore > individualScore) {
    const confidence = Math.min(95, 60 + Math.round((businessScore / (businessScore + individualScore)) * 35));
    return {
      classification: 'Business',
      confidence,
      reasoning: `Enhanced rule-based classification as Business (score: ${businessScore} vs ${individualScore}). Rules: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules,
      processingMethod: 'Enhanced balanced rule classification'
    };
  } else if (individualScore >= minThreshold && individualScore > businessScore) {
    const confidence = Math.min(95, 60 + Math.round((individualScore / (businessScore + individualScore)) * 35));
    return {
      classification: 'Individual',
      confidence,
      reasoning: `Enhanced rule-based classification as Individual (score: ${individualScore} vs ${businessScore}). Rules: ${matchingRules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules,
      processingMethod: 'Enhanced balanced rule classification'
    };
  }

  // If still no clear winner, return null to trigger fallback
  return null;
}
