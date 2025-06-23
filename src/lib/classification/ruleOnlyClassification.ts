
import { ClassificationResult } from '../types';
import { LEGAL_SUFFIXES, BUSINESS_KEYWORDS, INDUSTRY_IDENTIFIERS, GOVERNMENT_PATTERNS, PROFESSIONAL_TITLES } from './config';

/**
 * Pure rule-based classification without any AI dependencies
 * Fast, deterministic classification for quick first-pass analysis
 */
export async function ruleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  const matchingRules: string[] = [];
  let businessScore = 0;
  let individualScore = 0;

  console.log(`[RULE-ONLY] Classifying "${payeeName}"`);

  // BUSINESS INDICATORS

  // 1. Legal suffixes (very strong business indicator)
  for (const suffix of LEGAL_SUFFIXES) {
    const suffixRegex = new RegExp(`\\b${suffix}\\b|\\b${suffix}[.,]?$`, 'i');
    if (suffixRegex.test(name)) {
      matchingRules.push(`Legal suffix: ${suffix}`);
      businessScore += 50; // Very strong indicator
      break; // Only count first match
    }
  }

  // 2. Government patterns (strong business indicator)
  for (const pattern of GOVERNMENT_PATTERNS) {
    if (name.includes(pattern)) {
      matchingRules.push(`Government entity: ${pattern}`);
      businessScore += 40;
      break;
    }
  }

  // 3. Business keywords (moderate indicators)
  let businessKeywordMatches = 0;
  for (const keyword of BUSINESS_KEYWORDS) {
    if (name.includes(keyword)) {
      matchingRules.push(`Business keyword: ${keyword}`);
      businessScore += 20;
      businessKeywordMatches++;
      if (businessKeywordMatches >= 2) break; // Limit to avoid over-scoring
    }
  }

  // 4. Industry identifiers (moderate indicators)
  for (const [industry, keywords] of Object.entries(INDUSTRY_IDENTIFIERS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        matchingRules.push(`Industry term (${industry}): ${keyword}`);
        businessScore += 15;
        break; // Only one per industry
      }
    }
  }

  // 5. Additional business patterns
  if (words.length >= 4) {
    matchingRules.push("Multi-word business name (4+ words)");
    businessScore += 10;
  }

  if (payeeName === payeeName.toUpperCase() && payeeName.length > 10) {
    matchingRules.push("All capitals format (typical of businesses)");
    businessScore += 15;
  }

  if (/[&@#]/.test(name)) {
    matchingRules.push("Contains business symbols (&, @, #)");
    businessScore += 10;
  }

  if (/\b\d{3,}\b/.test(name)) {
    matchingRules.push("Contains numeric identifiers");
    businessScore += 10;
  }

  // INDIVIDUAL INDICATORS

  // 1. Professional titles (strong individual indicator)
  for (const title of PROFESSIONAL_TITLES) {
    const titleRegex = new RegExp(`\\b${title}\\b|\\b${title}[.,]`, 'i');
    if (titleRegex.test(name)) {
      matchingRules.push(`Professional title: ${title}`);
      individualScore += 40;
      break;
    }
  }

  // 2. Common name patterns
  const namePatterns = [
    { pattern: /^[A-Za-z]+\s+[A-Za-z]+$/, description: "First Last pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]\s+[A-Za-z]+$/, description: "First Middle Last pattern" },
    { pattern: /^[A-Za-z]+\s+[A-Za-z]\.\s+[A-Za-z]+$/, description: "First M. Last pattern" },
    { pattern: /^[A-Za-z]+,\s*[A-Za-z]+$/, description: "Last, First pattern" }
  ];

  for (const { pattern, description } of namePatterns) {
    if (pattern.test(payeeName)) {
      matchingRules.push(description);
      individualScore += 30;
      break; // Only count first matching pattern
    }
  }

  // 3. Possessive forms (often individual proprietors)
  if (/'\s*s\b/.test(payeeName)) {
    matchingRules.push("Possessive form (individual proprietor)");
    individualScore += 25;
  }

  // 4. Mixed case with reasonable length (typical of personal names)
  if (payeeName !== payeeName.toUpperCase() && 
      payeeName !== payeeName.toLowerCase() && 
      words.length <= 3) {
    matchingRules.push("Mixed case personal name format");
    individualScore += 20;
  }

  // DECISION LOGIC
  const totalScore = businessScore + individualScore;
  let finalClassification: 'Business' | 'Individual';
  let confidence: number;
  let reasoning: string;

  if (businessScore > individualScore && businessScore >= 30) {
    finalClassification = 'Business';
    confidence = Math.min(95, 50 + Math.round((businessScore / totalScore) * 45));
    reasoning = `Rule-based classification as Business (score: ${businessScore}). Matching rules: ${matchingRules.join(", ")}`;
  } else if (individualScore > businessScore && individualScore >= 25) {
    finalClassification = 'Individual';
    confidence = Math.min(95, 50 + Math.round((individualScore / totalScore) * 45));
    reasoning = `Rule-based classification as Individual (score: ${individualScore}). Matching rules: ${matchingRules.join(", ")}`;
  } else if (businessScore === individualScore) {
    // Tie-breaker: default to Individual for privacy safety
    finalClassification = 'Individual';
    confidence = 40;
    reasoning = `Tie between indicators (Business: ${businessScore}, Individual: ${individualScore}). Defaulted to Individual for privacy safety.`;
  } else {
    // Low confidence classification
    finalClassification = businessScore > individualScore ? 'Business' : 'Individual';
    confidence = 35;
    reasoning = `Low-confidence classification as ${finalClassification} (Business: ${businessScore}, Individual: ${individualScore}). Rules: ${matchingRules.join(", ") || "None matched"}`;
  }

  console.log(`[RULE-ONLY] "${payeeName}" -> ${finalClassification} (${confidence}%)`);
  
  return {
    classification: finalClassification,
    confidence,
    reasoning,
    processingTier: 'Rule-Based',
    matchingRules,
    processingMethod: 'Pure rule-based classification'
  };
}

/**
 * Batch rule-only classification for multiple payees
 */
export async function batchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[RULE-ONLY BATCH] Processing ${payeeNames.length} payees with rule-based classification only`);
  
  const results: ClassificationResult[] = [];
  
  for (let i = 0; i < payeeNames.length; i++) {
    if (i % 100 === 0) {
      console.log(`[RULE-ONLY BATCH] Progress: ${i}/${payeeNames.length} (${Math.round((i / payeeNames.length) * 100)}%)`);
    }
    
    const result = await ruleOnlyClassification(payeeNames[i]);
    results.push(result);
  }
  
  console.log(`[RULE-ONLY BATCH] Completed ${results.length} classifications`);
  return results;
}
