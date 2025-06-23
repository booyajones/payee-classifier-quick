
export interface DeterministicResult {
  entity_type: 'individual' | 'business';
  confidence: number;
  rationale: string;
}

export interface LibrarySimulation {
  probablepeople_business_prob: number;
  probablepeople_person_prob: number;
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
}
