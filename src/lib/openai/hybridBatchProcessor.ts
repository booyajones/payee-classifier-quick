
import { ClassificationConfig } from '@/lib/types';
import { createBatchJob, BatchJob, getBatchJobResults, TrueBatchClassificationResult } from './trueBatchAPI';
import { classifyPayeesParallel } from './optimizedBatchClassification';
import { checkKeywordExclusions } from '@/lib/classification/keywordExclusion';

export interface HybridBatchResult {
  results: Array<{
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    processingTier: string;
  }>;
  batchJob?: BatchJob;
  stats?: {
    keywordExcluded: number;
    aiProcessed: number;
    phase: string;
  };
}

export interface BatchStats {
  keywordExcluded: number;
  aiProcessed: number;
  phase: string;
}

export type ProgressCallback = (
  current: number,
  total: number,
  percentage: number,
  stats?: BatchStats
) => void;

/**
 * Process payees using either real-time or batch mode
 */
export async function processWithHybridBatch(
  payeeNames: string[],
  mode: 'realtime' | 'batch',
  onProgress?: ProgressCallback,
  config?: ClassificationConfig
): Promise<HybridBatchResult> {
  console.log(`[HYBRID BATCH] Starting ${mode} processing for ${payeeNames.length} payees`);
  
  const stats: BatchStats = {
    keywordExcluded: 0,
    aiProcessed: 0,
    phase: 'Initializing'
  };

  // Step 1: Apply keyword exclusions first
  stats.phase = 'Applying keyword exclusions';
  onProgress?.(0, payeeNames.length, 0, stats);

  const exclusionResults = payeeNames.map(name => checkKeywordExclusions(name));
  
  // Separate excluded vs. needs AI processing
  const needsAI: { name: string; index: number }[] = [];
  const finalResults = payeeNames.map((name, index) => {
    const exclusionResult = exclusionResults[index];
    if (exclusionResult.excluded) {
      stats.keywordExcluded++;
      return {
        classification: exclusionResult.classification,
        confidence: exclusionResult.confidence,
        reasoning: exclusionResult.reasoning,
        processingTier: 'Rule-Based'
      };
    } else {
      needsAI.push({ name, index });
      return null; // Placeholder
    }
  });

  console.log(`[HYBRID BATCH] Keyword exclusions: ${stats.keywordExcluded}, Need AI: ${needsAI.length}`);

  if (needsAI.length === 0) {
    // All were excluded by keywords
    stats.phase = 'Complete - All keyword excluded';
    onProgress?.(payeeNames.length, payeeNames.length, 100, stats);
    return {
      results: finalResults.filter(r => r !== null) as HybridBatchResult['results']
    };
  }

  const aiNames = needsAI.map(item => item.name);

  if (mode === 'batch') {
    // Submit to OpenAI Batch API
    stats.phase = 'Submitting batch job';
    onProgress?.(stats.keywordExcluded, payeeNames.length, (stats.keywordExcluded / payeeNames.length) * 100, stats);

    try {
      console.log(`[HYBRID BATCH] Creating batch job for ${aiNames.length} names`);
      const batchJob = await createBatchJob(aiNames, `Hybrid classification batch - ${aiNames.length} payees`);
      console.log(`[HYBRID BATCH] Created batch job:`, batchJob);
      
      stats.phase = 'Batch job submitted';
      stats.aiProcessed = aiNames.length;
      onProgress?.(payeeNames.length, payeeNames.length, 100, stats);

      return {
        results: [], // Results will come later via polling
        batchJob,
        stats
      };
    } catch (error) {
      console.error('[HYBRID BATCH] Error creating batch job:', error);
      throw new Error(`Failed to create batch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // Real-time processing
    stats.phase = 'Processing with AI (real-time)';
    
    try {
      const aiResults = await classifyPayeesParallel(
        aiNames,
        (current, total) => {
          const totalProgress = stats.keywordExcluded + current;
          const percentage = (totalProgress / payeeNames.length) * 100;
          stats.phase = `AI processing: ${current}/${total}`;
          stats.aiProcessed = current;
          onProgress?.(totalProgress, payeeNames.length, percentage, stats);
        },
        config
      );

      console.log(`[HYBRID BATCH] AI processing complete. Results:`, aiResults);

      // Merge AI results back into final results
      needsAI.forEach((item, aiIndex) => {
        const aiResult = aiResults[aiIndex];
        finalResults[item.index] = {
          classification: aiResult?.classification || 'Individual',
          confidence: aiResult?.confidence || 0,
          reasoning: aiResult?.reasoning || 'AI classification failed',
          processingTier: 'AI-Powered'
        };
      });

      stats.phase = 'Complete';
      stats.aiProcessed = aiNames.length;
      onProgress?.(payeeNames.length, payeeNames.length, 100, stats);

      return {
        results: finalResults.filter(r => r !== null) as HybridBatchResult['results'],
        stats
      };
    } catch (error) {
      console.error('[HYBRID BATCH] Error in real-time processing:', error);
      throw new Error(`Real-time processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Complete a batch job by retrieving and processing results
 */
export async function completeBatchJob(
  batchJob: BatchJob,
  originalPayeeNames: string[]
): Promise<HybridBatchResult> {
  console.log(`[HYBRID BATCH] Completing batch job ${batchJob.id} for ${originalPayeeNames.length} payees`);
  
  // Re-apply keyword exclusions to get the same filtering
  const exclusionResults = originalPayeeNames.map(name => checkKeywordExclusions(name));
  const needsAI: { name: string; index: number }[] = [];
  const finalResults = originalPayeeNames.map((name, index) => {
    const exclusionResult = exclusionResults[index];
    if (exclusionResult.excluded) {
      return {
        classification: exclusionResult.classification,
        confidence: exclusionResult.confidence,
        reasoning: exclusionResult.reasoning,
        processingTier: 'Rule-Based'
      };
    } else {
      needsAI.push({ name, index });
      return null;
    }
  });

  if (needsAI.length === 0) {
    return {
      results: finalResults.filter(r => r !== null) as HybridBatchResult['results']
    };
  }

  const aiNames = needsAI.map(item => item.name);
  
  try {
    console.log(`[HYBRID BATCH] Retrieving batch results for ${aiNames.length} AI-processed names`);
    const batchResults = await getBatchJobResults(batchJob, aiNames);
    
    // Merge batch results back into final results
    needsAI.forEach((item, aiIndex) => {
      const batchResult = batchResults[aiIndex];
      finalResults[item.index] = {
        classification: batchResult?.classification || 'Individual',
        confidence: batchResult?.confidence || 0,
        reasoning: batchResult?.reasoning || 'Batch processing failed',
        processingTier: batchResult?.status === 'success' ? 'AI-Powered' : 'Failed'
      };
    });

    console.log(`[HYBRID BATCH] Batch job completion successful`);

    return {
      results: finalResults.filter(r => r !== null) as HybridBatchResult['results'],
      stats: {
        keywordExcluded: originalPayeeNames.length - needsAI.length,
        aiProcessed: needsAI.length,
        phase: 'Complete'
      }
    };
  } catch (error) {
    console.error('[HYBRID BATCH] Error completing batch job:', error);
    throw new Error(`Failed to complete batch job: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
