
// This file is maintained for backward compatibility
// It re-exports all functionality from the new module structure

export * from './classification';
export { enhancedClassifyPayee, enhancedProcessBatch } from './classification/enhancedClassification';
export { consensusClassification } from './openai/enhancedClassification';
export { getConfidenceLevel, classifyPayee } from './classification/utils';
export { DEFAULT_CLASSIFICATION_CONFIG } from './classification/config';
export { processBatch } from './classification/batchProcessing';
