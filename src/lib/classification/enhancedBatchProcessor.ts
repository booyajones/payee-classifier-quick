
import { ClassificationResult, ClassificationConfig } from '../types';
import { optimizedBatchClassification } from '../openai/optimizedBatchClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules } from './enhancedRules';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';

const ENHANCED_BATCH_SIZE = 10; // Reduced for better reliability
const MAX_PARALLEL_BATCHES = 2; // Reduced for better stability

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
  console.log(`[ENHANCED] Applying rule-based pre-filtering to ${payeeNames.length} names`);
  
  const ruleBasedResults = new Map<string, ClassificationResult>();
  const remainingNames: string[] = [];

  for (const name of payeeNames) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      console.warn(`[ENHANCED] Skipping invalid name:`, name);
      continue;
    }

    // Check for definitive business indicators
    const businessCheck = detectBusinessByExtendedRules(name);
    if (businessCheck.isMatch && businessCheck.rules.length > 0) {
      ruleBasedResults.set(name, {
        classification: 'Business',
        confidence: 95,
        reasoning: `Rule-based: ${businessCheck.rules.join(", ")}`,
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
        confidence: 93,
        reasoning: `Rule-based: ${individualCheck.rules.join(", ")}`,
        processingTier: 'Rule-Based',
        matchingRules: individualCheck.rules
      });
      continue;
    }

    remainingNames.push(name);
  }

  console.log(`[ENHANCED] Rule-based filtering: ${ruleBasedResults.size} resolved, ${remainingNames.length} remaining`);
  return { ruleBasedResults, remainingNames };
}

/**
 * Enhanced batch processing with optimizations
 */
export async function enhancedProcessBatch(
  payeeNames: string[],
  onProgress?: (current: number, total: number, percentage: number, stats?: any) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  console.log(`[ENHANCED] Starting enhanced batch processing of ${payeeNames.length} payees`);

  const stats: ProcessingStats = {
    totalNames: payeeNames.length,
    processedCount: 0,
    cacheHits: 0,
    apiCalls: 0,
    ruleBasedCount: 0,
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
      cacheHits: 0,
      ruleBasedCount: 0,
      estimatedTimeRemaining: 'Calculating...'
    });
  }

  const results: ClassificationResult[] = new Array(total);

  try {
    // Phase 1: Apply rule-based pre-filtering
    console.log(`[ENHANCED] Phase 1: Rule-based pre-filtering`);
    const { ruleBasedResults, remainingNames } = applyRuleBasedPreFilter(validPayeeNames);
    
    stats.ruleBasedCount = ruleBasedResults.size;
    stats.processedCount = stats.ruleBasedCount;

    // Update progress after rule-based filtering
    if (onProgress) {
      const percentage = Math.round((stats.processedCount / total) * 100);
      onProgress(stats.processedCount, total, percentage, {
        phase: 'Rule-based filtering complete',
        ruleBasedCount: stats.ruleBasedCount,
        remainingForAI: remainingNames.length
      });
    }

    // Phase 2: Process remaining names with AI
    if (remainingNames.length > 0) {
      console.log(`[ENHANCED] Phase 2: Processing ${remainingNames.length} names with AI`);
      
      try {
        const aiResults = await optimizedBatchClassification(remainingNames);
        
        // Count cache hits and API calls
        aiResults.forEach(result => {
          if (result.source === 'cache') {
            stats.cacheHits++;
          } else {
            stats.apiCalls++;
          }
        });

        // Map AI results back to positions
        aiResults.forEach((aiResult, index) => {
          const name = remainingNames[index];
          if (name) {
            const globalIndex = validPayeeNames.indexOf(name);
            if (globalIndex !== -1) {
              results[globalIndex] = {
                classification: aiResult.classification,
                confidence: aiResult.confidence,
                reasoning: aiResult.reasoning,
                processingTier: 'AI-Powered'
              };
              stats.processedCount++;
            }
          }
        });

      } catch (error) {
        console.error(`[ENHANCED] AI processing failed:`, error);
        
        // Create fallback results for AI failures
        remainingNames.forEach(name => {
          const globalIndex = validPayeeNames.indexOf(name);
          if (globalIndex !== -1) {
            results[globalIndex] = {
              classification: 'Individual',
              confidence: 0,
              reasoning: `AI processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              processingTier: 'Rule-Based'
            };
            stats.processedCount++;
          }
        });
      }

      // Update progress after AI processing
      if (onProgress) {
        const percentage = Math.round((stats.processedCount / total) * 100);
        onProgress(stats.processedCount, total, percentage, {
          phase: 'AI processing complete',
          cacheHits: stats.cacheHits,
          apiCalls: stats.apiCalls,
          ruleBasedCount: stats.ruleBasedCount
        });
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
          // Final fallback
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
