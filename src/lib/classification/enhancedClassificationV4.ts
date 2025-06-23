
import { ClassificationResult, ClassificationConfig } from '../types';
import { deterministicClassifyPayee } from './deterministicClassifier';
import { worldClassClassification } from './worldClassRules';
import { applyRuleBasedClassification } from './ruleBasedClassification';

/**
 * Enhanced Classification V4 - Uses the new deterministic classifier as primary method
 */
export async function enhancedClassifyPayeeV4(
  payeeName: string,
  config: ClassificationConfig = {}
): Promise<ClassificationResult> {
  
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: 'Empty or invalid payee name',
      processingTier: 'Rule-Based',
      processingMethod: 'Input validation'
    };
  }

  const cleanedName = payeeName.trim();
  console.log(`[ENHANCED-V4] Classifying "${cleanedName}"`);

  try {
    // Step 1: Try deterministic classifier first (highest accuracy)
    const deterministicResult = deterministicClassifyPayee(cleanedName);
    
    // If deterministic classifier has high confidence (>= 80%), use it
    if (deterministicResult.confidence >= 80) {
      console.log(`[ENHANCED-V4] Deterministic result: ${deterministicResult.classification} (${deterministicResult.confidence}%)`);
      return {
        ...deterministicResult,
        processingTier: 'Deterministic-Primary'
      };
    }

    // Step 2: Try world-class rules as backup
    const worldClassResult = await worldClassClassification(cleanedName);
    if (worldClassResult.confidence >= 80) {
      console.log(`[ENHANCED-V4] World-class result: ${worldClassResult.classification} (${worldClassResult.confidence}%)`);
      return {
        ...worldClassResult,
        processingTier: 'Rule-Based-Backup'
      };
    }

    // Step 3: Try rule-based classification as final backup  
    const ruleBasedResult = await applyRuleBasedClassification(cleanedName);
    if (ruleBasedResult && ruleBasedResult.confidence >= 70) {
      console.log(`[ENHANCED-V4] Rule-based result: ${ruleBasedResult.classification} (${ruleBasedResult.confidence}%)`);
      return {
        ...ruleBasedResult,
        processingTier: 'Rule-Based-Final'
      };
    }

    // Step 4: Return deterministic result even if confidence is lower
    console.log(`[ENHANCED-V4] Using deterministic result despite lower confidence: ${deterministicResult.confidence}%`);
    return {
      ...deterministicResult,
      processingTier: 'Deterministic-Fallback',
      reasoning: `${deterministicResult.reasoning} (Lower confidence fallback)`
    };

  } catch (error) {
    console.error(`[ENHANCED-V4] Error classifying "${cleanedName}":`, error);
    
    // Ultimate fallback
    return {
      classification: 'Business',
      confidence: 75,
      reasoning: 'Error occurred, defaulting to business classification',
      processingTier: 'Error-Fallback',
      processingMethod: 'Exception handling'
    };
  }
}

/**
 * Batch processing using V4 classifier
 */
export async function batchClassifyV4(payeeNames: string[]): Promise<ClassificationResult[]> {
  console.log(`[BATCH-V4] Processing ${payeeNames.length} payees`);
  
  const results: ClassificationResult[] = [];
  
  for (const name of payeeNames) {
    const result = await enhancedClassifyPayeeV4(name);
    results.push(result);
  }
  
  return results;
}
