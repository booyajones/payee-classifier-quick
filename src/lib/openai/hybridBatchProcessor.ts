
import { ClassificationResult, ClassificationConfig } from '../types';
import { filterPayeeNames } from '../classification/keywordExclusion';
import { createBatchJob, pollBatchJob, getBatchJobResults, BatchJob } from './trueBatchAPI';
import { processBatchClassification } from './batchAPI';

export interface HybridBatchResult {
  results: ClassificationResult[];
  batchJob?: BatchJob;
  processingMode: 'realtime' | 'batch' | 'hybrid';
}

/**
 * Process a batch using either real-time or true batch API
 */
export async function processWithHybridBatch(
  payeeNames: string[],
  mode: 'realtime' | 'batch',
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config?: ClassificationConfig
): Promise<HybridBatchResult> {
  console.log(`[HYBRID BATCH] Starting ${mode} processing for ${payeeNames.length} payees`);

  const total = payeeNames.length;
  let processedCount = 0;

  // Phase 1: Apply keyword exclusion filtering
  if (onProgress) {
    onProgress(0, total, 5, { 
      phase: 'Filtering excluded keywords...',
      mode 
    });
  }

  const { validNames, excludedNames } = filterPayeeNames(payeeNames);
  const results: ClassificationResult[] = new Array(total);

  // Create exclusion results
  excludedNames.forEach(({ name, reason }) => {
    const originalIndex = payeeNames.indexOf(name);
    if (originalIndex !== -1) {
      results[originalIndex] = {
        classification: 'Individual',
        confidence: 0,
        reasoning: `Excluded due to keywords: ${reason.join(', ')}`,
        processingTier: 'Excluded'
      };
      processedCount++;
    }
  });

  // Update progress after filtering
  if (onProgress) {
    const percentage = Math.round((processedCount / total) * 100);
    onProgress(processedCount, total, percentage, {
      phase: `Keyword filtering complete - ${excludedNames.length} excluded`,
      excludedCount: excludedNames.length,
      remainingForAI: validNames.length,
      mode
    });
  }

  if (validNames.length === 0) {
    return {
      results,
      processingMode: 'hybrid'
    };
  }

  // Phase 2: Process remaining names based on mode
  if (mode === 'batch') {
    // Use true OpenAI Batch API
    if (onProgress) {
      onProgress(processedCount, total, Math.round((processedCount / total) * 100), {
        phase: 'Creating batch job...',
        mode: 'batch'
      });
    }

    const batchJob = await createBatchJob(
      validNames,
      `Payee classification batch - ${validNames.length} names`
    );

    if (onProgress) {
      onProgress(processedCount, total, Math.round((processedCount / total) * 100), {
        phase: `Batch job created: ${batchJob.id}`,
        batchJobId: batchJob.id,
        batchStatus: batchJob.status,
        mode: 'batch'
      });
    }

    // For batch mode, we return immediately with the job info
    // The UI will handle polling and getting results later
    return {
      results,
      batchJob,
      processingMode: 'batch'
    };

  } else {
    // Use real-time processing
    const batchResults = await processBatchClassification({
      payeeNames: validNames,
      onProgress: (status: string, progress: number) => {
        // Map batch API progress to overall progress
        const batchProgressWeight = 90; // 90% of remaining progress
        const baseProgress = (processedCount / total) * 100;
        const adjustedProgress = baseProgress + ((progress / 100) * batchProgressWeight * (validNames.length / total));
        
        if (onProgress) {
          onProgress(
            processedCount + Math.round((progress / 100) * validNames.length),
            total,
            Math.round(adjustedProgress),
            {
              phase: status,
              mode: 'realtime',
              realtimeProgress: progress
            }
          );
        }
      }
    });

    // Map batch results back to positions
    batchResults.forEach((batchResult, index) => {
      const name = validNames[index];
      if (name) {
        const globalIndex = payeeNames.indexOf(name);
        if (globalIndex !== -1) {
          results[globalIndex] = {
            classification: batchResult.classification,
            confidence: batchResult.confidence,
            reasoning: batchResult.reasoning,
            processingTier: batchResult.status === 'success' ? 'AI-Powered' : 'Failed'
          };
          processedCount++;
        }
      }
    });

    // Final progress update
    if (onProgress) {
      onProgress(total, total, 100, {
        phase: 'Real-time processing complete',
        mode: 'realtime'
      });
    }

    return {
      results,
      processingMode: 'realtime'
    };
  }
}

/**
 * Complete a batch job and get results
 */
export async function completeBatchJob(
  batchJob: BatchJob,
  payeeNames: string[],
  onProgress?: (job: BatchJob) => void
): Promise<ClassificationResult[]> {
  console.log(`[HYBRID BATCH] Completing batch job: ${batchJob.id}`);

  // Poll until completion
  const completedJob = await pollBatchJob(
    batchJob.id,
    onProgress,
    5000 // Poll every 5 seconds
  );

  if (completedJob.status !== 'completed') {
    throw new Error(`Batch job failed with status: ${completedJob.status}`);
  }

  // Get and parse results
  const batchResults = await getBatchJobResults(completedJob, payeeNames);

  // Convert to ClassificationResult format
  return batchResults.map(result => ({
    classification: result.classification,
    confidence: result.confidence,
    reasoning: result.reasoning,
    processingTier: result.status === 'success' ? 'AI-Powered' : 'Failed'
  }));
}
