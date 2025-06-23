
import { ClassificationResult } from '../types';

/**
 * Specialized, deterministic payee-name classifier following the exact algorithm specification
 */

interface DeterministicResult {
  entity_type: 'individual' | 'business';
  confidence: number;
  rationale: string;
}

interface LibrarySimulation {
  probablepeople_business_prob: number;
  probablepeople_person_prob: number;
  spacy_org_prob: number;
  spacy_person_prob: number;
}

interface FeatureFlags {
  has_business_suffix: boolean;
  has_honorific: boolean;
  has_generation_suffix: boolean;
  has_ampersand_or_and: boolean;
  contains_business_keyword: boolean;
  has_first_name_match: boolean;
  looks_like_tax_id: boolean;
  token_count: number;
}

// Comprehensive first names database (sample of common names)
const COMMON_FIRST_NAMES = new Set([
  'JAMES', 'JOHN', 'ROBERT', 'MICHAEL', 'WILLIAM', 'DAVID', 'RICHARD', 'JOSEPH', 'THOMAS', 'CHARLES',
  'CHRISTOPHER', 'DANIEL', 'MATTHEW', 'ANTHONY', 'MARK', 'DONALD', 'STEVEN', 'PAUL', 'ANDREW', 'JOSHUA',
  'MARY', 'PATRICIA', 'LINDA', 'BARBARA', 'ELIZABETH', 'JENNIFER', 'MARIA', 'SUSAN', 'MARGARET', 'DOROTHY',
  'LISA', 'NANCY', 'KAREN', 'BETTY', 'HELEN', 'SANDRA', 'DONNA', 'CAROL', 'RUTH', 'SHARON',
  'JOSE', 'JUAN', 'FRANCISCO', 'ANTONIO', 'MANUEL', 'PEDRO', 'LUIS', 'JORGE', 'MIGUEL', 'CARLOS',
  'ANA', 'CARMEN', 'JOSEFA', 'ISABEL', 'DOLORES', 'PILAR', 'TERESA', 'ROSA', 'ANGELES',
  'TOM', 'MIKE', 'BOB', 'JIM', 'BILL', 'STEVE', 'DAVE', 'CHRIS', 'MATT', 'JEFF', 'RICK',
  'SUE', 'JANE', 'JEAN', 'JOAN', 'LYNN', 'ANNE', 'KATE', 'ROSE', 'BETH', 'DAWN'
]);

export class DeterministicPayeeClassifier {
  
