
// Enhanced probablepeople-like functionality with better business detection
export interface NameParsing {
  type: 'Person' | 'Corporation';
  confidence: number;
}

// Comprehensive business suffixes
const BUSINESS_SUFFIXES = [
  'LLC', 'INC', 'CORP', 'LTD', 'LP', 'LLP', 'PC', 'PLLC', 'CO', 'COMPANY',
  'CORPORATION', 'INCORPORATED', 'LIMITED', 'TRUST', 'GROUP', 'ASSOCIATES',
  'PARTNERS', 'FOUNDATION', 'FUND', 'ASSOCIATION', 'SOCIETY', 'INSTITUTE',
  'GMBH', 'AG', 'KG', 'SA', 'SAS', 'SARL', 'SL', 'SRL', 'SPA', 'LTDA', 
  'EURL', 'BV', 'NV', 'OY', 'AB', 'PT', 'OOO'
];

// Enhanced business keywords focusing on service industries
const BUSINESS_KEYWORDS = [
  'AUTO', 'PLUMBING', 'ELECTRICAL', 'ROOFING', 'FLOORING', 'PAINTING', 
  'CLEANING', 'LANDSCAPING', 'PEST', 'CONTROL', 'SECURITY', 'ALARM', 
  'LOCKSMITH', 'EXPRESS', 'REPAIR', 'MAINTENANCE', 'INSTALLATION',
  'HVAC', 'AIR', 'CONDITIONING', 'HEATING', 'EMERGENCY', 'FIRE', 'PROTECTION',
  'SERVICES', 'CONSULTING', 'SOLUTIONS', 'MANAGEMENT', 'ENTERPRISES',
  'TECHNOLOGIES', 'SYSTEMS', 'PROPERTIES', 'CONSTRUCTION', 'CONTRACTING',
  'RESTAURANT', 'CAFE', 'HOTEL', 'MEDICAL', 'DENTAL', 'CLINIC', 'PHARMACY',
  'TECH', 'SOFTWARE', 'COMPUTER', 'TRANSPORT', 'SHIPPING', 'DELIVERY',
  'PROFESSIONAL', 'QUALITY', 'PREMIUM', 'EXPERT', 'ADVANCED', 'BEST',
  'CITY', 'COUNTY', 'STATE', 'DEPARTMENT', 'AUTHORITY', 'DISTRICT',
  'GOVERNMENT', 'MUNICIPAL', 'FEDERAL', 'BUREAU', 'COMMISSION', 'OFFICE'
];

// Domain patterns for businesses
const DOMAIN_PATTERNS = ['.COM', '.ORG', '.NET', '.BIZ', '.CO'];

// Professional titles that indicate individuals
const PROFESSIONAL_TITLES = [
  'MR', 'MS', 'MRS', 'DR', 'PROF', 'REV', 'SIR', 'HON', 'MISS', 'MD',
  'JD', 'CPA', 'ESQ', 'PHD', 'DDS', 'DVM', 'RN', 'DO', 'DC'
];

export function parsePersonName(name: string): NameParsing {
  const cleanName = name.trim().toUpperCase();
  const words = cleanName.split(/\s+/);
  
  // Strong business indicators - high confidence
  const hasBusinessSuffix = BUSINESS_SUFFIXES.some(suffix => 
    cleanName.endsWith(` ${suffix}`) || cleanName === suffix
  );
  
  if (hasBusinessSuffix) {
    return {
      type: 'Corporation',
      confidence: 0.95
    };
  }
  
  // Business keyword detection
  const hasBusinessKeyword = BUSINESS_KEYWORDS.some(keyword => 
    cleanName.includes(keyword)
  );
  
  if (hasBusinessKeyword) {
    return {
      type: 'Corporation',
      confidence: 0.88
    };
  }
  
  // Domain detection
  const hasDomain = DOMAIN_PATTERNS.some(domain => 
    cleanName.includes(domain)
  );
  
  if (hasDomain) {
    return {
      type: 'Corporation',
      confidence: 0.85
    };
  }
  
  // All caps pattern (often businesses)
  if (cleanName === cleanName.toUpperCase() && cleanName.length > 10) {
    return {
      type: 'Corporation',
      confidence: 0.75
    };
  }
  
  // Professional title detection (indicates individual)
  const hasTitle = PROFESSIONAL_TITLES.some(title => 
    words[0] === title
  );
  
  if (hasTitle) {
    return {
      type: 'Person',
      confidence: 0.90
    };
  }
  
  // Simple person name pattern (2-3 words, likely names)
  if (words.length >= 2 && words.length <= 3) {
    // Check if it looks like a person name vs business
    const looksLikePerson = words.every(word => 
      word.length >= 2 && 
      !BUSINESS_KEYWORDS.includes(word) &&
      !/\d/.test(word)
    );
    
    if (looksLikePerson) {
      return {
        type: 'Person',
        confidence: 0.75
      };
    }
  }
  
  // Default to business for complex/unclear names
  return {
    type: 'Corporation',
    confidence: 0.60
  };
}

// Export the main function that other files expect
export const probablepeople = {
  tag: parsePersonName
};
