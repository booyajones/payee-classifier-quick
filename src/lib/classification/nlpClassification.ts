
import { ClassificationResult } from '../types';
import { probablepeople } from './probablepeople';

export async function classifyWithNLP(payeeName: string): Promise<ClassificationResult> {
  try {
    const parsedName = probablepeople.tag(payeeName);

    if (parsedName && parsedName.type === 'Corporation') {
      return {
        classification: 'Business',
        confidence: Math.max(85, Math.round(parsedName.confidence * 100)),
        reasoning: `Enhanced probablepeople identified as Corporation with confidence ${parsedName.confidence.toFixed(2)}`,
        processingTier: 'NLP-Based',
        processingMethod: 'enhanced-probablepeople'
      };
    } else if (parsedName && parsedName.type === 'Person') {
      return {
        classification: 'Individual',
        confidence: Math.max(85, Math.round(parsedName.confidence * 100)),
        reasoning: `Enhanced probablepeople identified as Person with confidence ${parsedName.confidence.toFixed(2)}`,
        processingTier: 'NLP-Based',
        processingMethod: 'enhanced-probablepeople'
      };
    } else {
      return {
        classification: 'Individual',
        confidence: 85,
        reasoning: 'Enhanced probablepeople could not confidently classify, defaulted to Individual',
        processingTier: 'NLP-Based',
        processingMethod: 'enhanced-probablepeople'
      };
    }
  } catch (error) {
    console.error("Error in NLP classification:", error);
    return {
      classification: 'Individual',
      confidence: 85,
      reasoning: `NLP classification failed: ${error}`,
      processingTier: 'Failed',
      processingMethod: 'NLP Fallback'
    };
  }
}

// Export for backward compatibility
export const applyNLPClassification = classifyWithNLP;
