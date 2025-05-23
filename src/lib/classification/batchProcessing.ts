
import { ClassificationResult, ClassificationConfig } from '../types';
import { MAX_CONCURRENCY, DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyAIClassification } from './aiClassification';
import { normalizeText } from './enhancedRules';

const PROCESS_BATCH_SIZE = 20;

/**
 * Apply AI classification to a batch of payees using built-in simulation
 */
async function applyAIClassificationBatch(payeeNames: string[]): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  
  try {
    // Process in batches for better performance
    for (let i = 0; i < payeeNames.length; i += PROCESS_BATCH_SIZE) {
      const batchNames = payeeNames.slice(i, i + PROCESS_BATCH_SIZE);
      
      console.log(`Processing AI simulation batch ${Math.floor(i/PROCESS_BATCH_SIZE) + 1} of ${Math.ceil(payeeNames.length/PROCESS_BATCH_SIZE)}`);
      
      // Process batch in parallel using built-in AI simulation
      const batchPromises = batchNames.map(async (name) => {
        const result = await applyAIClassification(name);
        return { name, result };
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Map results back to the results map
      batchResults.forEach(({ name, result }) => {
        results.set(normalizeText(name), result);
      });
    }
  } catch (error) {
    console.error("Error processing AI classification batch:", error);
    
    // Fall back to individual processing
    const fallbackPromises = payeeNames.map(name => 
      applyAIClassification(name)
        .then(result => ({ name, result }))
        .catch(innerError => {
          console.error(`Error classifying ${name}:`, innerError);
          return { 
            name, 
            result: {
              classification: 'Individual' as const,
              confidence: 40,
              reasoning: "Classification failed due to an error",
              processingTier: 'AI-Assisted' as const
            }
          };
        })
    );
    
    const fallbackResults = await Promise.all(fallbackPromises);
    fallbackResults.forEach(({ name, result }) => {
      results.set(normalizeText(name), result);
    });
  }
  
  return results;
}

/**
 * Process a batch of payee names using built-in AI simulation
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Filter empty names
  const validPayeeNames = payeeNames.filter(name => name && name.trim() !== '');
  const total = validPayeeNames.length;
  
  console.log(`Processing ${total} payee names using built-in AI simulation`);
  
  if (total === 0) {
    return [];
  }
  
  const results: ClassificationResult[] = new Array(total);
  
  // Set initial progress
  if (onProgress) {
    onProgress(0, total, 0);
  }
  
  try {
    // Process all names with AI simulation
    console.time('AI simulation classification');
    
    const AI_PROGRESS_BATCH_SIZE = 10;
    let processedCount = 0;
    
    for (let i = 0; i < validPayeeNames.length; i += AI_PROGRESS_BATCH_SIZE) {
      const currentBatch = validPayeeNames.slice(i, i + AI_PROGRESS_BATCH_SIZE);
      
      // Process this batch
      const batchResults = await applyAIClassificationBatch(currentBatch);
      
      // Map results to the correct indices
      currentBatch.forEach((name, batchIndex) => {
        const globalIndex = i + batchIndex;
        const normalizedName = normalizeText(name);
        const result = batchResults.get(normalizedName);
        
        if (result) {
          results[globalIndex] = result;
        } else {
          // Fallback result
          results[globalIndex] = {
            classification: 'Individual',
            confidence: 40,
            reasoning: "Classification could not be determined",
            processingTier: 'AI-Assisted'
          };
        }
        
        processedCount++;
      });
      
      // Update progress
      if (onProgress) {
        const percentage = Math.round((processedCount / total) * 100);
        onProgress(processedCount, total, percentage);
      }
    }
    
    console.timeEnd('AI simulation classification');
    
    // Ensure all results are filled
    for (let i = 0; i < total; i++) {
      if (!results[i]) {
        const name = validPayeeNames[i];
        console.warn(`No classification result for: ${name}, using fallback`);
        results[i] = {
          classification: 'Individual',
          confidence: 40,
          reasoning: "Classification could not be determined with high confidence",
          processingTier: 'AI-Assisted'
        };
      }
    }
    
    // Set final progress
    if (onProgress) {
      onProgress(total, total, 100);
    }
    
    return results;
  } catch (error) {
    console.error("Error in batch processing:", error);
    
    // Fall back to simple sequential processing
    console.log("Falling back to sequential processing");
    
    const fallbackResults: ClassificationResult[] = [];
    
    for (let i = 0; i < validPayeeNames.length; i++) {
      const name = validPayeeNames[i];
      
      try {
        const result = await applyAIClassification(name);
        fallbackResults.push(result);
      } catch (error) {
        console.error(`Error classifying ${name}:`, error);
        fallbackResults.push({
          classification: 'Individual',
          confidence: 40,
          reasoning: "Classification failed due to an error",
          processingTier: 'AI-Assisted'
        });
      }
      
      // Update progress
      if (onProgress) {
        const percentage = Math.round(((i + 1) / total) * 100);
        onProgress(i + 1, total, percentage);
      }
    }
    
    return fallbackResults;
  }
}
