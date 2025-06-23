import { ClassificationResult, ClassificationConfig } from '../types';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';
import { applyRuleBasedClassification } from './ruleBasedClassification';
import { classifyWithNLP } from './nlpClassification';
import { checkKeywordExclusion } from './keywordExclusion';
import { detectBusinessByExtendedRules, detectIndividualByExtendedRules, jaroWinklerSimilarity, normalizeText } from './enhancedRules';
import { worldClassClassification } from './worldClassRules';
import { advancedClassifyPayee } from './advancedPayeeClassifier';
import { ensembleClassifyPayee } from './ensembleClassifier';

/**
 * Enhanced V3 Classification Engine
 * Now includes local LLM and ensemble classification for improved accuracy
 */
export async function enhancedClassifyPayeeV3(
  payeeName: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<ClassificationResult> {
  console.log(`[ENHANCED-V3] Processing "${payeeName}"`);

  // Skip processing for empty names
  if (!payeeName || payeeName.trim() === '') {
    console.log(`[ENHANCED-V3] Empty name provided`);
    return {
      classification: 'Individual',
      confidence: 0,
      reasoning: 'Empty payee name provided',
      processingTier: 'Failed'
    };
  }

  try {
    // TIER 0: Ensemble Classification (NEW - highest priority for accuracy)
    if (!config.offlineMode || config.aiThreshold < 90) {
      console.log(`[ENHANCED-V3] TIER 0: Ensemble classification with LLM`);
      try {
        const ensembleResult = await ensembleClassifyPayee(payeeName);
        if (ensembleResult.confidence >= 70) {
          console.log(`[ENHANCED-V3] Ensemble classifier confident result: ${ensembleResult.classification} (${ensembleResult.confidence}%)`);
          return ensembleResult;
        }
      } catch (error) {
        console.warn(`[ENHANCED-V3] Ensemble classification failed, falling back to other methods:`, error);
      }
    }

    // TIER 1: Advanced weighted classifier
    console.log(`[ENHANCED-V3] TIER 1: Advanced weighted classification`);
    const advancedResult = advancedClassifyPayee(payeeName);
    if (advancedResult.confidence >= 70) {
      console.log(`[ENHANCED-V3] Advanced classifier confident result: ${advancedResult.classification} (${advancedResult.confidence}%)`);
      return advancedResult;
    }

    // TIER 2: Enhanced rule-based classification
    console.log(`[ENHANCED-V3] TIER 2: Enhanced rule-based classification`);
    const ruleResult = await worldClassClassification(payeeName);
    if (ruleResult.confidence >= 80) {
      console.log(`[ENHANCED-V3] World-class rules confident: ${ruleResult.classification} (${ruleResult.confidence}%)`);
      return ruleResult;
    }

    // TIER 3: Keyword Exclusion (highest priority)
    console.log(`[ENHANCED-V3] TIER 3: Keyword exclusion check`);
    const exclusionResult = checkKeywordExclusion(payeeName);
    if (exclusionResult.isExcluded) {
      console.log(`[ENHANCED-V3] Keyword exclusion triggered: ${exclusionResult.matchedKeywords.join(', ')}`);
      return {
        classification: 'Individual',
        confidence: 0,
        reasoning: `Excluded due to keyword matches: ${exclusionResult.matchedKeywords.join(', ')}`,
        processingTier: 'Excluded',
        keywordExclusion: {
          isExcluded: exclusionResult.isExcluded,
          matchedKeywords: exclusionResult.matchedKeywords,
          confidence: 100,
          reasoning: `Excluded due to keyword matches: ${exclusionResult.matchedKeywords.join(', ')}`
        }
      };
    }

    // TIER 4: Rule-based classification
    console.log(`[ENHANCED-V3] TIER 4: Rule-based classification`);
    const ruleBasedResult = await applyRuleBasedClassification(payeeName);
    if (ruleBasedResult) {
      console.log(`[ENHANCED-V3] Rule-based classification result: ${ruleBasedResult.classification} (${ruleBasedResult.confidence}%)`);
      return ruleBasedResult;
    }

    // TIER 5: NLP-based classification
    console.log(`[ENHANCED-V3] TIER 5: NLP-based classification`);
    if (!config.bypassRuleNLP) {
      const nlpResult = await classifyWithNLP(payeeName);
      console.log(`[ENHANCED-V3] NLP classification result: ${nlpResult.classification} (${nlpResult.confidence}%)`);
      return nlpResult;
    } else {
      console.log(`[ENHANCED-V3] NLP classification bypassed`);
    }

    // TIER 6: Fuzzy matching (if enabled)
    if (config.useFuzzyMatching) {
      console.log(`[ENHANCED-V3] TIER 6: Fuzzy matching enabled`);
      const normalizedName = normalizeText(payeeName);
      let bestMatch: { name: string; similarity: number } | null = null;

      // Load existing names from local storage
      const existingNames = JSON.parse(localStorage.getItem('payeeNames') || '[]');

      for (const existingName of existingNames) {
        const similarity = jaroWinklerSimilarity(normalizedName, existingName);
        if (similarity > (config.similarityThreshold || 0.8)) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { name: existingName, similarity };
          }
        }
      }

      if (bestMatch) {
        console.log(`[ENHANCED-V3] Fuzzy match found: ${bestMatch.name} (Similarity: ${bestMatch.similarity})`);
        return {
          classification: 'Business', // Or 'Individual' based on existing entry
          confidence: 75,
          reasoning: `Fuzzy match found with existing name: ${bestMatch.name} (Similarity: ${bestMatch.similarity})`,
          processingTier: 'Rule-Based'
        };
      } else {
        console.log(`[ENHANCED-V3] No fuzzy match found`);
        existingNames.push(normalizedName);
        localStorage.setItem('payeeNames', JSON.stringify(existingNames));
      }
    }

    // TIER 7: Extended Rules-Based Heuristics (Business Detection)
    console.log(`[ENHANCED-V3] TIER 7: Extended rules-based heuristics (business)`);
    const businessRulesResult = detectBusinessByExtendedRules(payeeName);
    if (businessRulesResult.isMatch) {
      console.log(`[ENHANCED-V3] Business detected by extended rules: ${businessRulesResult.rules.join(', ')}`);
      return {
        classification: 'Business',
        confidence: 65,
        reasoning: `Detected as business by extended rules: ${businessRulesResult.rules.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: businessRulesResult.rules
      };
    }

    // TIER 8: Extended Rules-Based Heuristics (Individual Detection)
    console.log(`[ENHANCED-V3] TIER 8: Extended rules-based heuristics (individual)`);
    const individualRulesResult = detectIndividualByExtendedRules(payeeName);
    if (individualRulesResult.isMatch) {
      console.log(`[ENHANCED-V3] Individual detected by extended rules: ${individualRulesResult.rules.join(', ')}`);
      return {
        classification: 'Individual',
        confidence: 65,
        reasoning: `Detected as individual by extended rules: ${individualRulesResult.rules.join(', ')}`,
        processingTier: 'Rule-Based',
        matchingRules: individualRulesResult.rules
      };
    }

    // TIER 9: Fallback - basic rule-based heuristics
    console.log(`[ENHANCED-V3] TIER 9: Fallback - basic rule-based heuristics`);
    if (payeeName.length > 3 && payeeName === payeeName.toUpperCase() && !/[a-z]/.test(payeeName)) {
      console.log(`[ENHANCED-V3] Fallback: All caps name detected`);
      return {
        classification: 'Business',
        confidence: 55,
        reasoning: 'All caps name detected (typical of businesses)',
        processingTier: 'Rule-Based'
      };
    }

    // TIER 10: Last Resort - default classification
    console.log(`[ENHANCED-V3] TIER 10: Last resort - default classification`);
    return {
      classification: 'Individual',
      confidence: 50,
      reasoning: 'Default classification - no specific rules matched',
      processingTier: 'Rule-Based'
    };

  } catch (error) {
    console.error(`[ENHANCED-V3] Error processing "${payeeName}":`, error);
    return {
      classification: 'Individual',
      confidence: 30,
      reasoning: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      processingTier: 'Failed'
    };
  }
}
