
import { DeterministicResult } from './deterministicTypes';

// Mock library interfaces
export interface LibrarySignals {
  pp_label: 'Person' | 'Company' | 'Unknown';
  pp_conf: number;
  np_has_first_name: boolean;
  np_has_last_name: boolean;
  np_has_title: boolean;
  cc_basename: string;
  spacy_org_prob: number;
  spacy_person_prob: number;
}

export interface FeatureFlags {
  has_business_suffix: boolean;
  has_honorific: boolean;
  has_generation_suffix: boolean;
  has_ampersand_or_and: boolean;
  contains_business_keyword: boolean;
  has_first_name_match: boolean;
  looks_like_tax_id: boolean;
  token_count: number;
  spacy_org_prob: number;
  spacy_person_prob: number;
  has_multiple_last_names: boolean;
  has_government_pattern: boolean;
  has_apartment_pattern: boolean;
  starts_with_article: boolean;
  all_caps_pattern: boolean;
}

// Re-export the deterministic result type
export type { DeterministicResult };
