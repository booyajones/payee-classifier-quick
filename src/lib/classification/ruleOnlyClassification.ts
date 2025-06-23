
import { ClassificationResult } from '../types';
import { enhancedRuleOnlyClassification, enhancedBatchRuleOnlyClassification } from './enhancedRuleOnlyClassification';

/**
 * Pure rule-based classification without any AI dependencies
 * Now powered by world-class deterministic engine
 */
export async function ruleOnlyClassification(payeeName: string): Promise<ClassificationResult> {
  return await enhancedRuleOnlyClassification(payeeName);
}

/**
 * Batch rule-only classification for multiple payees
 * Now powered by world-class deterministic engine
 */
export async function batchRuleOnlyClassification(payeeNames: string[]): Promise<ClassificationResult[]> {
  return await enhancedBatchRuleOnlyClassification(payeeNames);
}
