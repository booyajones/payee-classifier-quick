
import { LibrarySignals } from './enhancedDeterministicTypes';
import { 
  BUSINESS_SUFFIXES, 
  BUSINESS_KEYWORDS, 
  HONORIFICS, 
  GIVEN_NAMES 
} from './enhancedDeterministicConstants';

export function getLocalLibrarySignals(cleanName: string): LibrarySignals {
  const signals: LibrarySignals = {
    pp_label: 'Unknown',
    pp_conf: 0.0,
    np_has_first_name: false,
    np_has_last_name: false,
    np_has_title: false,
    cc_basename: cleanName,
    spacy_org_prob: 0.0,
    spacy_person_prob: 0.0
  };

  try {
    const tokens = cleanName.split(/\s+/).filter(t => t.length > 0);
    
    // Mock probablepeople logic
    if (tokens.some(token => BUSINESS_SUFFIXES.has(token)) || 
        tokens.some(token => BUSINESS_KEYWORDS.has(token))) {
      signals.pp_label = 'Company';
      signals.pp_conf = 0.8;
    } else if (tokens.length >= 2 && tokens.length <= 4 && 
               tokens.some(token => GIVEN_NAMES.has(token))) {
      signals.pp_label = 'Person';
      signals.pp_conf = 0.7;
    } else {
      signals.pp_conf = 0.5;
    }

    // Mock nameparser logic
    if (tokens.length > 0) {
      if (HONORIFICS.has(tokens[0])) {
        signals.np_has_title = true;
        if (tokens.length > 1) {
          signals.np_has_first_name = GIVEN_NAMES.has(tokens[1]);
        }
      } else {
        signals.np_has_first_name = GIVEN_NAMES.has(tokens[0]);
      }
      
      if (tokens.length >= 2) {
        signals.np_has_last_name = true;
      }
    }

    // Mock cleanco logic - remove business suffixes
    let basename = cleanName;
    for (const suffix of BUSINESS_SUFFIXES) {
      const regex = new RegExp(`\\b${suffix}\\b$`, 'i');
      basename = basename.replace(regex, '').trim();
    }
    signals.cc_basename = basename;

    // Mock spaCy NER logic
    let orgProb = 0.0;
    let personProb = 0.0;

    // Business indicators boost ORG probability
    if (tokens.some(token => BUSINESS_KEYWORDS.has(token)) ||
        tokens.some(token => BUSINESS_SUFFIXES.has(token)) ||
        cleanName.includes('CITY OF') || cleanName.includes('COUNTY OF') ||
        cleanName.includes('STATE OF') || cleanName.includes('DEPARTMENT')) {
      orgProb = 0.85;
    }

    // Person indicators boost PERSON probability
    if (tokens.length >= 2 && tokens.length <= 4 && 
        tokens.some(token => GIVEN_NAMES.has(token)) &&
        !tokens.some(token => BUSINESS_KEYWORDS.has(token))) {
      personProb = 0.90;
    }

    // Honorific patterns
    if (HONORIFICS.has(tokens[0])) {
      personProb = Math.max(personProb, 0.75);
    }

    signals.spacy_org_prob = orgProb;
    signals.spacy_person_prob = personProb;

  } catch (error) {
    console.warn('Error in library signal processing:', error);
  }

  return signals;
}
