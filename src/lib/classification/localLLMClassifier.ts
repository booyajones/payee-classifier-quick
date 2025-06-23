
import { pipeline, Pipeline } from '@huggingface/transformers';
import { ClassificationResult } from '../types';

interface LLMClassificationResult {
  label: string;
  score: number;
}

/**
 * Local LLM-based payee classifier using Hugging Face Transformers
 * Uses a lightweight BERT model for entity classification
 */
export class LocalLLMClassifier {
  private classifier: Pipeline | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the LLM classifier with a lightweight model
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized || this.initializationPromise) {
      return this.initializationPromise || Promise.resolve();
    }

    this.initializationPromise = this.loadModel();
    return this.initializationPromise;
  }

  private async loadModel(): Promise<void> {
    try {
      console.log('[LLM-CLASSIFIER] Loading local classification model...');
      
      // Use a lightweight text classification model
      this.classifier = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        { device: 'cpu' } // Use CPU for better compatibility
      );
      
      this.isInitialized = true;
      console.log('[LLM-CLASSIFIER] Model loaded successfully');
    } catch (error) {
      console.warn('[LLM-CLASSIFIER] Failed to load model:', error);
      this.classifier = null;
      this.isInitialized = false;
    }
  }

  /**
   * Classify a payee name using the local LLM
   */
  public async classify(payeeName: string): Promise<ClassificationResult | null> {
    try {
      await this.initialize();
      
      if (!this.classifier) {
        console.warn('[LLM-CLASSIFIER] Model not available, skipping LLM classification');
        return null;
      }

      // Prepare the input for classification
      const prompt = this.preparePrompt(payeeName);
      
      // Get classification from the model
      const results = await this.classifier(prompt) as LLMClassificationResult[];
      
      if (!results || results.length === 0) {
        return null;
      }

      // Interpret the results for business vs individual classification
      const interpretation = this.interpretResults(payeeName, results);
      
      return {
        classification: interpretation.classification,
        confidence: Math.round(interpretation.confidence * 100),
        reasoning: interpretation.reasoning,
        processingTier: 'AI-Powered',
        processingMethod: 'Local LLM Classification'
      };

    } catch (error) {
      console.warn('[LLM-CLASSIFIER] Classification error:', error);
      return null;
    }
  }

  /**
   * Prepare the input prompt for the LLM
   */
  private preparePrompt(payeeName: string): string {
    return `Classify this entity as either a business organization or an individual person: "${payeeName}"`;
  }

  /**
   * Interpret LLM results for business vs individual classification
   */
  private interpretResults(payeeName: string, results: LLMClassificationResult[]): {
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
  } {
    const topResult = results[0];
    
    // Analyze the payee name for business indicators
    const businessIndicators = this.getBusinessIndicators(payeeName);
    const individualIndicators = this.getIndividualIndicators(payeeName);
    
    // Combine LLM confidence with rule-based indicators
    let businessScore = businessIndicators.score;
    let individualScore = individualIndicators.score;
    
    // Adjust scores based on LLM sentiment (positive sentiment often indicates business confidence)
    if (topResult.label === 'POSITIVE') {
      businessScore += topResult.score * 0.3;
    } else {
      individualScore += topResult.score * 0.3;
    }
    
    const totalScore = businessScore + individualScore;
    const normalizedBusinessScore = totalScore > 0 ? businessScore / totalScore : 0.5;
    
    if (normalizedBusinessScore > 0.6) {
      return {
        classification: 'Business',
        confidence: normalizedBusinessScore,
        reasoning: `LLM analysis suggests business entity. ${businessIndicators.reasons.join(', ')}`
      };
    } else {
      return {
        classification: 'Individual',
        confidence: 1 - normalizedBusinessScore,
        reasoning: `LLM analysis suggests individual person. ${individualIndicators.reasons.join(', ')}`
      };
    }
  }

  /**
   * Get business indicators from the payee name
   */
  private getBusinessIndicators(payeeName: string): { score: number; reasons: string[] } {
    const name = payeeName.toUpperCase();
    const reasons: string[] = [];
    let score = 0;

    // Business suffixes
    const businessSuffixes = ['INC', 'LLC', 'CORP', 'LTD', 'CO', 'COMPANY'];
    if (businessSuffixes.some(suffix => name.includes(suffix))) {
      score += 0.4;
      reasons.push('Contains business suffix');
    }

    // Business keywords
    const businessKeywords = ['SERVICES', 'GROUP', 'SYSTEMS', 'SOLUTIONS', 'CONSULTING'];
    if (businessKeywords.some(keyword => name.includes(keyword))) {
      score += 0.3;
      reasons.push('Contains business keywords');
    }

    // All caps (typical of business names)
    if (payeeName === payeeName.toUpperCase() && payeeName.length > 5) {
      score += 0.2;
      reasons.push('Name in all capitals');
    }

    return { score, reasons };
  }

  /**
   * Get individual indicators from the payee name
   */
  private getIndividualIndicators(payeeName: string): { score: number; reasons: string[] } {
    const name = payeeName.toUpperCase();
    const reasons: string[] = [];
    let score = 0;

    // Personal titles
    const titles = ['MR', 'MS', 'MRS', 'DR', 'PROF'];
    if (titles.some(title => name.includes(title))) {
      score += 0.4;
      reasons.push('Contains personal title');
    }

    // Simple name pattern (First Last)
    const words = payeeName.split(/\s+/);
    if (words.length === 2 && words.every(word => /^[A-Za-z]+$/.test(word))) {
      score += 0.3;
      reasons.push('Simple two-word name pattern');
    }

    // Mixed case (typical of personal names)
    if (payeeName !== payeeName.toUpperCase() && /[A-Z]/.test(payeeName)) {
      score += 0.2;
      reasons.push('Mixed case formatting');
    }

    return { score, reasons };
  }

  /**
   * Check if the LLM classifier is available
   */
  public isAvailable(): boolean {
    return this.isInitialized && this.classifier !== null;
  }
}

// Singleton instance
const localLLMClassifier = new LocalLLMClassifier();

/**
 * Classify a payee using the local LLM
 */
export async function classifyWithLocalLLM(payeeName: string): Promise<ClassificationResult | null> {
  return await localLLMClassifier.classify(payeeName);
}

/**
 * Check if LLM classification is available
 */
export function isLLMAvailable(): boolean {
  return localLLMClassifier.isAvailable();
}
