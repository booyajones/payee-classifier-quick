
// This file is maintained for backward compatibility
// It re-exports all functionality from the new module structure

export * from './classification';
export { enhancedClassifyPayee } from './classification/enhancedClassification';
export { enhancedProcessBatch } from './classification/enhancedBatchProcessor';
export { consensusClassification } from './openai/enhancedClassification';
export { getConfidenceLevel, classifyPayee } from './classification/utils';
export { DEFAULT_CLASSIFICATION_CONFIG } from './classification/config';
export { processBatch } from './classification/batchProcessing';

// Export new functionality
export * from './classification/keywordExclusion';
export * from './openai/batchAPI';

// Export new true batch API functionality
export * from './openai/trueBatchAPI';
export * from './openai/hybridBatchProcessor';

// Export enhanced V2 functions
export { enhancedClassifyPayeeV2 } from './classification/enhancedClassificationV2';
export { enhancedProcessBatchV2, exportResultsWithOriginalData } from './classification/enhancedBatchProcessorV2';
export * from './classification/stringMatching';
export * from './classification/enhancedKeywordExclusion';
