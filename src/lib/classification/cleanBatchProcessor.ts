
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { checkKeywordExclusion, getComprehensiveExclusionKeywords } from './keywordExclusion';
import { balancedRuleBasedClassification } from './balancedRuleClassification';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';

/**
 * Clean batch processor that processes each row individually based on selected column
 * Uses only rule-based classification - NO AI dependencies
 * Perfect for quick first-pass analysis with exclusion lists and pattern matching
 */
export async function cleanProcessBatch(
  originalFileData: any[],
  selectedColumn: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  
  console.log(`[CLEAN BATCH] Starting rule-based batch processing of ${originalFileData.length} rows using column: ${selectedColumn}`);
  console.log(`[CLEAN BATCH] Processing mode: Rule-based only (no AI)`);
  
  if (!originalFileData || originalFileData.length === 0) {
    throw new Error('No data provided for processing');
  }
  
  if (!selectedColumn) {
    throw new Error('No column selected for processing');
  }
  
  // Get the comprehensive exclusion keywords
  const exclusionKeywords = getComprehensiveExclusionKeywords();
  console.log(`[CLEAN BATCH] Loaded ${exclusionKeywords.length} exclusion keywords for processing`);
  console.log(`[CLEAN BATCH] Sample keywords: ${exclusionKeywords.slice(0, 10).join(', ')}`);
  
  const results: PayeeClassification[] = [];
  let excludedCount = 0;
  let ruleBasedCount = 0;
  let fallbackCount = 0;
  
  // Process each row individually with perfect index tracking
  for (let rowIndex = 0; rowIndex < originalFileData.length; rowIndex++) {
    const rowData = originalFileData[rowIndex];
    
    // Show progress every 50 rows (faster processing, less frequent updates)
    if (rowIndex % 50 === 0) {
      console.log(`[CLEAN BATCH] Processing row ${rowIndex + 1} of ${originalFileData.length} (${Math.round((rowIndex / originalFileData.length) * 100)}%)`);
      console.log(`[CLEAN BATCH] Progress: ${excludedCount} excluded, ${ruleBasedCount} rule-based, ${fallbackCount} fallback`);
    }
    
    try {
      // Extract payee name from the selected column
      const payeeName = String(rowData[selectedColumn] || '').trim();
      
      if (!payeeName || payeeName === '[Empty]') {
        // Handle empty names - default to Individual for empty entries
        const result: PayeeClassification = {
          id: `payee-${rowIndex}`,
          payeeName: payeeName || '[Empty]',
          result: {
            classification: 'Individual' as const,
            confidence: 10,
            reasoning: 'Empty or missing payee name - defaulted to Individual',
            processingTier: 'Rule-Based' as const,
            processingMethod: 'Empty name handling'
          },
          timestamp: new Date(),
          originalData: rowData,
          rowIndex: rowIndex
        };
        results.push(result);
        fallbackCount++;
        continue;
      }
      
      // Apply keyword exclusion check FIRST (highest priority)
      const exclusionResult = checkKeywordExclusion(payeeName, exclusionKeywords);
      
      if (exclusionResult.isExcluded) {
        console.log(`[CLEAN BATCH] EXCLUDED "${payeeName}" at row ${rowIndex} due to keywords: ${exclusionResult.matchedKeywords.join(', ')}`);
        const result: PayeeClassification = {
          id: `payee-${rowIndex}`,
          payeeName,
          result: {
            classification: 'Business' as const,
            confidence: 95,
            reasoning: `Excluded by keyword match: ${exclusionResult.matchedKeywords.join(', ')}`,
            processingTier: 'Excluded' as const,
            processingMethod: 'Keyword exclusion'
          },
          timestamp: new Date(),
          originalData: rowData,
          rowIndex: rowIndex
        };
        results.push(result);
        excludedCount++;
        continue;
      }
      
      // Apply rule-based classification
      console.log(`[CLEAN BATCH] Rule-based processing "${payeeName}" (row ${rowIndex})`);
      const ruleResult = await balancedRuleBasedClassification(payeeName);
      
      if (ruleResult) {
        // Rule-based classification succeeded
        const result: PayeeClassification = {
          id: `payee-${rowIndex}`,
          payeeName,
          result: {
            classification: ruleResult.classification,
            confidence: ruleResult.confidence,
            reasoning: ruleResult.reasoning,
            processingTier: 'Rule-Based' as const,
            processingMethod: 'Pattern matching and business rules'
          },
          timestamp: new Date(),
          originalData: rowData,
          rowIndex: rowIndex
        };
        results.push(result);
        ruleBasedCount++;
      } else {
        // Fallback classification - make educated guess based on simple heuristics
        const fallbackResult = makeFallbackClassification(payeeName);
        const result: PayeeClassification = {
          id: `payee-${rowIndex}`,
          payeeName,
          result: {
            classification: fallbackResult.classification,
            confidence: fallbackResult.confidence,
            reasoning: fallbackResult.reasoning,
            processingTier: 'Rule-Based' as const,
            processingMethod: 'Fallback heuristics'
          },
          timestamp: new Date(),
          originalData: rowData,
          rowIndex: rowIndex
        };
        results.push(result);
        fallbackCount++;
      }
      
    } catch (error) {
      console.error(`[CLEAN BATCH] Error processing row ${rowIndex}:`, error);
      
      const payeeName = String(rowData[selectedColumn] || '').trim();
      
      // Create fallback result - default to Individual for errors
      const result: PayeeClassification = {
        id: `payee-${rowIndex}`,
        payeeName: payeeName || '[Error]',
        result: {
          classification: 'Individual' as const,
          confidence: 25,
          reasoning: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'} - defaulted to Individual`,
          processingTier: 'Rule-Based' as const,
          processingMethod: 'Error fallback'
        },
        timestamp: new Date(),
        originalData: rowData,
        rowIndex: rowIndex
      };
      results.push(result);
      fallbackCount++;
    }
  }
  
  // Critical validation - ensure perfect alignment
  if (results.length !== originalFileData.length) {
    console.error(`[CLEAN BATCH] CRITICAL: Result count mismatch! Expected: ${originalFileData.length}, Got: ${results.length}`);
    throw new Error(`Result alignment error: Expected ${originalFileData.length} results, got ${results.length}`);
  }
  
  // Validate each result has correct and unique index
  const seenIndices = new Set<number>();
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    
    if (result.rowIndex !== i) {
      console.error(`[CLEAN BATCH] CRITICAL: Index mismatch at position ${i}, result has rowIndex ${result.rowIndex}`);
      throw new Error(`Index alignment error at position ${i}: expected rowIndex ${i}, got ${result.rowIndex}`);
    }
    
    if (seenIndices.has(result.rowIndex)) {
      console.error(`[CLEAN BATCH] CRITICAL: Duplicate rowIndex ${result.rowIndex} found`);
      throw new Error(`Duplicate rowIndex ${result.rowIndex} detected`);
    }
    
    seenIndices.add(result.rowIndex);
  }
  
  const processingTime = Date.now() - startTime;
  
  // Calculate final statistics
  const businessCount = results.filter(r => r.result.classification === 'Business').length;
  const individualCount = results.filter(r => r.result.classification === 'Individual').length;
  const averageConfidence = results.reduce((sum, r) => sum + r.result.confidence, 0) / results.length;
  
  console.log(`[CLEAN BATCH] ===== RULE-BASED PROCESSING COMPLETE =====`);
  console.log(`[CLEAN BATCH] Total processed: ${results.length} payees`);
  console.log(`[CLEAN BATCH] Classification breakdown: ${businessCount} Business, ${individualCount} Individual`);
  console.log(`[CLEAN BATCH] Processing breakdown: ${ruleBasedCount} rule-based, ${excludedCount} excluded by keywords, ${fallbackCount} fallback`);
  console.log(`[CLEAN BATCH] Business rate: ${((businessCount / results.length) * 100).toFixed(1)}%`);
  console.log(`[CLEAN BATCH] Keyword exclusion rate: ${((excludedCount / results.length) * 100).toFixed(1)}%`);
  console.log(`[CLEAN BATCH] Rule-based success rate: ${((ruleBasedCount / results.length) * 100).toFixed(1)}%`);
  console.log(`[CLEAN BATCH] Average confidence: ${averageConfidence.toFixed(1)}%`);
  console.log(`[CLEAN BATCH] Processing time: ${(processingTime / 1000).toFixed(1)} seconds`);
  console.log(`[CLEAN BATCH] Index validation: All ${results.length} results have perfect 1:1 alignment`);
  
  return {
    results,
    successCount: results.length,
    failureCount: 0,
    processingTime,
    originalFileData
  };
}

