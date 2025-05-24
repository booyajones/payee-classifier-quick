
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { enhancedProcessBatch } from './enhancedBatchProcessor';

/**
 * Process a batch of payee names using the enhanced processing system
 * This is the main entry point for batch processing with all optimizations
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Use the enhanced batch processor for optimal performance
  return enhancedProcessBatch(payeeNames, onProgress, config);
}

// Export the enhanced processor for direct use if needed
export { enhancedProcessBatch };