  /**
   * Phase A: Normalization
   */
  private normalize(input: string): string {
    if (!input || input.trim() === '') {
      return '';
    }

    // Convert to upper-case using Unicode NFC normalization
    let normalized = input.normalize('NFC').toUpperCase();
    
    // Strip all diacritics
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remove all punctuation except & and '
    normalized = normalized.replace(/[^\w\s&']/g, ' ');
    
    // Replace standalone & with AND
    normalized = normalized.replace(/\b&\b/g, 'AND');
    
    // Collapse repeating whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Trim leading and trailing whitespace
    return normalized.trim();
  }

  /**
   * Phase B: Simulate Library Passes
   */
  private simulateLibraryPasses(cleanName: string): LibrarySimulation {
    const tokens = cleanName.split(/\s+/);
    
    // Simulate probablepeople
    const businessKeywords = ['LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'CO', 'SERVICES', 'GROUP'];
    const hasBusinessKeyword = businessKeywords.some(keyword => cleanName.includes(keyword));
    
    let probablepeople_business_prob = 0.3;
    let probablepeople_person_prob = 0.7;
    
    if (hasBusinessKeyword) {
      probablepeople_business_prob = 0.8;
      probablepeople_person_prob = 0.2;
    } else if (tokens.length >= 2 && tokens.length <= 4) {
      probablepeople_person_prob = 0.75;
      probablepeople_business_prob = 0.25;
    }
    
    // Simulate spaCy NER
    let spacy_org_prob = 0.1;
    let spacy_person_prob = 0.1;
    
    if (hasBusinessKeyword || cleanName.includes('HOLDINGS') || cleanName.includes('ENTERPRISES')) {
      spacy_org_prob = 0.85;
    }
    
    if (tokens.some(token => COMMON_FIRST_NAMES.has(token))) {
      spacy_person_prob = 0.8;
    }
    
    return {
      probablepeople_business_prob,
      probablepeople_person_prob,
      spacy_org_prob,
      spacy_person_prob
    };
  }

  /**
   * Phase C: Generate Feature Flags
   */
  private generateFeatureFlags(cleanName: string): FeatureFlags {
    const tokens = cleanName.split(/\s+/).filter(t => t.length > 0);
    
    // Business suffixes
    const businessSuffixes = ['INC', 'LLC', 'LTD', 'CORP', 'CO', 'LLP', 'BANK', 'TRUST', 'FOUNDATION', 'UNIVERSITY', 'HOSPITAL', 'INSTITUTE'];
    const has_business_suffix = businessSuffixes.some(suffix => 
      tokens.some(token => token === suffix || cleanName.endsWith(suffix))
    );
    
    // Honorifics
    const honorifics = ['MR', 'MS', 'MRS', 'DR', 'PROF', 'REV', 'SIR'];
    const has_honorific = honorifics.some(title => 
      tokens.some(token => token === title || token.startsWith(title))
    );
    
    // Generation suffixes
    const generationSuffixes = ['JR', 'SR', 'II', 'III', 'IV'];
    const has_generation_suffix = generationSuffixes.some(suffix => 
      cleanName.endsWith(suffix) || tokens.some(token => token === suffix)
    );
    
    // Ampersand or AND
    const has_ampersand_or_and = cleanName.includes('AND');
    
    // Business keywords
    const businessKeywords = ['AUTO', 'PLUMBING', 'TRAVEL', 'CONSULTING', 'SERVICES', 'GROUP', 'HOLDINGS', 'PROPERTIES', 'PARTNERS', 'ENTERPRISES', 'SOLUTIONS'];
    const contains_business_keyword = businessKeywords.some(keyword => cleanName.includes(keyword));
    
    // First name match
    const has_first_name_match = tokens.some(token => COMMON_FIRST_NAMES.has(token));
    
    // Tax ID pattern
    const looks_like_tax_id = /\d{9}/.test(cleanName);
    
    // Token count
    const token_count = tokens.length;
    
    return {
      has_business_suffix,
      has_honorific,
      has_generation_suffix,
      has_ampersand_or_and,
      contains_business_keyword,
      has_first_name_match,
      looks_like_tax_id,
      token_count
    };
  }

  /**
   * Phase D: Calculate Weighted Score & Make Decision
   */
  private calculateScoreAndDecision(features: FeatureFlags, library: LibrarySimulation): DeterministicResult {
    // Calculate weighted score
    const score = 
      (+0.45 * (features.has_business_suffix ? 1 : 0)) +
      (+0.30 * (features.contains_business_keyword ? 1 : 0)) +
      (+0.15 * (features.has_ampersand_or_and ? 1 : 0)) +
      (+0.10 * library.spacy_org_prob) +
      (+0.10 * (features.looks_like_tax_id ? 1 : 0)) +
      (-0.40 * (features.has_honorific ? 1 : 0)) +
      (-0.30 * (features.has_first_name_match ? 1 : 0)) +
      (-0.20 * library.spacy_person_prob) +
      (-0.10 * (features.has_generation_suffix ? 1 : 0)) +
      (-0.05 * (features.token_count === 2 ? 1 : 0));

    // Decision rule
    let entity_type: 'individual' | 'business';
    
    if (score >= 0.12) {
      entity_type = 'business';
    } else if (score <= -0.12) {
      entity_type = 'individual';
    } else {
      // Use library confidence
      entity_type = library.spacy_org_prob > library.spacy_person_prob ? 'business' : 'individual';
    }
    
    // Confidence calibration
    const confidence = Math.min(1.0, 0.50 + (0.47 * Math.abs(score)));
    
    // Generate rationale
    const rationale = this.generateRationale(features, library, score);
    
    return {
      entity_type,
      confidence,
      rationale
    };
  }

  /**
   * Phase E: Construct Rationale
   */
  private generateRationale(features: FeatureFlags, library: LibrarySimulation, score: number): string {
    const signals: string[] = [];
    
    if (features.has_business_suffix) signals.push('business suffix');
    if (features.contains_business_keyword) signals.push('business keyword');
    if (features.has_ampersand_or_and) signals.push('AND/& operator');
    if (library.spacy_org_prob > 0.5) signals.push('ORG NER detection');
    if (features.looks_like_tax_id) signals.push('tax ID pattern');
    if (features.has_honorific) signals.push('honorific title');
    if (features.has_first_name_match) signals.push('first name match');
    if (library.spacy_person_prob > 0.5) signals.push('PERSON NER detection');
    if (features.has_generation_suffix) signals.push('generation suffix');
    
    // Take top 2-4 most impactful signals
    const topSignals = signals.slice(0, Math.min(4, signals.length));
    
    if (topSignals.length === 0) {
      return 'Library analysis and token patterns.';
    }
    
    return `${topSignals.join(', ')} detected.`;
  }

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
    const cleanName = this.normalize(input);
    
    // Phase B: Simulate Library Passes
    const libraryResults = this.simulateLibraryPasses(cleanName);
    
    // Phase C: Generate Feature Flags
    const features = this.generateFeatureFlags(cleanName);
    
    // Phase D: Calculate Score & Decision
    const result = this.calculateScoreAndDecision(features, libraryResults);
    
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
