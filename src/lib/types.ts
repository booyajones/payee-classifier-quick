export interface ClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  processingTier: 'Rule-Based' | 'NLP-Based' | 'AI-Assisted';
  matchingRules?: string[];
}

export interface PayeeClassification {
  id: string;
  payeeName: string;
  result: ClassificationResult;
  timestamp: Date;
}

export interface BatchProcessingResult {
  results: PayeeClassification[];
  successCount: number;
  failureCount: number;
  processingTime: number;
}

export interface ParsedPerson {
  GivenName?: string;
  FirstInitial?: string;
  Surname?: string;
  LastInitial?: string;
  SuffixGenerational?: string;
  SuffixOther?: string;
  PrefixMarital?: string;
  PrefixOther?: string;
  MiddleName?: string;
  MiddleInitial?: string;
  [key: string]: string | undefined;
}

export interface ParsedCorporation {
  CorporationName?: string;
  CorporationLegalType?: string;
  OrganizationNameType?: string;
  [key: string]: string | undefined;
}

export interface ClassificationConfig {
  aiThreshold: number;   // Confidence threshold below which AI will be used
  bypassRuleNLP: boolean; // Whether to skip rule-based and NLP classification
}
