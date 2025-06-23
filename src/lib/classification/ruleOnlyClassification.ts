
import { ClassificationResult } from '../types';
import { enhancedRuleOnlyClassification, enhancedBatchRuleOnlyClassification } from './enhancedRuleOnlyClassification';

/**
 * OVERHAULED Pure rule-based classification without any AI dependencies
 * Now powered by fixed individual detection engine
 */
export async function ruleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  console.log(`[RULE-ONLY] Processing "${payeeName}" with overhauled engine`);
  return await enhancedRuleOnlyClassification(payeeName);
}

/**
 * OVERHAULED Batch rule-only classification for multiple payees
 * Now powered by fixed individual detection engine
 */
export async function batchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[BATCH-RULE-ONLY] Processing ${payeeNames.length} payees with overhauled classification`);
  return await enhancedBatchRuleOnlyClassification(payeeNames);
}
