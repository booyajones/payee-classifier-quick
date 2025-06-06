
// Optimized timeout for better reliability and speed
const envTimeout = parseInt(process.env.OPENAI_TIMEOUT_MS || '', 10);
export const DEFAULT_API_TIMEOUT =
  Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 20000; // Increased to 20 seconds for batch processing

// Optimized batch size for faster processing
export const MAX_BATCH_SIZE = 15; // Increased for better throughput

// Use the most reliable and fast model
export const CLASSIFICATION_MODEL = 'gpt-4o-mini';

// Enhanced processing configuration
export const ENHANCED_PROCESSING = {
  BATCH_SIZE: 15,
  MAX_PARALLEL_BATCHES: 3,
  CACHE_TTL: 30 * 60 * 1000, // 30 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000
};

// Maximum number of batches to process concurrently
export const MAX_PARALLEL_BATCHES = ENHANCED_PROCESSING.MAX_PARALLEL_BATCHES;
