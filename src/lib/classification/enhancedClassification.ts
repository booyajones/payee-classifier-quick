
import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { applyNLPClassification } from './nlpClassification';
import { enhancedClassifyPayeeWithAI, consensusClassification } from '../openai/enhancedClassification';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules, normalizeText } from './enhancedRules';

// Cache for storing previously classified payees to improve performance
const classificationCache = new Map<string, ClassificationResult>();

/**
 * Enhanced classification function that implements a multi-tiered approach
 * with caching for improved performance
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
  
  // Check cache for previously processed identical names
  const cachedResult = classificationCache.get(normalizedName);
  if (cachedResult) {
    console.log(`Using cached result for "${payeeName}"`);
    return { ...cachedResult };
  }
  
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
    
    // Cache the result
    classificationCache.set(normalizedName, result);
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
    
    // Cache the result
    classificationCache.set(normalizedName, result);
    return result;
  }
  
  // If we're bypassing rule-based and NLP classification, go straight to AI
  if (config.bypassRuleNLP) {
    try {
      // Use consensus classification for higher accuracy
      const aiResult = await consensusClassification(payeeName, 3);
      const result: ClassificationResult = {
        classification: aiResult.classification,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        processingTier: 'AI-Assisted',
        matchingRules: aiResult.matchingRules
      };
      
      // Cache the result
      classificationCache.set(normalizedName, result);
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
    // Cache the result
    classificationCache.set(normalizedName, ruleBasedResult);
    return ruleBasedResult;
  }
  
  // Tier 2: Apply NLP-based classification
  const nlpResult = applyNLPClassification(payeeName);
  if (nlpResult && nlpResult.confidence >= config.aiThreshold) {
    // Cache the result
    classificationCache.set(normalizedName, nlpResult);
    return nlpResult;
  }
  
  // Tier 3: Apply AI-assisted classification with consensus
  try {
    // Use consensus classification for higher accuracy
    const aiResult = await consensusClassification(payeeName, 3);
    const result: ClassificationResult = {
      classification: aiResult.classification,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      processingTier: 'AI-Assisted',
      matchingRules: aiResult.matchingRules
    };
    
    // Cache the result
    classificationCache.set(normalizedName, result);
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
      
      // Cache the result
      classificationCache.set(normalizedName, classificationResult);
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
 * Implements caching for improved performance
 */
export async function enhancedProcessBatch(
  payeeNames: string[],
  progressCallback?: (current: number, total: number, percentage: number) => void,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult[]> {
  const results: ClassificationResult[] = [];
  const total = payeeNames.length;
  
  for (let i = 0; i < total; i++) {
    try {
      const result = await enhancedClassifyPayee(payeeNames[i], config);
      results.push(result);
    } catch (error) {
      console.error(`Error classifying "${payeeNames[i]}":`, error);
      // Add a placeholder result for failed items
      results.push({
        classification: 'Individual', // Default fallback
        confidence: 0, // Zero confidence indicates error
        reasoning: "Classification failed: " + (error instanceof Error ? error.message : "Unknown error"),
        processingTier: 'Rule-Based'
      });
    }
    
    // Call progress callback if provided
    if (progressCallback) {
      const percentage = Math.round((i + 1) / total * 100);
      progressCallback(i + 1, total, percentage);
    }
  }
  
  return results;
}
