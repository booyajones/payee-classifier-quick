
import { ClassificationResult } from '../types';
import { enhancedDeterministicClassifyPayee } from './enhancedDeterministicClassifier';

/**
 * Simplified pure rule-based classification using enhanced probablepeople
 */
export async function ruleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  console.log(`[RULE-ONLY-SIMPLIFIED] Processing "${payeeName}" with enhanced probablepeople`);
  
  const result = enhancedDeterministicClassifyPayee(payeeName);
  
  // Convert DeterministicResult to ClassificationResult
  return {
    classification: result.classification,
    confidence: result.confidence,
    reasoning: result.reasoning,
    processingTier: 'Rule-Based',
    processingMethod: 'enhanced-deterministic'
  };
}

/**
 * Simplified batch rule-only classification
 */
export async function batchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[BATCH-RULE-ONLY-SIMPLIFIED] Processing ${payeeNames.length} payees with enhanced probablepeople`);
  
  const results: ClassificationResult[] = [];
  
  for (const name of payeeNames) {
    const result = await ruleOnlyClassification(name);
    results.push(result);
  }
  
  console.log(`[BATCH-RULE-ONLY-SIMPLIFIED] Completed processing ${results.length} payees`);
  return results;
}
