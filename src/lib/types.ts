
export interface ClassificationResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  processingTier: 'Rule-Based' | 'NLP-Based' | 'AI-Assisted' | 'AI-Powered';
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
  useEnhanced?: boolean;  // Whether to use the enhanced classification system
  offlineMode?: boolean;  // Whether to operate in offline mode (no API calls)
  useFuzzyMatching?: boolean; // Whether to use fuzzy matching for similar names
  useCacheForDuplicates?: boolean; // Whether to deduplicate similar names
}

// Enhanced statistics for batch processing
export interface EnhancedBatchStatistics {
  totalProcessed: number;
  businessCount: number;
  individualCount: number;
  averageConfidence: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  processingTierCounts: Record<string, number>;
  processingTime: number;
  deduplicationSavings?: number; // How many API calls were saved by deduplication
  cacheSavings?: number; // How many API calls were saved by caching
}
