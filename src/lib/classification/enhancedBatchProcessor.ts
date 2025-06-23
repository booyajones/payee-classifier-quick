
import { ClassificationResult, ClassificationConfig } from '../types';
import { filterPayeeNames } from './keywordExclusion';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { enhancedClassifyPayee } from './enhancedClassification';

interface ProcessingStats {
  totalNames: number;
  excludedCount: number;
  processedCount: number;
  successCount: number;
  failureCount: number;
  startTime: number;
}

/**
 * Enhanced batch processing using local classification and keyword exclusions
 */
export async function enhancedProcessBatch(
  payeeNames: string[],
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  console.log(`[ENHANCED] Starting enhanced batch processing of ${payeeNames.length} payees`);

  const stats: ProcessingStats = {
    totalNames: payeeNames.length,
    excludedCount: 0,
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    startTime: Date.now()
  };

  // Input validation
  if (!Array.isArray(payeeNames)) {
    console.error('[ENHANCED] Invalid input: payeeNames is not an array');
    return [];
  }

  // Filter empty names
  const validPayeeNames = payeeNames.filter(name => name && typeof name === 'string' && name.trim() !== '');
  const total = validPayeeNames.length;
  
  if (total === 0) {
    console.log('[ENHANCED] No valid names to process');
    return [];
  }

  // Initialize progress
  if (onProgress) {
    onProgress(0, total, 0, { 
      phase: 'Initializing',
      excludedCount: 0,
      estimatedTimeRemaining: 'Calculating...'
    });
  }

  const results: ClassificationResult[] = new Array(total);

  try {
    // Phase 1: Apply keyword exclusion filtering
    console.log(`[ENHANCED] Phase 1: Keyword exclusion filtering`);
    if (onProgress) {
      onProgress(0, total, 5, { phase: 'Filtering excluded keywords...' });
    }
    
    const { validNames, excludedNames } = filterPayeeNames(validPayeeNames);
    stats.excludedCount = excludedNames.length;
    
    console.log(`[ENHANCED] Excluded ${excludedNames.length} names, processing ${validNames.length}`);

    // Create exclusion results
    excludedNames.forEach(({ name, reason }) => {
      const originalIndex = validPayeeNames.indexOf(name);
      if (originalIndex !== -1) {
        results[originalIndex] = {
          classification: 'Individual', // Default for excluded
          confidence: 0,
          reasoning: `Excluded due to keywords: ${reason.join(', ')}`,
          processingTier: 'Excluded'
        };
        stats.processedCount++;
      }
    });

    // Update progress after filtering
    if (onProgress) {
      const percentage = Math.round((stats.processedCount / total) * 100);
      onProgress(stats.processedCount, total, percentage, {
        phase: 'Keyword filtering complete',
        excludedCount: stats.excludedCount,
        remainingForAI: validNames.length
      });
    }

    // Phase 2: Process remaining names with local classification
    if (validNames.length > 0) {
      console.log(`[ENHANCED] Phase 2: Processing ${validNames.length} names locally`);

      for (const name of validNames) {
        const globalIndex = validPayeeNames.indexOf(name);
        if (globalIndex === -1) continue;

        try {
          const classification = await enhancedClassifyPayee(name, config);
          results[globalIndex] = classification;
          stats.successCount++;
        } catch (error) {
          console.error(`[ENHANCED] Error classifying "${name}":`, error);
          results[globalIndex] = {
            classification: 'Individual',
            confidence: 0,
            reasoning: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            processingTier: 'Failed'
          };
          stats.failureCount++;
        }

        stats.processedCount++;

        if (onProgress) {
          const percentage = Math.round((stats.processedCount / total) * 100);
          onProgress(stats.processedCount, total, percentage, {
            phase: 'Processing',
            excludedCount: stats.excludedCount
          });
        }
      }
    }

    // Phase 3: Fill in any missing results
    console.log(`[ENHANCED] Phase 3: Filling in missing results`);
    validPayeeNames.forEach((name, index) => {
      if (!results[index]) {
        results[index] = {
          classification: 'Individual',
          confidence: 50,
          reasoning: 'Fallback classification - no processing result found',
          processingTier: 'Rule-Based'
        };
        stats.failureCount++;
        stats.processedCount++;
      }
    });

    // Final progress update
    if (onProgress) {
      const totalTime = (Date.now() - stats.startTime) / 1000;
      onProgress(total, total, 100, {
        phase: 'Complete',
        excludedCount: stats.excludedCount,
        successCount: stats.successCount,
        failureCount: stats.failureCount,
        totalTime: `${totalTime.toFixed(2)}s`,
        avgTimePerName: `${(totalTime / total).toFixed(3)}s`
      });
    }

    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(`[ENHANCED] Batch processing complete in ${totalTime.toFixed(2)}s:`);
    console.log(`[ENHANCED] - Excluded: ${stats.excludedCount}`);
    console.log(`[ENHANCED] - Successful: ${stats.successCount}`);
    console.log(`[ENHANCED] - Failed: ${stats.failureCount}`);

    return results;

  } catch (error) {
    console.error(`[ENHANCED] Error in enhanced batch processing:`, error);
    
    // Create fallback results for all names
    const fallbackResults = validPayeeNames.map(() => ({
      classification: 'Individual' as const,
      confidence: 0,
      reasoning: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTier: 'Failed' as const
    }));

    return fallbackResults;
  }
}
