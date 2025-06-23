
import { ClassificationResult } from '../types';
import { DeterministicResult } from './deterministicTypes';
import { normalizePayeeName } from './deterministicNormalizer';
import { simulateLibraryPasses } from './deterministicLibrarySimulation';
import { generateFeatureFlags } from './deterministicFeatures';
import { calculateScoreAndDecision } from './deterministicScoring';

/**
 * Specialized, deterministic payee-name classifier following the exact algorithm specification
 * Updated with comprehensive first names and better scoring based on training data
 */
export class DeterministicPayeeClassifier {
  
  /**
   * Main classification method
   */
  public classify(input: string): DeterministicResult {
    // Handle empty input
    if (!input || input.trim() === '') {
      return {
        entity_type: 'business',
        confidence: 0.0,
        rationale: 'Input string was empty.'
      };
    }

    // Phase A: Normalization
    const cleanName = normalizePayeeName(input);
    
    // Phase B: Simulate Library Passes
    const libraryResults = simulateLibraryPasses(cleanName);
    
    // Phase C: Generate Feature Flags
    const features = generateFeatureFlags(cleanName);
    
    // Phase D: Calculate Score & Decision
    const result = calculateScoreAndDecision(features, libraryResults);
    
    return result;
  }
}

/**
 * Convert deterministic result to standard ClassificationResult format
 */
export function deterministicClassifyPayee(payeeName: string): ClassificationResult {
  const classifier = new DeterministicPayeeClassifier();
  const result = classifier.classify(payeeName);
  
  return {
    classification: result.entity_type === 'business' ? 'Business' : 'Individual',
    confidence: Math.round(result.confidence * 100),
    reasoning: result.rationale,
    processingTier: 'Deterministic',
    processingMethod: 'Specialized Deterministic Classifier'
  };
}

/**
 * Get raw JSON output as specified in the contract
 */
export function getDeterministicJSON(payeeName: string): string {
  const classifier = new DeterministicPayeeClassifier();
  const result = classifier.classify(payeeName);
  
  return JSON.stringify({
    entity_type: result.entity_type,
    confidence: Math.round(result.confidence * 100) / 100, // Round to 2 decimal places
    rationale: result.rationale
  });
}
