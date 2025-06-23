
import { ClassificationResult, ClassificationConfig } from '../types';
import { applyAIClassification } from './aiClassification';

/**
 * Classify a single payee using the local AI-assisted heuristic
 */
export async function classifyPayee(
  payeeName: string,
  _config: ClassificationConfig
): Promise<ClassificationResult> {
  console.log(`Classifying "${payeeName}" with local AI heuristic`);

  try {
    const result = await applyAIClassification(payeeName);
    return result;
  } catch (error) {
    console.error(`Error classifying ${payeeName}:`, error);
    throw error;
  }
}

/**
 * Get confidence level description
 */
export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 80) return 'High';
  if (confidence >= 70) return 'Medium';
  if (confidence >= 60) return 'Low';
  return 'Very Low';
}
