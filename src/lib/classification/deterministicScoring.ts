
import { FeatureFlags, LibrarySimulation, DeterministicResult } from './deterministicTypes';

/**
 * Phase D: Calculate Weighted Score & Make Decision
 * Updated scoring based on comprehensive training data analysis
 */
export function calculateScoreAndDecision(features: FeatureFlags, library: LibrarySimulation): DeterministicResult {
  // Updated scoring based on training data patterns
  const score = 
    (+0.70 * (features.has_business_suffix ? 1 : 0)) +         // Very strong indicator
    (+0.50 * (features.contains_business_keyword ? 1 : 0)) +   // Strong indicator
    (+0.25 * (features.has_ampersand_or_and ? 1 : 0)) +       // Moderate indicator
    (+0.22 * library.spacy_org_prob) +                        // Library support
    (+0.15 * (features.looks_like_tax_id ? 1 : 0)) +          // Weak indicator
    (-0.60 * (features.has_first_name_match ? 1 : 0)) +       // Very strong penalty
    (-0.45 * (features.has_honorific ? 1 : 0)) +              // Strong penalty  
    (-0.32 * library.spacy_person_prob) +                     // Library penalty
    (-0.22 * (features.has_generation_suffix ? 1 : 0)) +      // Moderate penalty
    (-0.18 * (features.token_count === 2 ? 1 : 0));           // Slight penalty for simple names

  // Enhanced decision rule based on training data
  let entity_type: 'individual' | 'business';
  
  if (score >= 0.25) {  // Clear business threshold
    entity_type = 'business';
  } else if (score <= -0.25) {  // Clear individual threshold
    entity_type = 'individual';
  } else {
    // Improved tie-breaking logic
    if (features.has_first_name_match && features.token_count <= 3 && !features.contains_business_keyword && !features.has_business_suffix) {
      entity_type = 'individual';
    } else if (features.contains_business_keyword || features.has_business_suffix) {
      entity_type = 'business';
    } else {
      entity_type = library.spacy_org_prob > library.spacy_person_prob ? 'business' : 'individual';
    }
  }
  
  // Enhanced confidence calibration
  const confidence = Math.min(1.0, 0.62 + (0.33 * Math.abs(score)));
  
  // Generate rationale
  const rationale = generateRationale(features, library, score);
  
  return {
    entity_type,
    confidence,
    rationale
  };
}

/**
 * Phase E: Construct Rationale
 */
function generateRationale(features: FeatureFlags, library: LibrarySimulation, score: number): string {
  const signals: string[] = [];
  
  // Prioritize strongest signals based on training data
  if (features.has_business_suffix) signals.push('business suffix');
  if (features.contains_business_keyword) signals.push('business keyword');
  if (features.has_first_name_match) signals.push('first name match');
  if (features.has_honorific) signals.push('honorific title');
  if (features.has_ampersand_or_and) signals.push('AND/& operator');
  if (library.spacy_org_prob > 0.6) signals.push('ORG NER detection');
  if (library.spacy_person_prob > 0.6) signals.push('PERSON NER detection');
  if (features.has_generation_suffix) signals.push('generation suffix');
  if (features.looks_like_tax_id) signals.push('tax ID pattern');
  
  // Take top 2-4 most impactful signals
  const topSignals = signals.slice(0, Math.min(4, signals.length));
  
  if (topSignals.length === 0) {
    return 'Token patterns and library analysis.';
  }
  
  return `${topSignals.join(', ')} detected.`;
}
