
import { FeatureFlags, LibrarySignals } from './enhancedDeterministicTypes';
import { 
  BUSINESS_SUFFIXES, 
  BUSINESS_KEYWORDS, 
  HONORIFICS, 
  GENERATION_SUFFIXES,
  GIVEN_NAMES 
} from './enhancedDeterministicConstants';

export function getFeatureFlags(cleanName: string, signals: LibrarySignals): FeatureFlags {
  const tokens = cleanName.split(/\s+/).filter(t => t.length > 0);
  
  if (tokens.length === 0) {
    return {
      has_business_suffix: false,
      has_honorific: false,
      has_generation_suffix: false,
      has_ampersand_or_and: false,
      contains_business_keyword: false,
      has_first_name_match: false,
      looks_like_tax_id: false,
      token_count: 0,
      spacy_org_prob: 0,
      spacy_person_prob: 0,
      has_multiple_last_names: false,
      has_government_pattern: false,
      has_apartment_pattern: false,
      starts_with_article: false,
      all_caps_pattern: true
    };
  }

  const flags: FeatureFlags = {
    has_business_suffix: tokens.some(token => BUSINESS_SUFFIXES.has(token)),
    has_honorific: HONORIFICS.has(tokens[0]),
    has_generation_suffix: GENERATION_SUFFIXES.has(tokens[tokens.length - 1]),
    has_ampersand_or_and: tokens.includes('AND'),
    contains_business_keyword: tokens.some(token => BUSINESS_KEYWORDS.has(token)),
    has_first_name_match: tokens.some(token => GIVEN_NAMES.has(token)),
    looks_like_tax_id: /\d{9}/.test(cleanName.replace(/\s/g, '')),
    token_count: tokens.length,
    spacy_org_prob: signals.spacy_org_prob,
    spacy_person_prob: signals.spacy_person_prob,
    has_multiple_last_names: tokens.length > 3 && tokens.some(token => GIVEN_NAMES.has(token)),
    has_government_pattern: /\b(CITY OF|COUNTY OF|STATE OF|DEPARTMENT OF|OFFICE OF|BUREAU OF)\b/.test(cleanName),
    has_apartment_pattern: /\b(APARTMENT|APARTMENTS|VILLAGE|VILLAS|TOWERS|CROSSINGS|COMMONS|MEADOWS)\b/.test(cleanName),
    starts_with_article: /^(THE|A|AN)\s/.test(cleanName),
    all_caps_pattern: cleanName === cleanName.toUpperCase() && cleanName.length > 3
  };

  return flags;
}
