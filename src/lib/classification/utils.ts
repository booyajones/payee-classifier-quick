
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { applyAIClassification } from './aiClassification';

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
 * Main classification function that implements the tiered approach
 * Updated to support configuration options
 */
export async function classifyPayee(
  payeeName: string, 
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
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

  // If we're bypassing rule-based and NLP classification, go straight to AI
  if (config.bypassRuleNLP) {
    return await applyAIClassification(payeeName);
  }

  // Tier 1: Apply rule-based classification
  const ruleBasedResult = applyRuleBasedClassification(payeeName);
  if (ruleBasedResult && ruleBasedResult.confidence >= config.aiThreshold) {
    return ruleBasedResult;
  }

  // Tier 2: Apply NLP-based classification
  const nlpResult = applyNLPClassification(payeeName);
  if (nlpResult && nlpResult.confidence >= config.aiThreshold) {
    return nlpResult;
  }

  // Tier 3: Apply AI-assisted classification (now asynchronous)
  return await applyAIClassification(payeeName);
}