/**
 * Fallback classification using simple heuristics when rule-based classification fails
 */
function makeFallbackClassification(payeeName: string): {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
} {
  const name = payeeName.toUpperCase();
  const words = name.split(/\s+/);
  
  // Simple heuristics for business detection
  const businessIndicators = [
    // Length-based heuristic
    words.length >= 4, // Multi-word names often businesses
    
    // All caps heuristic
    payeeName === payeeName.toUpperCase() && payeeName.length > 10,
    
    // Common business word patterns
    /\b(COMPANY|CORP|CORPORATION|ENTERPRISES|GROUP|SERVICES|SOLUTIONS|SYSTEMS|TECHNOLOGIES|INDUSTRIES|INTERNATIONAL|GLOBAL|MANAGEMENT|CONSULTING|DEVELOPMENT|INVESTMENTS|PROPERTIES|COMMUNICATIONS|RESOURCES)\b/.test(name),
    
    // Numeric patterns (often business identifiers)
    /\b\d{3,}\b/.test(name),
    
    // Special characters often found in business names
    /[&@#]/.test(name),
    
    // Commercial terms
    /\b(SHOP|STORE|MARKET|RETAIL|WHOLESALE|SUPPLY|DISTRIBUTION|MANUFACTURING|PRODUCTION|LOGISTICS|TRANSPORTATION|CONSTRUCTION|ENGINEERING|ARCHITECTURE|DESIGN|CREATIVE|STUDIO|AGENCY|FIRM)\b/.test(name)
  ];
  
  // Individual indicators
  const individualIndicators = [
    // Common name patterns
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(payeeName), // First Last
    /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+$/.test(payeeName), // First M. Last
    /^[A-Z][a-z]+,\s*[A-Z][a-z]+$/.test(payeeName), // Last, First
    
    // Professional titles
    /\b(DR|MR|MRS|MS|MISS|MD|DDS|PHD|ESQ)\b/.test(name),
    
    // Possessive forms
    /'\s*s\b/.test(payeeName),
    
    // Simple two-word names without business indicators
    words.length === 2 && !businessIndicators.some(Boolean)
  ];
  
  const businessScore = businessIndicators.filter(Boolean).length;
  const individualScore = individualIndicators.filter(Boolean).length;
  
  if (businessScore > individualScore) {
    return {
      classification: 'Business',
      confidence: Math.min(75, 40 + (businessScore * 10)), // Cap at 75% for fallback
      reasoning: `Fallback classification as business based on ${businessScore} business indicators: ${businessIndicators.map((indicator, index) => indicator ? `indicator-${index + 1}` : '').filter(Boolean).join(', ')}`
    };
  } else if (individualScore > businessScore) {
    return {
      classification: 'Individual',
      confidence: Math.min(75, 40 + (individualScore * 10)), // Cap at 75% for fallback
      reasoning: `Fallback classification as individual based on ${individualScore} individual indicators: ${individualIndicators.map((indicator, index) => indicator ? `indicator-${index + 1}` : '').filter(Boolean).join(', ')}`
    };
  } else {
    // When in doubt, default to Individual (safer assumption for privacy)
    return {
      classification: 'Individual',
      confidence: 30,
      reasoning: 'Fallback default to Individual when indicators are unclear (safer for privacy)'
    };
  }
}
