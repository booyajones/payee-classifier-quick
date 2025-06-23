
import { LibrarySimulation } from './deterministicTypes';
import { COMMON_FIRST_NAMES } from './firstNamesDatabase';

/**
 * Phase B: Simulate Library Passes
 */
export function simulateLibraryPasses(cleanName: string): LibrarySimulation {
  const tokens = cleanName.split(/\s+/);
  
  // Enhanced business detection based on training data
  const businessKeywords = [
    // Core business terms
    'LLC', 'INC', 'CORP', 'LTD', 'COMPANY', 'CO', 'SERVICES', 'GROUP', 'SOLUTIONS',
    'SYSTEMS', 'ENTERPRISES', 'ASSOCIATES', 'PARTNERS', 'HOLDINGS', 'PROPERTIES',
    'CONSULTING', 'TECHNOLOGIES', 'COMMUNICATIONS', 'RESOURCES', 'DEVELOPMENT',
    'MANAGEMENT', 'CONTRACTORS', 'CONSTRUCTION',
    
    // Service industries
    'PLUMBING', 'HEATING', 'COOLING', 'ELECTRICAL', 'LANDSCAPING', 'CLEANING', 'MAINTENANCE',
    'SECURITY', 'PROTECTION', 'FIRE', 'ALARM', 'ROOFING', 'FLOORING', 'PAINTING', 'CARPET',
    'RESTORATION', 'RENOVATION', 'REMODELING', 'REPAIR', 'APPLIANCE', 'ELEVATOR', 'GLASS',
    'WASTE', 'DISPOSAL', 'PEST', 'CONTROL', 'POOL', 'SPA', 'LANDSCAPE', 'LAWN', 'TREE',
    'DOOR', 'WINDOW', 'LOCKSMITH', 'MECHANICAL', 'HVAC', 'AIR', 'CONDITIONING', 'INSPECTION',
    
    // Government/institutional
    'CITY', 'COUNTY', 'STATE', 'DEPARTMENT', 'AUTHORITY', 'DISTRICT', 'GOVERNMENT',
    'MUNICIPAL', 'FEDERAL', 'BUREAU', 'COMMISSION', 'BOARD', 'OFFICE', 'ADMINISTRATION',
    
    // Property/apartment related
    'APARTMENTS', 'APARTMENT', 'PROPERTIES', 'PROPERTY', 'REALTY', 'HOUSING', 'RESIDENTIAL',
    'COMMERCIAL', 'LEASING', 'RENTAL', 'RENTALS', 'MANAGEMENT'
  ];
  
  const hasBusinessKeyword = businessKeywords.some(keyword => cleanName.includes(keyword));
  
  // Government/institutional patterns
  const govPatterns = ['CITY OF', 'COUNTY OF', 'STATE OF', 'DEPARTMENT', 'AUTHORITY', 'DISTRICT'];
  const hasGovPattern = govPatterns.some(pattern => cleanName.includes(pattern));
  
  let probablepeople_business_prob = 0.25;
  let probablepeople_person_prob = 0.75;
  
  if (hasBusinessKeyword || hasGovPattern) {
    probablepeople_business_prob = 0.90;
    probablepeople_person_prob = 0.10;
  } else if (tokens.length >= 2 && tokens.length <= 4) {
    const firstToken = tokens[0];
    if (COMMON_FIRST_NAMES.has(firstToken)) {
      probablepeople_person_prob = 0.85;
      probablepeople_business_prob = 0.15;
    }
  }
  
  // Simulate spaCy NER with better business detection
  let spacy_org_prob = 0.05;
  let spacy_person_prob = 0.05;
  
  if (hasBusinessKeyword || hasGovPattern || cleanName.includes('HOLDINGS') || cleanName.includes('ENTERPRISES')) {
    spacy_org_prob = 0.95;
  }
  
  // Check for personal name patterns
  const firstToken = tokens[0];
  if (COMMON_FIRST_NAMES.has(firstToken) && tokens.length >= 2 && tokens.length <= 4) {
    spacy_person_prob = 0.90;
  }
  
  return {
    probablepeople_business_prob,
    probablepeople_person_prob,
    spacy_org_prob,
    spacy_person_prob
  };
}
