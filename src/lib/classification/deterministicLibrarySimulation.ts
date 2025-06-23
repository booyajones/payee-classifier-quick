
import { LibrarySimulation } from './deterministicTypes';
import { COMMON_FIRST_NAMES } from './firstNamesDatabase';

/**
 * Phase B: Simulate Library Passes
 */
export function simulateLibraryPasses(cleanName: string): LibrarySimulation {
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
