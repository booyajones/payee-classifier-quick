
import { ClassificationResult } from '../types';
import { probablepeople } from './probablepeople';

export async function classifyWithNLP(payeeName: string): Promise<ClassificationResult> {
  try {
    const parsedName = probablepeople.tag(payeeName);

    if (parsedName && parsedName.type === 'Corporation') {
      return {
        classification: 'Business',
        confidence: parsedName.confidence * 0.9,
        reasoning: `Probablepeople identified as Corporation with confidence ${parsedName.confidence}`,
        processingTier: 'NLP-Based',
        processingMethod: 'probablepeople'
      };
    } else if (parsedName && parsedName.type === 'Person') {
      return {
        classification: 'Individual',
        confidence: parsedName.confidence * 0.9,
        reasoning: `Probablepeople identified as Person with confidence ${parsedName.confidence}`,
        processingTier: 'NLP-Based',
        processingMethod: 'probablepeople'
      };
    } else {
      return {
        classification: 'Individual',
        confidence: 0.5,
        reasoning: 'Probablepeople could not confidently classify',
        processingTier: 'NLP-Based',
        processingMethod: 'probablepeople'
      };
    }
  } catch (error) {
    console.error("Error in NLP classification:", error);
    return {
      classification: 'Individual',
      confidence: 0.3,
      reasoning: `NLP classification failed: ${error}`,
      processingTier: 'Failed',
      processingMethod: 'NLP Fallback'
    };
  }
}

// Export for backward compatibility
export const applyNLPClassification = classifyWithNLP;
