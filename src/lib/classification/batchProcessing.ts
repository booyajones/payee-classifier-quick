
import { ClassificationResult, ClassificationConfig } from '../types';
import { MAX_CONCURRENCY, MAX_BATCH_SIZE, DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { applyAIClassification } from './aiClassification';
import { classifyPayeesBatchWithAI, getOpenAIClient } from '../openai';
import { classifyPayee } from './utils';

/**
 * Apply rule-based and NLP classification to a batch of payees in parallel
 */
async function applyBasicClassificationBatch(
  payeeNames: string[],
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<Map<string, ClassificationResult>> {
  // If we're bypassing rule-based and NLP classification, return an empty map
  if (config.bypassRuleNLP) {
    return new Map<string, ClassificationResult>();
  }
  
  const results = new Map<string, ClassificationResult>();
  
  // Process payees in parallel with a reduced concurrency limit
  const chunks = [];
  for (let i = 0; i < payeeNames.length; i += MAX_CONCURRENCY) {
    chunks.push(payeeNames.slice(i, i + MAX_CONCURRENCY));
  }
  
  // Process each chunk
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (name) => {
      try {
        // Try rule-based first
        const ruleResult = applyRuleBasedClassification(name);
        if (ruleResult && ruleResult.confidence >= config.aiThreshold) {
          results.set(name, ruleResult);
          return;
        }
        
        // Try NLP-based next if rule-based didn't meet the threshold
        const nlpResult = applyNLPClassification(name);
        if (nlpResult && nlpResult.confidence >= config.aiThreshold) {
          results.set(name, nlpResult);
          return;
        }
        
        // Don't set a result if both fail to meet the threshold - will be picked up by AI batch
      } catch (error) {
        console.error(`Error classifying ${name} with basic methods:`, error);
      }
    }));
  }
  
  return results;
}

/**
 * Apply AI classification to a batch of payees with improved error handling
 */
async function applyAIClassificationBatch(payeeNames: string[]): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();
  const openaiClient = getOpenAIClient();
  
  if (!openaiClient || payeeNames.length === 0) {
    // Fall back to individual processing if no OpenAI client
    const simResults = await Promise.all(
      payeeNames.map(async (name) => {
        const result = await applyAIClassification(name);
        return { name, result };
      })
    );
    
    simResults.forEach(({ name, result }) => {
      results.set(name, result);
    });
    
    return results;
  }
  
  try {
    // Process in smaller batches of MAX_BATCH_SIZE (now 5)
    for (let i = 0; i < payeeNames.length; i += MAX_BATCH_SIZE) {
      const batchNames = payeeNames.slice(i, i + MAX_BATCH_SIZE);
      
      try {
        console.log(`Processing AI batch ${Math.floor(i/MAX_BATCH_SIZE) + 1} of ${Math.ceil(payeeNames.length/MAX_BATCH_SIZE)}`);
        
        // Use batch API for this chunk with a larger timeout
        const batchResults = await classifyPayeesBatchWithAI(batchNames, 60000); // 60 second timeout for batches
        
        // Map results back to the results map
        batchResults.forEach(result => {
          results.set(result.payeeName, {
            classification: result.classification,
            confidence: result.confidence,
            reasoning: result.reasoning,
            processingTier: 'AI-Assisted' as const
          });
        });
      } catch (error) {
        console.error(`Error with batch AI classification for batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}:`, error);
        
        // Fall back to individual processing for this batch on failure
        console.log(`Falling back to individual processing for batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}`);
        
        const individualResults = await Promise.all(
          batchNames.map(async (name) => {
            try {
              const result = await applyAIClassification(name);
              return { name, result };
            } catch (innerError) {
              console.error(`Error classifying ${name} individually:`, innerError);
              // Provide a fallback result with low confidence
              return { 
                name,
                result: {
                  classification: 'Individual' as const, 
                  confidence: 40,
                  reasoning: "Classification failed due to API error",
                  processingTier: 'AI-Assisted' as const
                } 
              };
            }
          })
        );
        
        individualResults.forEach(({ name, result }) => {
          results.set(name, result);
        });
      }
    }
  } catch (error) {
    console.error("Error processing AI classification batch:", error);
    
    // Fall back to individual processing for all remaining names
    const fallbackResults = await Promise.all(
      payeeNames.map(async (name) => {
        try {
          const result = await applyAIClassification(name);
          return { name, result };
        } catch (innerError) {
          console.error(`Error classifying ${name} individually:`, innerError);
          // Provide a fallback with low confidence
          return { 
            name, 
            result: {
              classification: 'Individual' as const,
              confidence: 40,
              reasoning: "Classification failed due to an error",
              processingTier: 'AI-Assisted' as const
            }
          };
        }
      })
    );
    
    fallbackResults.forEach(({ name, result }) => {
      results.set(name, result);
    });
  }
  
  return results;
}

