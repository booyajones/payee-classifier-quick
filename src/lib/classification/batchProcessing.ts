
import { ClassificationResult, ClassificationConfig } from '../types';
import { MAX_CONCURRENCY, DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { classifyPayeesBatchWithAI } from '../openai/batchClassification';
import { normalizeText } from './enhancedRules';

const PROCESS_BATCH_SIZE = 15;

/**
 * Apply real OpenAI classification to a batch of payees
 */
async function applyOpenAIClassificationBatch(payeeNames: string[]): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  
  try {
    console.log(`[PROCESSING] Starting batch of ${payeeNames.length} payees with OpenAI API`);
    
    // Use real OpenAI batch classification
    const batchResults = await classifyPayeesBatchWithAI(payeeNames);
    
    console.log(`[PROCESSING] Received ${batchResults.length} results from OpenAI`);
    
    // Map results back to the results map
    batchResults.forEach((result) => {
      const classificationResult: ClassificationResult = {
        classification: result.classification,
        confidence: result.confidence,
        reasoning: result.reasoning,
        processingTier: 'AI-Powered'
      };
      results.set(normalizeText(result.payeeName), classificationResult);
      console.log(`[PROCESSING] Mapped result for "${result.payeeName}": ${result.classification} (${result.confidence}%)`);
    });
    
    console.log(`[PROCESSING] Successfully processed ${batchResults.length} payees with OpenAI`);
  } catch (error) {
    console.error("[PROCESSING] Error processing OpenAI classification batch:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
  
  return results;
}

/**
 * Process a batch of payee names using real OpenAI API
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Start timing
  const startTime = Date.now();
  
  // Filter empty names
  const validPayeeNames = payeeNames.filter(name => name && name.trim() !== '');
  const total = validPayeeNames.length;
  
  console.log(`[MAIN] Processing ${total} payee names using OpenAI API (started at ${new Date(startTime).toISOString()})`);
  
  if (total === 0) {
    return [];
  }
  
  const results: ClassificationResult[] = new Array(total);
  
  // Set initial progress
  if (onProgress) {
    onProgress(0, total, 0);
  }
  
  try {
    // Process all names with real OpenAI API in batches
    const PROGRESS_BATCH_SIZE = 10;
    let processedCount = 0;
    
    for (let i = 0; i < validPayeeNames.length; i += PROGRESS_BATCH_SIZE) {
      const batchStartTime = Date.now();
      const currentBatch = validPayeeNames.slice(i, i + PROGRESS_BATCH_SIZE);
      
      console.log(`[MAIN] Processing batch ${Math.floor(i/PROGRESS_BATCH_SIZE) + 1} of ${Math.ceil(validPayeeNames.length/PROGRESS_BATCH_SIZE)} (${currentBatch.length} names)`);
      
      // Process this batch with real OpenAI
      const batchResults = await applyOpenAIClassificationBatch(currentBatch);
      
      const batchEndTime = Date.now();
      const batchDuration = (batchEndTime - batchStartTime) / 1000;
      console.log(`[MAIN] Batch completed in ${batchDuration.toFixed(2)} seconds`);
      
      // Map results to the correct indices
      currentBatch.forEach((name, batchIndex) => {
        const globalIndex = i + batchIndex;
        const normalizedName = normalizeText(name);
        const result = batchResults.get(normalizedName);
        
        if (result) {
          results[globalIndex] = result;
          console.log(`[MAIN] Assigned result for "${name}" at index ${globalIndex}: ${result.classification}`);
        } else {
          console.error(`[MAIN] No result found for "${name}" (normalized: "${normalizedName}")`);
          throw new Error(`No classification result found for payee: ${name}`);
        }
        
        processedCount++;
      });
      
      // Update progress with timing info
      if (onProgress) {
        const percentage = Math.round((processedCount / total) * 100);
        const elapsedTime = (Date.now() - startTime) / 1000;
        console.log(`[MAIN] Progress: ${processedCount}/${total} (${percentage}%) - Elapsed: ${elapsedTime.toFixed(2)}s`);
        onProgress(processedCount, total, percentage);
      }
    }
    
    // Calculate final timing
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    // Set final progress
    if (onProgress) {
      onProgress(total, total, 100);
    }
    
    console.log(`[MAIN] Batch processing complete. Successfully processed ${total} payees in ${totalDuration.toFixed(2)} seconds.`);
    return results;
  } catch (error) {
    const errorTime = Date.now();
    const errorDuration = (errorTime - startTime) / 1000;
    console.error(`[MAIN] Error in batch processing after ${errorDuration.toFixed(2)} seconds:`, error);
    throw error; // Let the error bubble up to the UI
  }
}
