
// This file is maintained for backward compatibility
// It re-exports all functionality from the new module structure

export * from './classification';
export { enhancedClassifyPayee, enhancedProcessBatch } from './classification/enhancedClassification';
export { consensusClassification } from './openai/enhancedClassification';