/**
 * Process a batch of payee names with configuration options and improved progress tracking
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Filter out empty names
  const validPayeeNames = payeeNames.filter(name => name && name.trim() !== '');
  if (validPayeeNames.length === 0) {
    return [];
  }
  
  const total = validPayeeNames.length;
  const results: ClassificationResult[] = new Array(total);
  
  // Create a map for quick lookup of name to index
  const nameToIndexMap = new Map<string, number>();
  validPayeeNames.forEach((name, index) => {
    nameToIndexMap.set(name, index);
  });
  
  // Set initial progress
  if (onProgress) {
    onProgress(0, total, 0);
  }
  
  try {
    // Step 1: Apply rule-based and NLP classification in parallel (fast) if not bypassed
    console.time('Basic classification');
    const basicResults = await applyBasicClassificationBatch(validPayeeNames, config);
    console.timeEnd('Basic classification');
    
    console.log(`Basic classification results: ${basicResults.size} / ${total}`);
    
    // Update progress after basic classification
    let classifiedCount = basicResults.size;
    if (onProgress) {
      // Calculate progress percentage - if we're using AI-Only mode, this step is skipped
      const progressPercentage = config.bypassRuleNLP ? 0 : 
        Math.round((classifiedCount / total) * 20); // Use 20% for basic classification
      onProgress(classifiedCount, total, progressPercentage);
    }
    
    // Step 2: Apply AI classification to remaining payees
    const aiClassificationNeeded = validPayeeNames.filter(name => !basicResults.has(name));
    console.log(`Names needing AI classification: ${aiClassificationNeeded.length} / ${total}`);
    
    // Set progress to show we're beginning AI classification
    if (onProgress && aiClassificationNeeded.length > 0) {
      const startPercentage = config.bypassRuleNLP ? 5 : 25; // 5% if AI-only, 25% if standard
      onProgress(classifiedCount, total, startPercentage);
    }
    
    let aiResults = new Map<string, ClassificationResult>();
    if (aiClassificationNeeded.length > 0) {
      console.time('AI classification');
      
      // Process AI classification in smaller batches to update progress more frequently
      const AI_PROGRESS_BATCH_SIZE = 10;
      for (let i = 0; i < aiClassificationNeeded.length; i += AI_PROGRESS_BATCH_SIZE) {
        // Get the current batch of names
        const currentBatch = aiClassificationNeeded.slice(i, i + AI_PROGRESS_BATCH_SIZE);
        
        // Process this batch
        const batchResults = await applyAIClassificationBatch(currentBatch);
        
        // Add these results to our overall results
        batchResults.forEach((value, key) => {
          aiResults.set(key, value);
        });
        
        // Update progress as each AI batch completes
        if (onProgress) {
          const totalAIItems = aiClassificationNeeded.length;
          const processedAIItems = Math.min(i + AI_PROGRESS_BATCH_SIZE, totalAIItems);
          const aiProgressPercent = Math.floor((processedAIItems / totalAIItems) * 75);
          
          // Calculate overall progress (25% for basic + 75% for AI = 100%)
          const baseProgress = config.bypassRuleNLP ? 5 : 25;
          const overallProgress = baseProgress + Math.floor(aiProgressPercent * (100 - baseProgress) / 100);
          
          classifiedCount = basicResults.size + processedAIItems;
          onProgress(classifiedCount, total, Math.min(overallProgress, 99)); // Never show 100% until we're done
        }
      }
      
      console.timeEnd('AI classification');
    }
    
    // Combine results
    for (const name of validPayeeNames) {
      // Get the original index of this name
      const index = nameToIndexMap.get(name)!;
      
      if (basicResults.has(name)) {
        results[index] = basicResults.get(name)!;
      } else if (aiResults.has(name)) {
        results[index] = aiResults.get(name)!;
      } else {
        // Fallback for any missed names
        console.warn(`No classification result for: ${name}, using fallback`);
        results[index] = {
          classification: 'Individual', // Default fallback
          confidence: 40,
          reasoning: "Classification could not be determined with high confidence",
          processingTier: 'Rule-Based'
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
    
    // Fall back to sequential processing on error
    console.log("Falling back to sequential processing");
    
    const fallbackResults: ClassificationResult[] = [];
    let processed = 0;
    
    for (const name of validPayeeNames) {
      try {
        const result = await classifyPayee(name, config);
        fallbackResults.push(result);
      } catch (innerError) {
        console.error(`Error classifying ${name}:`, innerError);
        // Use default fallback
        fallbackResults.push({
          classification: 'Individual',
          confidence: 40,
          reasoning: "Classification failed due to an error",
          processingTier: 'Rule-Based'
        });
      }
      
      // Update progress
      processed++;
      if (onProgress) {
        const percentage = Math.round((processed / total) * 100);
        onProgress(processed, total, percentage);
      }
    }
    
    return fallbackResults;
  }
}
