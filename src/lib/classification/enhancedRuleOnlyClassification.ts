
import { ClassificationResult } from '../types';
import { worldClassClassification } from './worldClassRules';

/**
 * OVERHAULED Enhanced rule-only classification
 * Fixed individual detection and removed excessive fallbacks
 */
export async function enhancedRuleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  try {
    console.log(`[ENHANCED-RULE-ONLY] Processing "${payeeName}"`);
    
    // Use the overhauled world-class classification engine
    const result = await worldClassClassification(payeeName);
    
    console.log(`[ENHANCED-RULE-ONLY] Result: ${result.classification} (${result.confidence}%)`);
    
    // Only enhance if confidence is very low (< 50)
    if (result.confidence < 50) {
      const enhancedResult = await applyAdditionalHeuristics(payeeName, result);
      console.log(`[ENHANCED-RULE-ONLY] Enhanced result: ${enhancedResult.classification} (${enhancedResult.confidence}%)`);
      return enhancedResult;
    }
    
    return result;
  } catch (error) {
    console.error('[ENHANCED-RULE-ONLY] Error in classification:', error);
    
    // Simple fallback - default to Individual for safety
    return await simpleFallbackClassification(payeeName);
  }
}

/**
 * Additional heuristics for very low confidence cases
 */
async function applyAdditionalHeuristics(payeeName: string, baseResult: ClassificationResult): Promise<ClassificationResult> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  let additionalScore = 0;
  const additionalRules: string[] = [];
  
  // Heuristic 1: Numbers often indicate businesses
  if (/\b\d+\b/.test(name)) {
    if (words.length >= 3) {
      additionalScore += 15;
      additionalRules.push('Contains numbers with multiple words');
    }
  }
  
  // Heuristic 2: Simple two-word names are often individuals
  if (words.length === 2 && !/(LLC|INC|CORP|LTD|CO)$/.test(name)) {
    additionalScore -= 20; // Bias toward individual
    additionalRules.push('Simple two-word name pattern');
  }
  
  // Heuristic 3: Mixed case suggests individual names  
  if (payeeName !== payeeName.toUpperCase() && words.length <= 3) {
    additionalScore -= 15;
    additionalRules.push('Mixed case personal name format');
  }
  
  // Heuristic 4: Very short names are usually individuals
  if (payeeName.length <= 15 && words.length <= 2) {
    additionalScore -= 10;
    additionalRules.push('Short name likely individual');
  }
  
  // Calculate final classification
  const enhancedConfidence = Math.min(85, baseResult.confidence + Math.abs(additionalScore));
  const finalClassification = additionalScore < -10 ? 'Individual' : 
                              additionalScore > 10 ? 'Business' : 
                              baseResult.classification;
  
  return {
    classification: finalClassification,
    confidence: Math.round(enhancedConfidence),
    reasoning: `${baseResult.reasoning} Enhanced with heuristics: ${additionalRules.join(', ')}`,
    processingTier: 'Rule-Based',
    matchingRules: [...(baseResult.matchingRules || []), ...additionalRules],
    processingMethod: 'Enhanced rule-only with additional heuristics'
  };
}

/**
 * Simple fallback for error cases - bias toward Individual
 */
async function simpleFallbackClassification(payeeName: string): Promise<ClassificationResult> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  
  // Check for obvious business indicators
  const businessIndicators = ['LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'SERVICES', 'GROUP'];
  const hasBusinessIndicator = businessIndicators.some(indicator => name.includes(indicator));
  
  if (hasBusinessIndicator) {
    return {
      classification: 'Business',
      confidence: 70,
      reasoning: 'Fallback classification based on clear business indicators',
      processingTier: 'Rule-Based',
      processingMethod: 'Simple fallback classification'
    };
  }
  
  // Default to Individual (safer for privacy)
  return {
    classification: 'Individual',
    confidence: 60,
    reasoning: `Fallback to Individual classification for "${payeeName}" (${words.length} words)`,
    processingTier: 'Rule-Based',
    processingMethod: 'Conservative fallback classification'
  };
}

/**
 * OVERHAULED Batch processing with better individual detection
 */
export async function enhancedBatchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[ENHANCED-BATCH-RULE-ONLY] Processing ${payeeNames.length} payees with overhauled classification`);
  
  const results: ClassificationResult[] = [];
  const startTime = Date.now();
  
  // Track classification stats
  let individualCount = 0;
  let businessCount = 0;
  
  for (let i = 0; i < payeeNames.length; i++) {
    if (i % 50 === 0) {
      console.log(`[ENHANCED-BATCH-RULE-ONLY] Progress: ${i}/${payeeNames.length} (${Math.round((i / payeeNames.length) * 100)}%)`);
    }
    
    const result = await enhancedRuleOnlyClassification(payeeNames[i]);
    results.push(result);
    
    if (result.classification === 'Individual') {
      individualCount++;
    } else {
      businessCount++;
    }
  }
  
  const processingTime = Date.now() - startTime;
  console.log(`[ENHANCED-BATCH-RULE-ONLY] Completed ${results.length} classifications in ${processingTime}ms`);
  console.log(`[ENHANCED-BATCH-RULE-ONLY] Results: ${individualCount} individuals, ${businessCount} businesses`);
  console.log(`[ENHANCED-BATCH-RULE-ONLY] Average: ${(processingTime / results.length).toFixed(2)}ms per classification`);
  
  return results;
}
