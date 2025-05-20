
import { ClassificationResult, ClassificationConfig } from '../types';
import { MAX_CONCURRENCY, DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { applyAIClassification } from './aiClassification';
import { classifyPayeesBatchWithAI, getOpenAIClient } from '../openai';
import { classifyPayee } from './utils';
import { normalizeText } from './enhancedRules';

// Increased from MAX_BATCH_SIZE import from openai/batchClassification
const PROCESS_BATCH_SIZE = 20; // Increased for better throughput

/**
 * Apply rule-based and NLP classification to a batch of payees in parallel with improved performance
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
  
  // Process payees in parallel with increased concurrency
  const chunks = [];
  for (let i = 0; i < payeeNames.length; i += MAX_CONCURRENCY * 2) { // Double concurrency
    chunks.push(payeeNames.slice(i, i + MAX_CONCURRENCY * 2));
  }
  
  // Process each chunk with optimized concurrency
  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (name) => {
      try {
        // Normalize name for consistency
        const normalizedName = normalizeText(name);
        
        // Try rule-based first (now more optimized)
        const ruleResult = applyRuleBasedClassification(name);
        if (ruleResult && ruleResult.confidence >= config.aiThreshold) {
          results.set(normalizedName, ruleResult);
          return;
        }
        
        // Try NLP-based next if rule-based didn't meet the threshold
        const nlpResult = applyNLPClassification(name);
        if (nlpResult && nlpResult.confidence >= config.aiThreshold) {
          results.set(normalizedName, nlpResult);
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
 * Apply AI classification to a batch of payees with improved batching
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
      results.set(normalizeText(name), result);
    });
    
    return results;
  }
  
  try {
    // Process in larger batches with PROCESS_BATCH_SIZE (now 20)
    for (let i = 0; i < payeeNames.length; i += PROCESS_BATCH_SIZE) {
      const batchNames = payeeNames.slice(i, i + PROCESS_BATCH_SIZE);
      
      try {
        console.log(`Processing AI batch ${Math.floor(i/PROCESS_BATCH_SIZE) + 1} of ${Math.ceil(payeeNames.length/PROCESS_BATCH_SIZE)}`);
        
        // Use batch API with increased timeout for larger batches
        const batchResults = await classifyPayeesBatchWithAI(batchNames, 90000); // 90 second timeout for larger batches
        
        // Map results back to the results map
        batchResults.forEach(result => {
          results.set(normalizeText(result.payeeName), {
            classification: result.classification,
            confidence: result.confidence,
            reasoning: result.reasoning,
            processingTier: 'AI-Assisted' as const
          });
        });
      } catch (error) {
        console.error(`Error with batch AI classification for batch ${Math.floor(i/PROCESS_BATCH_SIZE) + 1}:`, error);
        
        // Process this batch in parallel with controlled concurrency
        const individualPromises = batchNames.map(name => 
          applyAIClassification(name)
            .then(result => ({ name, result }))
            .catch(innerError => {
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
            })
        );
        
        const individualResults = await Promise.all(individualPromises);
        individualResults.forEach(({ name, result }) => {
          results.set(normalizeText(name), result);
        });
      }
    }
  } catch (error) {
    console.error("Error processing AI classification batch:", error);
    
    // Fall back to individual processing with improved parallelism
    const concurrencyLimit = 15; // Higher concurrency for fallback
    
    for (let i = 0; i < payeeNames.length; i += concurrencyLimit) {
      const batchNames = payeeNames.slice(i, i + concurrencyLimit);
      
      const fallbackPromises = batchNames.map(name => 
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
  }
  
  return results;
}

/**
 * Process a batch of payee names with configuration options and improved performance
 */
export async function processBatch(
  payeeNames: string[], 
  onProgress?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // First, deduplicate payee names to improve processing efficiency
  const uniqueNames = new Map<string, string>();
  const validPayeeNames: string[] = [];
  
  // Filter empty names and track original indices
  payeeNames.forEach(name => {
    if (name && name.trim() !== '') {
      validPayeeNames.push(name);
      // Use normalized version for deduplication
      const normalized = normalizeText(name);
      if (!uniqueNames.has(normalized)) {
        uniqueNames.set(normalized, name);
      }
    }
  });
  
  const uniquePayeeNames = Array.from(uniqueNames.values());
  const total = validPayeeNames.length;
  
  console.log(`Processing ${uniquePayeeNames.length} unique names out of ${total} total`);
  
  if (total === 0) {
    return [];
  }
  
  const results: ClassificationResult[] = new Array(total);
  const nameToIndexMap = new Map<string, number[]>();
  
  // Build map of normalized name to all original indices
  validPayeeNames.forEach((name, index) => {
    const normalized = normalizeText(name);
    const indices = nameToIndexMap.get(normalized) || [];
    indices.push(index);
    nameToIndexMap.set(normalized, indices);
  });
  
  // Set initial progress
  if (onProgress) {
    onProgress(0, total, 0);
  }
  
  try {
    // Step 1: Apply rule-based and NLP classification in parallel (fast) if not bypassed
    console.time('Basic classification');
    const basicResults = await applyBasicClassificationBatch(uniquePayeeNames, config);
    console.timeEnd('Basic classification');
    
    console.log(`Basic classification results: ${basicResults.size} / ${uniquePayeeNames.length}`);
    
    // Update progress after basic classification
    let classifiedCount = 0;
    
    // Map basic results to all matching indices
    basicResults.forEach((result, normalizedName) => {
      const indices = nameToIndexMap.get(normalizedName) || [];
      indices.forEach(idx => {
        results[idx] = result;
        classifiedCount++;
      });
    });
    
    if (onProgress) {
      // Calculate progress percentage - if we're using AI-Only mode, this step is skipped
      const progressPercentage = config.bypassRuleNLP ? 0 : 
        Math.round((classifiedCount / total) * 30); // Use 30% for basic classification
      onProgress(classifiedCount, total, progressPercentage);
    }
    
    // Step 2: Apply AI classification to remaining unique payees
    const aiClassificationNeeded = uniquePayeeNames.filter(name => 
      !basicResults.has(normalizeText(name))
    );
    
    console.log(`Names needing AI classification: ${aiClassificationNeeded.length} / ${uniquePayeeNames.length}`);
    
    // Set progress to show we're beginning AI classification
    if (onProgress && aiClassificationNeeded.length > 0) {
      const startPercentage = config.bypassRuleNLP ? 5 : 30; // 5% if AI-only, 30% if standard
      onProgress(classifiedCount, total, startPercentage);
    }
    
    let aiResults = new Map<string, ClassificationResult>();
    if (aiClassificationNeeded.length > 0) {
      console.time('AI classification');
      
      // Process AI classification with larger batch size
      const AI_PROGRESS_BATCH_SIZE = 20; // Increased from 10
      for (let i = 0; i < aiClassificationNeeded.length; i += AI_PROGRESS_BATCH_SIZE) {
        // Get the current batch of names
        const currentBatch = aiClassificationNeeded.slice(i, i + AI_PROGRESS_BATCH_SIZE);
        
        // Process this batch
        const batchResults = await applyAIClassificationBatch(currentBatch);
        
        // Add these results to our overall results
        batchResults.forEach((value, key) => {
          aiResults.set(key, value);
        });
        
        // Map AI results to all matching indices
        batchResults.forEach((result, normalizedName) => {
          const indices = nameToIndexMap.get(normalizedName) || [];
          indices.forEach(idx => {
            if (!results[idx]) { // Only set if not already classified
              results[idx] = result;
              classifiedCount++;
            }
          });
        });
        
        // Update progress as each AI batch completes
        if (onProgress) {
          const totalAIItems = aiClassificationNeeded.length;
          const processedAIItems = Math.min(i + AI_PROGRESS_BATCH_SIZE, totalAIItems);
          const aiProgressPercent = Math.floor((processedAIItems / totalAIItems) * 70);
          
          // Calculate overall progress (30% for basic + 70% for AI = 100%)
          const baseProgress = config.bypassRuleNLP ? 5 : 30;
          const overallProgress = baseProgress + Math.floor(aiProgressPercent * (100 - baseProgress) / 100);
          
          onProgress(classifiedCount, total, Math.min(overallProgress, 99)); // Never show 100% until we're done
        }
      }
      
      console.timeEnd('AI classification');
    }
    
    // Check for any missed classifications and fill with fallbacks
    for (let i = 0; i < total; i++) {
      if (!results[i]) {
        const name = validPayeeNames[i];
        console.warn(`No classification result for: ${name}, using fallback`);
        results[i] = {
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
    
    // Fall back to enhanced sequential processing with better concurrency
    console.log("Falling back to enhanced sequential processing");
    
    const fallbackResults: ClassificationResult[] = [];
    let processed = 0;
    
    // Process in batches of 10 for better performance
    const FALLBACK_BATCH_SIZE = 10;
    for (let i = 0; i < validPayeeNames.length; i += FALLBACK_BATCH_SIZE) {
      const batch = validPayeeNames.slice(i, i + FALLBACK_BATCH_SIZE);
      
      const batchPromises = batch.map(name => 
        classifyPayee(name, config)
          .catch(error => {
            console.error(`Error classifying ${name}:`, error);
            // Use default fallback
            return {
              classification: 'Individual' as const,
              confidence: 40,
              reasoning: "Classification failed due to an error",
              processingTier: 'Rule-Based' as const
            };
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      fallbackResults.push(...batchResults);
      
      // Update progress
      processed += batch.length;
      if (onProgress) {
        const percentage = Math.round((processed / total) * 100);
        onProgress(processed, total, percentage);
      }
    }
    
    return fallbackResults;
  }
}
