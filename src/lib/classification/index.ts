
// Main export file for the classification module
// Re-exports all functionality from the individual modules
export * from './config';
export * from './types';
export * from './ruleBasedClassification';
export * from './nlpClassification';
export * from './aiClassification';
export * from './batchProcessing';
export * from './utils';
export * from './enhancedRules';

// Export specific functions from enhancedClassification but exclude enhancedProcessBatch to avoid conflict
export { enhancedClassifyPayee } from './enhancedClassification';

// Export new enhanced V2 functions
export { enhancedClassifyPayeeV2 } from './enhancedClassificationV2';
export { enhancedProcessBatchV2, exportResultsWithOriginalData } from './enhancedBatchProcessorV2';

// Export new string matching and keyword exclusion
export * from './stringMatching';
export * from './enhancedKeywordExclusion';
export * from './nameProcessing';
