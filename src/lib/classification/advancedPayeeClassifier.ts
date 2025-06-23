
import { ClassificationResult } from '../types';

// Common first names for individual detection
const COMMON_FIRST_NAMES = new Set([
  'JAMES', 'JOHN', 'ROBERT', 'MICHAEL', 'WILLIAM', 'DAVID', 'RICHARD', 'JOSEPH', 'THOMAS', 'CHARLES',
  'MARY', 'PATRICIA', 'LINDA', 'BARBARA', 'ELIZABETH', 'JENNIFER', 'MARIA', 'SUSAN', 'MARGARET', 'DOROTHY',
  'JOSE', 'JUAN', 'FRANCISCO', 'ANTONIO', 'MANUEL', 'PEDRO', 'LUIS', 'JORGE', 'MIGUEL', 'CARLOS',
  'ANA', 'CARMEN', 'JOSEFA', 'ISABEL', 'DOLORES', 'PILAR', 'TERESA', 'ROSA', 'ANGELES'
]);

interface ClassifierFeatures {
  has_business_suffix: boolean;
  has_estate_or_trustee: boolean;
  has_honorific: boolean;
  has_generation_suffix: boolean;
  has_ampersand_or_and: boolean;
  has_comma_inside: boolean;
  token_count: number;
  has_first_name_match: boolean;
  all_tokens_alpha: boolean;
  looks_like_tax_id: boolean;
  contains_business_keyword: boolean;
  spacy_org_conf: number;
  spacy_person_conf: number;
}

interface ClassifierResult {
  entity_type: 'individual' | 'business';
  confidence: number;
  rationale: string;
}

/**
 * Advanced payee classifier following the detailed specification
 */
export class AdvancedPayeeClassifier {
  
