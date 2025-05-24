
import { ClassificationResult, ClassificationConfig } from '../types';
import { optimizedBatchClassification } from '../openai/optimizedBatchClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules, normalizeText } from './enhancedRules';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';

const ENHANCED_BATCH_SIZE = 15; // Optimized batch size
const MAX_PARALLEL_BATCHES = 3; // Process multiple batches in parallel

interface ProcessingStats {
  totalNames: number;
  processedCount: number;
  cacheHits: number;
  apiCalls: number;
  ruleBasedCount: number;
  startTime: number;
}

/**
 * Apply rule-based pre-filtering to reduce API calls
 */
function applyRuleBasedPreFilter(payeeNames: string[]): {
  ruleBasedResults: Map<string, ClassificationResult>;
  remainingNames: string[];
} {
  const ruleBasedResults = new Map<string, ClassificationResult>();
  const remainingNames: string[] = [];

  for (const name of payeeNames) {
    // Check for definitive business indicators
    const businessCheck = detectBusinessByExtendedRules(name);
    if (businessCheck.isMatch && businessCheck.rules.length > 0) {
      ruleBasedResults.set(name, {
        classification: 'Business',
        confidence: 95, // High confidence for rule-based matches
        reasoning: `Rule-based classification: ${businessCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: businessCheck.rules
      });
      continue;
    }

    // Check for definitive individual indicators
    const individualCheck = detectIndividualByExtendedRules(name);
    if (individualCheck.isMatch && individualCheck.rules.length > 0) {
      ruleBasedResults.set(name, {
        classification: 'Individual',
        confidence: 93, // High confidence for individual patterns
        reasoning: `Rule-based classification: ${individualCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.rules
      });
      continue;
    }

    // If no definitive rule match, add to remaining names for AI processing
    remainingNames.push(name);
  }

  return { ruleBasedResults, remainingNames };
}

/**
 * Enhanced batch processing with optimizations for speed, completeness, and accuracy
 */
export async function enhancedProcessBatch(
  payeeNames: string[],
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  const stats: ProcessingStats = {
    totalNames: payeeNames.length,
    processedCount: 0,
    cacheHits: 0,
    apiCalls: 0,
    ruleBasedCount: 0,
    startTime: Date.now()
  };

  // Filter empty names
  const validPayeeNames = payeeNames.filter(name => name && name.trim() !== '');
  const total = validPayeeNames.length;
  
  console.log(`[ENHANCED] Starting enhanced batch processing of ${total} payees`);
  
  if (total === 0) {
    return [];
  }

  // Initialize progress
  if (onProgress) {
    onProgress(0, total, 0, { 
      phase: 'Initializing',
      cacheHits: 0,
      ruleBasedCount: 0,
      estimatedTimeRemaining: 'Calculating...'
    });
  }

  const results: ClassificationResult[] = new Array(total);

  try {
    // Phase 1: Apply rule-based pre-filtering
    console.log(`[ENHANCED] Phase 1: Applying rule-based pre-filtering`);
    const { ruleBasedResults, remainingNames } = applyRuleBasedPreFilter(validPayeeNames);
    
    stats.ruleBasedCount = ruleBasedResults.size;
    console.log(`[ENHANCED] Rule-based pre-filtering: ${stats.ruleBasedCount} resolved, ${remainingNames.length} remaining for AI`);

    // Update progress after rule-based filtering
    stats.processedCount = stats.ruleBasedCount;
    if (onProgress) {
      const percentage = Math.round((stats.processedCount / total) * 100);
      onProgress(stats.processedCount, total, percentage, {
        phase: 'Rule-based filtering complete',
        ruleBasedCount: stats.ruleBasedCount,
        remainingForAI: remainingNames.length
      });
    }

    // Phase 2: Process remaining names with optimized AI classification
    if (remainingNames.length > 0) {
      console.log(`[ENHANCED] Phase 2: Processing ${remainingNames.length} names with optimized AI`);
      
      // Process in batches with parallel execution
      const batches: string[][] = [];
      for (let i = 0; i < remainingNames.length; i += ENHANCED_BATCH_SIZE) {
        batches.push(remainingNames.slice(i, i + ENHANCED_BATCH_SIZE));
      }

      console.log(`[ENHANCED] Processing ${batches.length} AI batches with max ${MAX_PARALLEL_BATCHES} parallel`);

      // Process batches with controlled parallelism
      for (let i = 0; i < batches.length; i += MAX_PARALLEL_BATCHES) {
        const parallelBatches = batches.slice(i, i + MAX_PARALLEL_BATCHES);
        
        const batchPromises = parallelBatches.map(async (batch, batchIndex) => {
          const globalBatchIndex = i + batchIndex;
          console.log(`[ENHANCED] Processing parallel batch ${globalBatchIndex + 1}/${batches.length} with ${batch.length} names`);
          
          try {
            const batchResults = await optimizedBatchClassification(batch);
            
            // Count cache hits and API calls
            batchResults.forEach(result => {
              if (result.source === 'cache') {
                stats.cacheHits++;
              } else {
                stats.apiCalls++;
              }
            });
            
            return batchResults.map(result => ({
              names: batch,
              results: batchResults
            }));
          } catch (error) {
            console.error(`[ENHANCED] Error in parallel batch ${globalBatchIndex + 1}:`, error);
            
            // Create fallback results for this batch
            return batch.map(name => ({
              payeeName: name,
              classification: 'Individual' as const,
              confidence: 0,
              reasoning: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              source: 'fallback' as const
            }));
          }
        });

        // Wait for all parallel batches to complete
        const parallelResults = await Promise.allSettled(batchPromises);
        
        parallelResults.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            const batchData = result.value;
            if (Array.isArray(batchData) && batchData.length > 0) {
              // Handle successful batch results
              const batch = parallelBatches[idx];
              const batchResults = batchData;
              
              batchResults.forEach((classificationResult, nameIndex) => {
                if (nameIndex < batch.length) {
                  const name = batch[nameIndex];
                  const globalIndex = validPayeeNames.indexOf(name);
                  
                  if (globalIndex !== -1) {
                    results[globalIndex] = {
                      classification: classificationResult.classification,
                      confidence: classificationResult.confidence,
                      reasoning: classificationResult.reasoning,
                      processingTier: 'AI-Powered'
                    };
                    stats.processedCount++;
                  }
                }
              });
            }
          } else {
            console.error(`[ENHANCED] Parallel batch failed:`, result.reason);
            // Handle failed batch by creating fallback results
            const batch = parallelBatches[idx];
            batch.forEach(name => {
              const globalIndex = validPayeeNames.indexOf(name);
              if (globalIndex !== -1) {
                results[globalIndex] = {
                  classification: 'Individual',
                  confidence: 0,
                  reasoning: 'Batch processing failed - using fallback classification',
                  processingTier: 'Rule-Based'
                };
                stats.processedCount++;
              }
            });
          }
        });

        // Update progress after each set of parallel batches
        if (onProgress) {
          const percentage = Math.round((stats.processedCount / total) * 100);
          const elapsedTime = (Date.now() - stats.startTime) / 1000;
          const estimatedTotalTime = (elapsedTime / stats.processedCount) * total;
          const estimatedTimeRemaining = Math.max(0, estimatedTotalTime - elapsedTime);
          
          onProgress(stats.processedCount, total, percentage, {
            phase: `AI Processing (Batch ${Math.min(i + MAX_PARALLEL_BATCHES, batches.length)}/${batches.length})`,
            cacheHits: stats.cacheHits,
            apiCalls: stats.apiCalls,
            ruleBasedCount: stats.ruleBasedCount,
            estimatedTimeRemaining: `${Math.round(estimatedTimeRemaining)}s`
          });
        }
      }
    }

    // Phase 3: Fill in rule-based results
    console.log(`[ENHANCED] Phase 3: Filling in rule-based results`);
    validPayeeNames.forEach((name, index) => {
      if (!results[index]) {
        const ruleResult = ruleBasedResults.get(name);
        if (ruleResult) {
          results[index] = ruleResult;
        } else {
          // Fallback for any missed names
          results[index] = {
            classification: 'Individual',
            confidence: 50,
            reasoning: 'Fallback classification - no processing result found',
            processingTier: 'Rule-Based'
          };
        }
      }
    });

    // Final progress update
    if (onProgress) {
      const totalTime = (Date.now() - stats.startTime) / 1000;
      onProgress(total, total, 100, {
        phase: 'Complete',
        cacheHits: stats.cacheHits,
        apiCalls: stats.apiCalls,
        ruleBasedCount: stats.ruleBasedCount,
        totalTime: `${totalTime.toFixed(2)}s`,
        avgTimePerName: `${(totalTime / total).toFixed(3)}s`
      });
    }

    const totalTime = (Date.now() - stats.startTime) / 1000;
    console.log(`[ENHANCED] Batch processing complete in ${totalTime.toFixed(2)}s:`);
    console.log(`[ENHANCED] - Rule-based: ${stats.ruleBasedCount}`);
    console.log(`[ENHANCED] - Cache hits: ${stats.cacheHits}`);
    console.log(`[ENHANCED] - API calls: ${stats.apiCalls}`);
    console.log(`[ENHANCED] - Average time per name: ${(totalTime / total).toFixed(3)}s`);

    return results;

  } catch (error) {
    console.error(`[ENHANCED] Error in enhanced batch processing:`, error);
    
    // Create fallback results for all names
    const fallbackResults = validPayeeNames.map(() => ({
      classification: 'Individual' as const,
      confidence: 0,
      reasoning: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTier: 'Rule-Based' as const
    }));

    return fallbackResults;
  }
}
