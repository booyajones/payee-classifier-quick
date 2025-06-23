
import { ClassificationResult } from '../types';
import { worldClassClassification } from './worldClassRules';

/**
 * Enhanced rule-only classification using world-class deterministic engine
 * Fallback to original rule-only classification if needed
 */
export async function enhancedRuleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  try {
    // Use world-class classification engine
    const result = await worldClassClassification(payeeName);
    
    // If confidence is very low, enhance with additional heuristics
    if (result.confidence < 60) {
      const enhancedResult = await enhanceWithHeuristics(payeeName, result);
      return enhancedResult;
    }
    
    return result;
  } catch (error) {
    console.error('[ENHANCED-RULE-ONLY] Error in world-class classification:', error);
    
    // Fallback to simple rule-based classification
    return await fallbackClassification(payeeName);
  }
}

/**
 * Enhanced heuristics for low-confidence cases
 */
async function enhanceWithHeuristics(payeeName: string, baseResult: ClassificationResult): Promise<ClassificationResult> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  let additionalScore = 0;
  const additionalRules: string[] = [];
  
  // Business heuristics
  if (words.length >= 3 && !/^(MR|MRS|MS|DR|PROF)/.test(name)) {
    additionalScore += 20;
    additionalRules.push('Multi-word non-personal name pattern');
  }
  
  if (name.includes('&') || name.includes('AND')) {
    additionalScore += 25;
    additionalRules.push('Partnership indicators');
  }
  
  if (/\b\d{3,}\b/.test(name)) {
    additionalScore += 15;
    additionalRules.push('Numeric identifiers');
  }
  
  // Individual heuristics
  if (words.length === 2 && !/(LLC|INC|CORP|LTD|CO)$/.test(name)) {
    additionalScore -= 10; // Slight bias toward individual
    additionalRules.push('Simple two-word name');
  }
  
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(payeeName)) {
    additionalScore -= 15; // Proper case suggests individual
    additionalRules.push('Proper case personal name format');
  }
  
  const enhancedConfidence = Math.min(95, baseResult.confidence + Math.abs(additionalScore) * 0.5);
  const finalClassification = additionalScore > 0 ? 'Business' : 
                              additionalScore < 0 ? 'Individual' : 
                              baseResult.classification;
  
  return {
    classification: finalClassification,
    confidence: Math.round(enhancedConfidence),
    reasoning: `${baseResult.reasoning} Enhanced with heuristics: ${additionalRules.join(', ')}`,
    processingTier: 'Rule-Based',
    matchingRules: [...(baseResult.matchingRules || []), ...additionalRules],
    processingMethod: 'Enhanced world-class deterministic engine'
  };
}

/**
 * Fallback classification for error cases
 */
async function fallbackClassification(payeeName: string): Promise<ClassificationResult> {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  
  // Simple business indicators
  const businessIndicators = ['LLC', 'INC', 'CORP', 'LTD', 'CO', 'COMPANY', 'SERVICES', 'GROUP'];
  const hasBusinessIndicator = businessIndicators.some(indicator => name.includes(indicator));
  
  if (hasBusinessIndicator) {
    return {
      classification: 'Business',
      confidence: 75,
      reasoning: 'Fallback classification based on business indicators',
      processingTier: 'Rule-Based',
      processingMethod: 'Fallback deterministic classification'
    };
  }
  
  // Default to individual for simple names
  if (words.length <= 3) {
    return {
      classification: 'Individual',
      confidence: 65,
      reasoning: 'Fallback classification for simple name pattern',
      processingTier: 'Rule-Based',
      processingMethod: 'Fallback deterministic classification'
    };
  }
  
  // Multi-word names without clear indicators
  return {
    classification: 'Business',
    confidence: 60,
    reasoning: 'Fallback classification for multi-word name',
    processingTier: 'Rule-Based',
    processingMethod: 'Fallback deterministic classification'
  };
}

/**
 * Batch processing with enhanced rule-only classification
 */
export async function enhancedBatchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[ENHANCED-BATCH-RULE-ONLY] Processing ${payeeNames.length} payees with world-class classification`);
  
  const results: ClassificationResult[] = [];
  const startTime = Date.now();
  
  for (let i = 0; i < payeeNames.length; i++) {
    if (i % 100 === 0) {
      console.log(`[ENHANCED-BATCH-RULE-ONLY] Progress: ${i}/${payeeNames.length} (${Math.round((i / payeeNames.length) * 100)}%)`);
    }
    
    const result = await enhancedRuleOnlyClassification(payeeNames[i]);
    results.push(result);
  }
  
  const processingTime = Date.now() - startTime;
  console.log(`[ENHANCED-BATCH-RULE-ONLY] Completed ${results.length} classifications in ${processingTime}ms (${(processingTime / results.length).toFixed(2)}ms per classification)`);
  
  return results;
}
