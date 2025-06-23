import { ClassificationResult } from '../types';

/**
 * Specialized, deterministic payee-name classifier following the exact algorithm specification
 * Updated with comprehensive first names and better scoring based on training data
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

// SIGNIFICANTLY EXPANDED first names database based on training data patterns
const COMMON_FIRST_NAMES = new Set([
  // Core English first names from training data
  'JOSE', 'JUAN', 'JESUS', 'MIGUEL', 'CARLOS', 'LUIS', 'FRANCISCO', 'JORGE', 'ANTONIO', 'MANUEL',
  'MARIO', 'PEDRO', 'DAVID', 'MICHAEL', 'JAMES', 'JOHN', 'ROBERT', 'WILLIAM', 'RICHARD', 'JOSEPH',
  'THOMAS', 'CHARLES', 'CHRISTOPHER', 'DANIEL', 'MATTHEW', 'ANTHONY', 'MARK', 'DONALD', 'STEVEN',
  'PAUL', 'ANDREW', 'JOSHUA', 'KENNETH', 'KEVIN', 'BRIAN', 'GEORGE', 'TIMOTHY', 'RONALD', 'JASON',
  'EDWARD', 'JEFFREY', 'RYAN', 'JACOB', 'GARY', 'NICHOLAS', 'ERIC', 'JONATHAN', 'STEPHEN', 'LARRY',
  'JUSTIN', 'SCOTT', 'BRANDON', 'BENJAMIN', 'SAMUEL', 'GREGORY', 'ALEXANDER', 'PATRICK', 'FRANK',
  'RAYMOND', 'JACK', 'DENNIS', 'JERRY', 'TYLER', 'AARON', 'HENRY', 'DOUGLAS', 'PETER', 'NATHAN',
  
  // Female names from training data
  'MARIA', 'ANA', 'CARMEN', 'ROSA', 'ISABEL', 'TERESA', 'GLORIA', 'PATRICIA', 'LINDA', 'BARBARA',
  'ELIZABETH', 'JENNIFER', 'SUSAN', 'MARGARET', 'DOROTHY', 'LISA', 'NANCY', 'KAREN', 'BETTY',
  'HELEN', 'SANDRA', 'DONNA', 'CAROL', 'RUTH', 'SHARON', 'MICHELLE', 'LAURA', 'SARAH', 'KIMBERLY',
  'DEBORAH', 'JESSICA', 'SHIRLEY', 'CYNTHIA', 'ANGELA', 'MELISSA', 'BRENDA', 'AMY', 'ANNA',
  'REBECCA', 'VIRGINIA', 'KATHLEEN', 'PAMELA', 'MARTHA', 'DEBRA', 'AMANDA', 'STEPHANIE', 'CAROLYN',
  'CHRISTINE', 'MARIE', 'JANET', 'CATHERINE', 'FRANCES', 'ANN', 'JOYCE', 'DIANE', 'ALICE', 'JULIE',
  'HEATHER', 'TERESA', 'DORIS', 'GLORIA', 'EVELYN', 'JEAN', 'CHERYL', 'MILDRED', 'KATHERINE',
  'JOAN', 'ASHLEY', 'JUDITH', 'ROSE', 'JANICE', 'KELLY', 'NICOLE', 'JUDY', 'CHRISTINA', 'KATHY',
  'THERESA', 'BEVERLY', 'DENISE', 'TAMMY', 'IRENE', 'JANE', 'LORI', 'RACHEL', 'MARILYN', 'ANDREA',
  'KATHRYN', 'LOUISE', 'SARA', 'ANNE', 'JACQUELINE', 'WANDA', 'BONNIE', 'JULIA', 'RUBY', 'LOIS',
  'TINA', 'PHYLLIS', 'NORMA', 'PAULA', 'DIANA', 'ANNIE', 'LILLIAN', 'EMILY', 'ROBIN', 'PEGGY',
  
  // Hispanic names from training data
  'ALEJANDRO', 'FERNANDO', 'RICARDO', 'ALBERTO', 'EDUARDO', 'ROBERTO', 'OSCAR', 'SALVADOR',
  'RAFAEL', 'ARMANDO', 'RUBEN', 'SERGIO', 'ENRIQUE', 'MARCO', 'VICTOR', 'ARTURO', 'RAUL',
  'RAMIRO', 'ISMAEL', 'EDGAR', 'DANIEL', 'GERARDO', 'ALFREDO', 'FELIPE', 'EMILIO', 'RODOLFO',
  'IGNACIO', 'CESAR', 'MARTIN', 'GUSTAVO', 'ADRIAN', 'HECTOR', 'GUILLERMO', 'JOAQUIN', 'GILBERTO',
  'CRISTINA', 'VERONICA', 'ADRIANA', 'BEATRIZ', 'DOLORES', 'ESPERANZA', 'GUADALUPE', 'JOSEFA',
  'LUCIA', 'MARCELA', 'MARGARITA', 'MONICA', 'OLGA', 'PILAR', 'SILVIA', 'SONIA', 'SUSANA',
  'YOLANDA', 'ELENA', 'GRACIELA', 'LETICIA', 'LIDIA', 'LOURDES', 'MARIBEL', 'MIRIAM', 'NORMA',
  'PATRICIA', 'SOLEDAD', 'VIRGINIA', 'XIMENA', 'CLAUDIA', 'FABIOLA', 'GABRIELA', 'ANDREA',
  
  // Common nicknames and short forms
  'ALEX', 'ANDY', 'TONY', 'MIKE', 'JIM', 'BOB', 'BILL', 'STEVE', 'DAVE', 'CHRIS', 'MATT',
  'RICK', 'TOM', 'NICK', 'JACK', 'JEFF', 'GREG', 'MARK', 'SCOTT', 'BRAD', 'CHAD', 'CRAIG',
  'DREW', 'EVAN', 'KYLE', 'LUKE', 'NOAH', 'OWEN', 'SETH', 'TODD', 'WADE', 'ZACH',
  'SUE', 'JANE', 'JEAN', 'JOAN', 'LYNN', 'ANNE', 'KATE', 'ROSE', 'RUTH', 'BETH', 'DAWN',
  'HOPE', 'JOY', 'KIM', 'LEE', 'MAY', 'PAM', 'RAE', 'TARA', 'VERA', 'ZOE'
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
    
    // Enhanced business detection based on training data
    const businessKeywords = [
      'LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'CO', 'SERVICES', 'GROUP', 'SOLUTIONS',
      'SYSTEMS', 'CONSTRUCTION', 'PLUMBING', 'HEATING', 'COOLING', 'ELECTRICAL', 'LANDSCAPING',
      'CLEANING', 'MAINTENANCE', 'SECURITY', 'PROTECTION', 'MANAGEMENT', 'CONTRACTORS',
      'ENTERPRISES', 'ASSOCIATES', 'PARTNERS', 'HOLDINGS', 'PROPERTIES', 'INVESTMENTS',
      'CONSULTING', 'TECHNOLOGIES', 'COMMUNICATIONS', 'RESOURCES', 'DEVELOPMENT'
    ];
    
    const hasBusinessKeyword = businessKeywords.some(keyword => cleanName.includes(keyword));
    
    // Government/institutional patterns
    const govPatterns = ['CITY OF', 'COUNTY OF', 'STATE OF', 'DEPARTMENT', 'AUTHORITY', 'DISTRICT'];
    const hasGovPattern = govPatterns.some(pattern => cleanName.includes(pattern));
    
    let probablepeople_business_prob = 0.3;
    let probablepeople_person_prob = 0.7;
    
    if (hasBusinessKeyword || hasGovPattern) {
      probablepeople_business_prob = 0.85;
      probablepeople_person_prob = 0.15;
    } else if (tokens.length >= 2 && tokens.length <= 4) {
      const firstToken = tokens[0];
      if (COMMON_FIRST_NAMES.has(firstToken)) {
        probablepeople_person_prob = 0.80;
        probablepeople_business_prob = 0.20;
      }
    }
    
    // Simulate spaCy NER with better business detection
    let spacy_org_prob = 0.1;
    let spacy_person_prob = 0.1;
    
    if (hasBusinessKeyword || hasGovPattern || cleanName.includes('HOLDINGS') || cleanName.includes('ENTERPRISES')) {
      spacy_org_prob = 0.90;
    }
    
    // Check for personal name patterns
    const firstToken = tokens[0];
    const lastToken = tokens[tokens.length - 1];
    if (COMMON_FIRST_NAMES.has(firstToken) && tokens.length >= 2 && tokens.length <= 4) {
      spacy_person_prob = 0.85;
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
    
    // Enhanced business suffixes based on training data
    const businessSuffixes = [
      'INC', 'LLC', 'LTD', 'CORP', 'CO', 'LLP', 'LP', 'PC', 'PLLC', 'COMPANY', 'CORPORATION',
      'INCORPORATED', 'LIMITED', 'BANK', 'TRUST', 'FOUNDATION', 'UNIVERSITY', 'HOSPITAL', 
      'INSTITUTE', 'GROUP', 'ASSOCIATES', 'PARTNERS', 'ENTERPRISES', 'HOLDINGS', 'PROPERTIES'
    ];
    
    const has_business_suffix = businessSuffixes.some(suffix => 
      tokens.some(token => token === suffix) || cleanName.endsWith(suffix)
    );
    
    // Honorifics
    const honorifics = ['MR', 'MS', 'MRS', 'DR', 'PROF', 'REV', 'SIR', 'MISS'];
    const has_honorific = honorifics.some(title => 
      tokens.some(token => token === title || token.startsWith(title))
    );
    
    // Generation suffixes
    const generationSuffixes = ['JR', 'SR', 'II', 'III', 'IV', 'V'];
    const has_generation_suffix = generationSuffixes.some(suffix => 
      cleanName.endsWith(suffix) || tokens.some(token => token === suffix)
    );
    
    // Ampersand or AND
    const has_ampersand_or_and = cleanName.includes('AND');
    
    // Enhanced business keywords from training data
    const businessKeywords = [
      'SERVICES', 'SOLUTIONS', 'SYSTEMS', 'CONSTRUCTION', 'PLUMBING', 'HEATING', 'COOLING',
      'ELECTRICAL', 'LANDSCAPING', 'CLEANING', 'MAINTENANCE', 'SECURITY', 'PROTECTION',
      'MANAGEMENT', 'CONTRACTORS', 'CONSULTING', 'TECHNOLOGIES', 'COMMUNICATIONS',
      'RESOURCES', 'DEVELOPMENT', 'ROOFING', 'FLOORING', 'PAINTING', 'CARPET', 'GLASS',
      'APPLIANCE', 'ELEVATOR', 'WASTE', 'DISPOSAL', 'PEST', 'CONTROL', 'FIRE', 'ALARM',
      'RESTORATION', 'RENOVATION', 'REMODELING', 'SUPPLY', 'DISTRIBUTION', 'WHOLESALE',
      'RETAIL', 'MANUFACTURING'
    ];
    
    const contains_business_keyword = businessKeywords.some(keyword => cleanName.includes(keyword));
    
    // First name match with expanded database
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
   * Updated weights based on training data analysis
   */
  private calculateScoreAndDecision(features: FeatureFlags, library: LibrarySimulation): DeterministicResult {
    // Updated scoring based on training data patterns
    const score = 
      (+0.50 * (features.has_business_suffix ? 1 : 0)) +         // Increased weight
      (+0.35 * (features.contains_business_keyword ? 1 : 0)) +   // Increased weight
      (+0.20 * (features.has_ampersand_or_and ? 1 : 0)) +       // Increased weight
      (+0.15 * library.spacy_org_prob) +                        // Increased weight
      (+0.10 * (features.looks_like_tax_id ? 1 : 0)) +
      (-0.45 * (features.has_first_name_match ? 1 : 0)) +       // Increased penalty
      (-0.35 * (features.has_honorific ? 1 : 0)) +              // Reduced penalty
      (-0.25 * library.spacy_person_prob) +                     // Increased penalty
      (-0.15 * (features.has_generation_suffix ? 1 : 0)) +      // Increased penalty
      (-0.10 * (features.token_count === 2 ? 1 : 0));           // Increased penalty

    // Enhanced decision rule based on training data
    let entity_type: 'individual' | 'business';
    
    if (score >= 0.15) {  // Slightly increased threshold
      entity_type = 'business';
    } else if (score <= -0.15) {  // Slightly increased threshold
      entity_type = 'individual';
    } else {
      // Better tie-breaking logic
      if (features.has_first_name_match && features.token_count <= 4 && !features.contains_business_keyword) {
        entity_type = 'individual';
      } else {
        entity_type = library.spacy_org_prob > library.spacy_person_prob ? 'business' : 'individual';
      }
    }
    
    // Enhanced confidence calibration
    const confidence = Math.min(1.0, 0.55 + (0.42 * Math.abs(score)));
    
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
