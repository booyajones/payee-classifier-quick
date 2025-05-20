
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { enhancedClassifyPayeeWithAI, consensusClassification } from '../openai/enhancedClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules, normalizeText } from './enhancedRules';
import { normalizePayeeName, deduplicateNames, getCanonicalName } from './nameProcessing';

// Increased concurrency for parallel processing
const MAX_PARALLEL_PROCESSING = 15;

/**
 * Enhanced classification function that implements a multi-tiered approach
 * with persistent caching for improved performance
 */
export async function enhancedClassifyPayee(
  payeeName: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult> {
  if (!payeeName || payeeName.trim() === '') {
    return {
      classification: 'Individual', // Default
      confidence: 0,
      reasoning: "Invalid or empty payee name",
      processingTier: 'Rule-Based'
    };
  }
  
  // Normalize the payee name
  const normalizedName = normalizeText(payeeName);
  
  // Stage 1: Ultra-fast Rule Gate
  // Check for definitive business indicators first
  const businessCheck = detectBusinessByExtendedRules(payeeName);
  if (businessCheck.isMatch) {
    const result: ClassificationResult = {
      classification: 'Business',
      confidence: 99, // Near-certain confidence for legal entities
      reasoning: `Classified as business based on extended rules: ${businessCheck.rules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules: businessCheck.rules
    };
    return result;
  }
  
  // Check for definitive individual indicators
  const individualCheck = detectIndividualByExtendedRules(payeeName);
  if (individualCheck.isMatch) {
    const result: ClassificationResult = {
      classification: 'Individual',
      confidence: 97, // High confidence for individual name patterns
      reasoning: `Classified as individual based on extended rules: ${individualCheck.rules.join(", ")}`,
      processingTier: 'Rule-Based',
      matchingRules: individualCheck.rules
    };
    return result;
  }
  
  // If we're in offline mode, stick with rule-based classification
  if (config.offlineMode) {
    // Use our best guess based on rules
    const isLikelyBusiness = payeeName.split(' ').length > 2 || 
                            /\d/.test(payeeName) || 
                            payeeName.length > 25;
    
    return {
      classification: isLikelyBusiness ? 'Business' : 'Individual',
      confidence: 65, // Moderate confidence in offline mode
      reasoning: `Offline classification based on name structure and patterns.`,
      processingTier: 'Rule-Based'
    };
  }
  
  // If we're bypassing rule-based and NLP classification, go straight to AI
  if (config.bypassRuleNLP) {
    try {
      // Use consensus classification with fewer runs for better performance
      const aiResult = await consensusClassification(payeeName, 2);
      const result: ClassificationResult = {
        classification: aiResult.classification,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        processingTier: 'AI-Assisted',
        matchingRules: aiResult.matchingRules
      };
      return result;
    } catch (error) {
      console.error("Error with AI classification:", error);
      // Fall through to rule-based as backup
    }
  }
  
  // Regular tiered approach if not bypassing
  
  // Tier 1: Apply rule-based classification
  const ruleBasedResult = applyRuleBasedClassification(payeeName);
  if (ruleBasedResult && ruleBasedResult.confidence >= config.aiThreshold) {
    return ruleBasedResult;
  }
  
  // Tier 2: Apply NLP-based classification
  const nlpResult = applyNLPClassification(payeeName);
  if (nlpResult && nlpResult.confidence >= config.aiThreshold) {
    return nlpResult;
  }
  
  // Tier 3: Apply AI-assisted classification with optimized consensus (2 runs instead of 3)
  try {
    // Use consensus classification with fewer runs for better performance
    const aiResult = await consensusClassification(payeeName, 2);
    const result: ClassificationResult = {
      classification: aiResult.classification,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      processingTier: 'AI-Assisted',
      matchingRules: aiResult.matchingRules
    };
    return result;
  } catch (error) {
    console.error("Error with consensus classification:", error);
    
    // Fallback to single AI classification
    try {
      const result = await enhancedClassifyPayeeWithAI(payeeName);
      const classificationResult: ClassificationResult = {
        classification: result.classification,
        confidence: result.confidence,
        reasoning: result.reasoning,
        processingTier: 'AI-Assisted',
        matchingRules: result.matchingRules
      };
      return classificationResult;
    } catch (innerError) {
      console.error("Error with enhanced AI classification:", innerError);
      
      // Last resort: basic heuristic
      return {
        classification: payeeName.split(/\s+/).length <= 2 ? 'Individual' : 'Business',
        confidence: 51, // Just above the minimum
        reasoning: "Classification based on fallback heuristics due to service errors",
        processingTier: 'Rule-Based'
      };
    }
  }
}

/**
 * Process a batch of payee names with the enhanced classifier
 * Implements parallel processing with controlled concurrency and name deduplication
 */
export async function enhancedProcessBatch(
  payeeNames: string[],
  progressCallback?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  // Filter out empty names
  const filteredNames = payeeNames.filter(name => name && name.trim() !== '');
  const total = payeeNames.length;
  
  // Initial progress update
  if (progressCallback) {
    progressCallback(0, total, 0);
  }
  
  // Step 1: Deduplicate names if enabled
  let uniqueNameMapping: Map<string, string[]> | null = null;
  let uniqueNames: string[] = [];
  
  if (config.useCacheForDuplicates && filteredNames.length > 5) {
    console.log("Deduplicating names for faster processing...");
    uniqueNameMapping = deduplicateNames(filteredNames);
    uniqueNames = Array.from(uniqueNameMapping.keys());
    console.log(`Reduced ${filteredNames.length} names to ${uniqueNames.length} unique groups`);
  } else {
    uniqueNames = [...filteredNames];
  }
  
  // Results mapping from canonical names to classification results
  const canonicalResults = new Map<string, ClassificationResult>();
  let processedCount = 0;
  
  // Process in batches with controlled parallelism
  for (let i = 0; i < uniqueNames.length; i += MAX_PARALLEL_PROCESSING) {
    const batch = uniqueNames.slice(i, i + MAX_PARALLEL_PROCESSING);
    
    // Process this batch in parallel
    const promises = batch.map(name => 
      enhancedClassifyPayee(name, config)
        .then(result => {
          // Store result with canonical name
          canonicalResults.set(name, result);
          return { name, result };
        })
        .catch(error => {
          console.error(`Error classifying "${name}":`, error);
          // Return a fallback result on error
          const fallback: ClassificationResult = {
            classification: 'Individual',
            confidence: 0,
            reasoning: "Classification failed: " + (error instanceof Error ? error.message : "Unknown error"),
            processingTier: 'Rule-Based'
          };
          canonicalResults.set(name, fallback);
          return { name, result: fallback };
        })
    );
    
    // Wait for all names in this batch to be processed
    await Promise.all(promises);
    
    processedCount += batch.length;
    
    // Update progress if callback provided
    if (progressCallback) {
      const percentage = Math.round((processedCount / uniqueNames.length) * 100);
      progressCallback(processedCount, total, percentage);
    }
  }
  
  // Map results back to original array positions
  const results: ClassificationResult[] = new Array(total);
  
  for (let i = 0; i < payeeNames.length; i++) {
    const name = payeeNames[i];
    if (!name || name.trim() === '') {
      // Handle empty names
      results[i] = {
        classification: 'Individual',
        confidence: 0,
        reasoning: "Empty payee name",
        processingTier: 'Rule-Based'
      };
    } else if (uniqueNameMapping) {
      // Find the canonical name for this name
      let found = false;
      for (const [canonicalName, similarNames] of uniqueNameMapping.entries()) {
        if (similarNames.includes(name)) {
          // Use result from canonical name
          results[i] = { ...canonicalResults.get(canonicalName)! };
          
          // Add a note if this is a similar match but not exact
          if (name !== canonicalName) {
            results[i].reasoning = `${results[i].reasoning} (matched with similar name "${canonicalName}")`;
          }
          
          found = true;
          break;
        }
      }
      
      // Fallback if no match found
      if (!found) {
        results[i] = {
          classification: 'Individual',
          confidence: 0,
          reasoning: "Classification failed: no match found in deduplicated names",
          processingTier: 'Rule-Based'
        };
      }
    } else {
      // Direct lookup when not using deduplication
      const result = canonicalResults.get(name);
      
      if (result) {
        results[i] = result;
      } else {
        // Fallback (should not happen)
        results[i] = {
          classification: 'Individual',
          confidence: 0,
          reasoning: "Classification failed: result not found",
          processingTier: 'Rule-Based'
        };
      }
    }
  }
  
  // Set final progress
  if (progressCallback) {
    progressCallback(total, total, 100);
  }
  
  return results;
}
