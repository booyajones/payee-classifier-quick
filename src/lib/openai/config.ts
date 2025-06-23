

// Optimized timeout for better reliability and speed
export const DEFAULT_API_TIMEOUT = 20000; // 20 seconds for batch processing

// Helper function to safely get environment variables
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
};

// Resolve the effective timeout from the environment
const envTimeout = parseInt(
  getEnvVar('OPENAI_TIMEOUT_MS', String(DEFAULT_API_TIMEOUT)),
  10
);
export const API_TIMEOUT =
  Number.isFinite(envTimeout) && envTimeout > 0
    ? envTimeout
    : DEFAULT_API_TIMEOUT;

// Optimized batch size for faster processing
const envBatchSize = parseInt(getEnvVar('OPENAI_MAX_BATCH_SIZE', '15'), 10);
export const MAX_BATCH_SIZE =
  Number.isFinite(envBatchSize) && envBatchSize > 0 ? envBatchSize : 15; // Increased for better throughput

// Use the most reliable and fast model
export const CLASSIFICATION_MODEL = 'gpt-4o-mini';

// Enhanced processing configuration
const envParallel = parseInt(getEnvVar('OPENAI_MAX_PARALLEL_BATCHES', '3'), 10);
export const ENHANCED_PROCESSING = {
  BATCH_SIZE: MAX_BATCH_SIZE,
  MAX_PARALLEL_BATCHES:
    Number.isFinite(envParallel) && envParallel > 0 ? envParallel : 3,
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000
};

// Maximum number of batches to process concurrently
export const MAX_PARALLEL_BATCHES = ENHANCED_PROCESSING.MAX_PARALLEL_BATCHES;

