
import { ClassificationResult, ClassificationConfig } from '../types';
import { MAX_CONCURRENCY, DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { classifyPayeesBatchWithAI } from '../openai/batchClassification';
import { classifyPayeeWithAI } from '../openai/singleClassification';
import { normalizeText } from './enhancedRules';

const PROCESS_BATCH_SIZE = 15;

/**
 * Apply real OpenAI classification to a batch of payees
 */
async function applyOpenAIClassificationBatch(payeeNames: string[]): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  
  try {
    console.log(`Processing batch of ${payeeNames.length} payees with real OpenAI API`);
    
    // Use real OpenAI batch classification
    const batchResults = await classifyPayeesBatchWithAI(payeeNames);
    
    // Map results back to the results map
    batchResults.forEach((result) => {
      const classificationResult: ClassificationResult = {
        classification: result.classification,
        confidence: result.confidence,
        reasoning: result.reasoning,
        processingTier: 'AI-Powered'
      };
      results.set(normalizeText(result.payeeName), classificationResult);
    });
    
    console.log(`Successfully processed ${batchResults.length} payees with OpenAI`);
  } catch (error) {
    console.error("Error processing OpenAI classification batch:", error);
    
    // Fall back to individual processing with real OpenAI
    console.log("Falling back to individual OpenAI processing");
    const fallbackPromises = payeeNames.map(name => 
      classifyPayeeWithAI(name)
        .then(result => ({ name, result: {
          ...result,
          processingTier: 'AI-Powered' as const
        }}))
        .catch(innerError => {
          console.error(`Error classifying ${name}:`, innerError);
          return { 
            name, 
            result: {
              classification: 'Individual' as const,
              confidence: 40,
              reasoning: "Classification failed due to an error",
              processingTier: 'AI-Powered' as const
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
 * Process a batch of payee names using real OpenAI API
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Filter empty names
  const validPayeeNames = payeeNames.filter(name => name && name.trim() !== '');
  const total = validPayeeNames.length;
  
  console.log(`Processing ${total} payee names using real OpenAI API`);
  
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
      const currentBatch = validPayeeNames.slice(i, i + PROGRESS_BATCH_SIZE);
      
      console.log(`Processing batch ${Math.floor(i/PROGRESS_BATCH_SIZE) + 1} of ${Math.ceil(validPayeeNames.length/PROGRESS_BATCH_SIZE)}`);
      
      // Process this batch with real OpenAI
      const batchResults = await applyOpenAIClassificationBatch(currentBatch);
      
      // Map results to the correct indices
      currentBatch.forEach((name, batchIndex) => {
        const globalIndex = i + batchIndex;
        const normalizedName = normalizeText(name);
        const result = batchResults.get(normalizedName);
        
        if (result) {
          results[globalIndex] = result;
        } else {
          console.warn(`No result found for ${name}, using fallback`);
          // Fallback result
          results[globalIndex] = {
            classification: 'Individual',
            confidence: 40,
            reasoning: "Classification could not be determined",
            processingTier: 'AI-Powered'
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
    
    // Ensure all results are filled
    for (let i = 0; i < total; i++) {
      if (!results[i]) {
        const name = validPayeeNames[i];
        console.warn(`No classification result for: ${name}, using fallback`);
        results[i] = {
          classification: 'Individual',
          confidence: 40,
          reasoning: "Classification could not be determined with high confidence",
          processingTier: 'AI-Powered'
        };
      }
    }
    
    // Set final progress
    if (onProgress) {
      onProgress(total, total, 100);
    }
    
    console.log(`Batch processing complete. Processed ${total} payees.`);
    return results;
  } catch (error) {
    console.error("Error in batch processing:", error);
    throw error;
  }
}