  /**
   * Step 1: Normalize the input string
   */
  private normalize(input: string): string {
    // Upper-case
    let normalized = input.toUpperCase();
    
    // Strip accents
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Collapse spaces
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    // Drop punctuation except & and '
    normalized = normalized.replace(/[^\w\s&']/g, " ");
    
    // Replace & with AND
    normalized = normalized.replace(/&/g, "AND");
    
    // Final cleanup
    normalized = normalized.replace(/\s+/g, " ").trim();
    
    return normalized;
  }

  /**
   * Step 2: Library passes (simplified for offline mode)
   */
  private getLibraryGuesses(normalized: string): { business_prob: number; individual_prob: number } {
    // Simplified probablepeople-like logic
    const businessKeywords = ['LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'CO', 'SERVICES', 'GROUP'];
    const hasBusinessKeyword = businessKeywords.some(keyword => normalized.includes(keyword));
    
    if (hasBusinessKeyword) {
      return { business_prob: 0.8, individual_prob: 0.2 };
    }
    
    // Simple name pattern check
    const words = normalized.split(/\s+/);
    const hasPersonPattern = words.length >= 2 && words.length <= 4;
    
    if (hasPersonPattern) {
      return { business_prob: 0.3, individual_prob: 0.7 };
    }
    
    return { business_prob: 0.5, individual_prob: 0.5 };
  }

  /**
   * Step 3: Extract binary feature flags
   */
  private extractFeatures(normalized: string): ClassifierFeatures {
    const tokens = normalized.split(/\s+/);
    
    // Business suffixes
    const businessSuffixes = [
      'INC', 'LLC', 'LTD', 'PLC', 'PTY', 'CORP', 'CO', 'COMPANY', 'LLP', 'LP', 
      'PC', 'PLLC', 'BANK', 'TRUST', 'FOUNDATION', 'SOCIETY', 'ASSN', 
      'UNIVERSITY', 'HOSPITAL', 'INSTITUTE', 'CHURCH'
    ];
    
    const has_business_suffix = businessSuffixes.some(suffix => 
      tokens.some(token => token === suffix || token.endsWith(suffix))
    );

    // Estate/trustee indicators
    const estateKeywords = ['ESTATE', 'TTEE', 'TRUSTEE'];
    const has_estate_or_trustee = estateKeywords.some(keyword => normalized.includes(keyword));

    // Honorifics
    const honorifics = ['MR', 'MS', 'MRS', 'DR', 'PROF', 'REV', 'SIR', 'HON'];
    const has_honorific = honorifics.some(title => 
      tokens.some(token => token === title || token.startsWith(title))
    );

    // Generation suffixes
    const generationSuffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V'];
    const has_generation_suffix = generationSuffixes.some(suffix => 
      tokens.some(token => token === suffix)
    );

    // Ampersand or AND
    const has_ampersand_or_and = normalized.includes('AND');

    // Comma inside (not last position)
    const originalWithCommas = normalized.replace(/AND/g, '&'); // Restore for comma check
    const has_comma_inside = originalWithCommas.includes(',') && !originalWithCommas.endsWith(',');

    // Token count
    const token_count = tokens.length;

    // First name match
    const has_first_name_match = tokens.some(token => COMMON_FIRST_NAMES.has(token));

    // All tokens alphabetic
    const all_tokens_alpha = tokens.every(token => /^[A-Z]+$/.test(token));

    // Tax ID pattern (9 consecutive digits)
    const looks_like_tax_id = /\d{9}/.test(normalized);

    // Business keywords
    const businessKeywords = [
      'AUTO', 'PLUMBING', 'TRAVEL', 'CONSULTING', 'SERVICES', 'GROUP', 
      'HOLDINGS', 'PROPERTIES', 'PARTNERS', 'ENTERPRISES'
    ];
    const contains_business_keyword = businessKeywords.some(keyword => normalized.includes(keyword));

    // Simplified spaCy confidence (placeholder)
    const spacy_org_conf = has_business_suffix || contains_business_keyword ? 0.7 : 0.2;
    const spacy_person_conf = has_first_name_match || has_honorific ? 0.8 : 0.3;

    return {
      has_business_suffix,
      has_estate_or_trustee,
      has_honorific,
      has_generation_suffix,
      has_ampersand_or_and,
      has_comma_inside,
      token_count,
      has_first_name_match,
      all_tokens_alpha,
      looks_like_tax_id,
      contains_business_keyword,
      spacy_org_conf,
      spacy_person_conf
    };
  }

  /**
   * Step 4: Calculate weighted score
   */
  private calculateScore(features: ClassifierFeatures): number {
    let score = 0;
    
    // Positive indicators (business)
    score += 0.45 * (features.has_business_suffix ? 1 : 0);
    score += 0.30 * (features.contains_business_keyword ? 1 : 0);
    score += 0.15 * (features.has_ampersand_or_and ? 1 : 0);
    score += 0.10 * features.spacy_org_conf;
    score += 0.10 * (features.looks_like_tax_id ? 1 : 0);
    score += 0.08 * (features.has_estate_or_trustee ? 1 : 0);
    
    // Negative indicators (individual)
    score -= 0.40 * (features.has_honorific ? 1 : 0);
    score -= 0.30 * (features.has_first_name_match ? 1 : 0);
    score -= 0.20 * features.spacy_person_conf;
    score -= 0.10 * (features.has_generation_suffix ? 1 : 0);
    score -= 0.05 * (features.token_count === 2 ? 1 : 0);
    
    // Clamp to [-1, 1]
    return Math.max(-1, Math.min(1, score));
  }

  /**
   * Step 5 & 6: Decision rule and confidence calibration
   */
  private makeDecision(score: number, libraryGuesses: { business_prob: number; individual_prob: number }): ClassifierResult {
    let entity_type: 'individual' | 'business';
    let confidence: number;
    let rationale: string;

    // Decision rule
    if (score >= 0.12) {
      entity_type = 'business';
      confidence = this.calibrateConfidence(Math.abs(score));
      rationale = this.generateRationale(score, 'business');
    } else if (score <= -0.12) {
      entity_type = 'individual';
      confidence = this.calibrateConfidence(Math.abs(score));
      rationale = this.generateRationale(score, 'individual');
    } else {
      // Use library probabilities
      if (libraryGuesses.business_prob > libraryGuesses.individual_prob) {
        entity_type = 'business';
        rationale = 'Library analysis suggests business entity with moderate confidence';
      } else {
        entity_type = 'individual';
        rationale = 'Library analysis suggests individual person with moderate confidence';
      }
      confidence = 0.50;
    }

    return { entity_type, confidence, rationale };
  }

  /**
   * Calibrate confidence using linear mapping
   */
  private calibrateConfidence(absScore: number): number {
    // Map abs(score) linearly into [0.50, 0.97]
    const minConfidence = 0.50;
    const maxConfidence = 0.97;
    return Math.min(maxConfidence, minConfidence + (absScore * (maxConfidence - minConfidence)));
  }

  /**
   * Generate rationale based on score and decision
   */
  private generateRationale(score: number, type: 'business' | 'individual'): string {
    if (type === 'business') {
      if (score > 0.5) return 'Strong business indicators including legal suffixes and keywords';
      if (score > 0.3) return 'Multiple business characteristics detected';
      return 'Business keywords and organizational patterns identified';
    } else {
      if (score < -0.5) return 'Strong individual indicators including personal names and titles';
      if (score < -0.3) return 'Multiple personal name characteristics detected';
      return 'Personal name patterns and individual markers identified';
    }
  }

  /**
   * Main classification method
   */
  public classify(payeeName: string): ClassifierResult {
    // Step 1: Normalize
    const normalized = this.normalize(payeeName);
    
    // Step 2: Library passes
    const libraryGuesses = this.getLibraryGuesses(normalized);
    
    // Step 3: Extract features
    const features = this.extractFeatures(normalized);
    
    // Step 4: Calculate score
    const score = this.calculateScore(features);
    
    // Step 5 & 6: Decision and confidence
    const result = this.makeDecision(score, libraryGuesses);
    
    return result;
  }
}

/**
 * Convert advanced classifier result to standard ClassificationResult format
 */
export function advancedClassifyPayee(payeeName: string): ClassificationResult {
  const classifier = new AdvancedPayeeClassifier();
  const result = classifier.classify(payeeName);
  
  return {
    classification: result.entity_type === 'business' ? 'Business' : 'Individual',
    confidence: Math.round(result.confidence * 100),
    reasoning: result.rationale,
    processingTier: 'AI-Powered',
    processingMethod: 'Advanced Payee Classifier'
  };
}
