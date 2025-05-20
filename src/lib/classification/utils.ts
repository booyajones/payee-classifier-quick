
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { applyAIClassification } from './aiClassification';
import { enhancedClassifyPayee } from './enhancedClassification';

/**
 * Get confidence level category based on numeric confidence
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'verylow' {
  if (confidence >= 90) return 'high';
  if (confidence >= 75) return 'medium';
  if (confidence >= 60) return 'low';
  return 'verylow';
}

/**
 * Main classification function that implements the blended approach
 * Updated to use AI-only by default and disable enhanced mode
 */
export async function classifyPayee(
  payeeName: string, 
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG,
  useEnhanced: boolean = false // Default to not using enhanced mode
): Promise<ClassificationResult> {
  // Check if name is empty or invalid
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual', // Default
      confidence: 0,
      reasoning: "Invalid or empty payee name",
      processingTier: 'Rule-Based'
    };
  }

  // Use the enhanced classification if specifically requested
  if (useEnhanced) {
    return await enhancedClassifyPayee(payeeName, config);
  }

  // Default to always use AI for more accurate classification
  // This ensures business names are more accurately detected
  return await applyAIClassification(payeeName);
}
