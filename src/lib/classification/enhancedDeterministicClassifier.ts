
import { DeterministicResult } from './enhancedDeterministicTypes';
import { normalize } from './enhancedDeterministicNormalizer';
import { getLocalLibrarySignals } from './enhancedDeterministicLibrary';
import { getFeatureFlags } from './enhancedDeterministicFeatures';
import { calculateScore, makeDecision, calculateConfidence, generateRationale } from './enhancedDeterministicScoring';

export class EnhancedDeterministicClassifier {
  static classify(payeeName: string): DeterministicResult {
    const cleanName = normalize(payeeName);
    const signals = getLocalLibrarySignals(cleanName);
    const features = getFeatureFlags(cleanName, signals);
    const score = calculateScore(features);
    const classification = makeDecision(score, signals, features);
    const confidence = calculateConfidence(score, features, signals);
    const rationale = generateRationale(features, signals);

    return {
      classification,
      confidence,
      rationale,
      processingTier: 'Deterministic-Enhanced',
      metadata: {
        score,
        features,
        signals,
        normalizedName: cleanName
      }
    };
  }
}

export function enhancedDeterministicClassifyPayee(payeeName: string): DeterministicResult {
  return EnhancedDeterministicClassifier.classify(payeeName);
}

export function getEnhancedDeterministicJSON(payeeName: string): string {
  const result = enhancedDeterministicClassifyPayee(payeeName);
  return JSON.stringify(result, null, 2);
}
