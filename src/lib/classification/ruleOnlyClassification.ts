
import { ClassificationResult } from '../types';
import { enhancedClassifyPayeeV3 } from './enhancedClassificationV3';

/**
 * FIXED Pure rule-based classification using the V3 engine
 * Now properly detects individuals vs businesses
 */
export async function ruleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  console.log(`[RULE-ONLY-FIXED] Processing "${payeeName}" with V3 engine`);
  return await enhancedClassifyPayeeV3(payeeName, {
    offlineMode: true,
    aiThreshold: 100 // Force rule-based only
  } as any);
}

/**
 * FIXED Batch rule-only classification using V3 engine
 */
export async function batchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[BATCH-RULE-ONLY-FIXED] Processing ${payeeNames.length} payees with V3 engine`);
  
  const results: ClassificationResult[] = [];
  
  for (const name of payeeNames) {
    const result = await ruleOnlyClassification(name);
    results.push(result);
  }
  
  return results;
}
