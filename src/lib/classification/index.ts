// Main export file for the classification module
// Re-exports all functionality from the individual modules
export * from './config';
export * from './ruleBasedClassification';
export * from './nlpClassification';
export * from './aiClassification';
export * from './batchProcessing';
export * from './utils';

// Export specific functions from enhancedRules to avoid conflicts
export { 
  detectBusinessByExtendedRules, 
  detectIndividualByExtendedRules 
} from './enhancedRules';

// Export specific functions from stringMatching to avoid conflicts
export { 
  levenshteinDistance,
  jaroWinklerSimilarity,
  diceCoefficient,
  tokenSortRatio,
  calculateCombinedSimilarity,
  advancedNormalization
} from './stringMatching';

// Export specific functions from enhancedClassification but exclude enhancedProcessBatch to avoid conflict
export { enhancedClassifyPayee } from './enhancedClassification';

// Export enhanced V2 functions
export { enhancedClassifyPayeeV2 } from './enhancedClassificationV2';
export { enhancedProcessBatchV2, exportResultsWithOriginalData } from './enhancedBatchProcessorV2';

// Export new V3 functions (no failures, intelligent escalation)
export { enhancedClassifyPayeeV3 } from './enhancedClassificationV3';
export { enhancedProcessBatchV3 } from './enhancedBatchProcessorV3';

// Export new enhanced keyword exclusion (avoid conflict with old one)
export { 
  checkKeywordExclusion as checkEnhancedKeywordExclusion,
  bulkKeywordExclusion 
} from './enhancedKeywordExclusion';

// Export name processing
export * from './nameProcessing';

// Export new batch utility modules
export * from './batchStatistics';
export * from './batchDeduplication';
export * from './batchRetryHandler';

// Export specific helper function from batchExporter (no conflicts)
export { findResultByName } from './batchExporter';

// Export from the new exporters module (includes the main export function)
export * from './exporters';

// Export NEW rule-only classification functions (no AI dependencies)
export { 
  ruleOnlyClassification, 
  batchRuleOnlyClassification 
} from './ruleOnlyClassification';

// Export the clean batch processor for rule-based processing
export { cleanProcessBatch } from './cleanBatchProcessor';

// Export new world-class deterministic classification engine
export { worldClassClassification } from './worldClassRules';
export { 
  enhancedRuleOnlyClassification, 
  enhancedBatchRuleOnlyClassification 
} from './enhancedRuleOnlyClassification';

// Export new advanced classifier
export { AdvancedPayeeClassifier, advancedClassifyPayee } from './advancedPayeeClassifier';

// Export new LLM and ensemble classifiers
export { 
  classifyWithLocalLLM, 
  isLLMAvailable,
  LocalLLMClassifier 
} from './localLLMClassifier';

export { ensembleClassifyPayee } from './ensembleClassifier';
