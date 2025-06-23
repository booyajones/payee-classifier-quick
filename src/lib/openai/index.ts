
// Re-export everything from the individual modules
export * from './client';
export * from './utils';
export * from './singleClassification';
export * from './batchClassification';
export * from './enhancedClassification';

// Explicitly export items from config to avoid conflicts
export {
  DEFAULT_API_TIMEOUT,
  API_TIMEOUT,
  CLASSIFICATION_MODEL,
  MAX_BATCH_SIZE as CONFIG_MAX_BATCH_SIZE,
  MAX_PARALLEL_BATCHES
} from './config';

// Export the batch-specific MAX_BATCH_SIZE with a distinctive name
export { MAX_BATCH_SIZE as BATCH_SIZE } from './batchClassification';
