
import { FeatureFlags } from './deterministicTypes';
import { COMMON_FIRST_NAMES } from './firstNamesDatabase';

/**
 * Phase C: Generate Feature Flags
 */
export function generateFeatureFlags(cleanName: string): FeatureFlags {
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
