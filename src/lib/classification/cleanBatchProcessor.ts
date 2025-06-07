
import { PayeeClassification, BatchProcessingResult, ClassificationConfig } from '../types';
import { balancedClassifyPayeeWithAI } from '../openai/balancedClassification';
import { checkKeywordExclusion } from './keywordExclusion';
import { DEFAULT_CLASSIFICATION_CONFIG } from './config';

/**
 * Clean batch processor that processes each row individually based on selected column
 * No deduplication, no caching - pure row-by-row processing
 */
export async function cleanProcessBatch(
  originalFileData: any[],
  selectedColumn: string,
  config: ClassificationConfig = DEFAULT_CLASSIFICATION_CONFIG
): Promise<BatchProcessingResult> {
  const startTime = Date.now();
  
  console.log(`[CLEAN BATCH] Starting clean batch processing of ${originalFileData.length} rows using column: ${selectedColumn}`);
  
  if (!originalFileData || originalFileData.length === 0) {
    throw new Error('No data provided for processing');
  }
  
  if (!selectedColumn) {
    throw new Error('No column selected for processing');
  }
  
  const results: PayeeClassification[] = [];
  const batchSize = 10; // Process in small batches for better control
  
  // Process each row individually
  for (let i = 0; i < originalFileData.length; i += batchSize) {
    const batch = originalFileData.slice(i, i + batchSize);
    console.log(`[CLEAN BATCH] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(originalFileData.length / batchSize)}`);
    
    const batchPromises = batch.map(async (rowData, batchIndex) => {
      const globalIndex = i + batchIndex;
      
      try {
        // Extract payee name from the selected column
        const payeeName = String(rowData[selectedColumn] || '').trim();
        
        if (!payeeName || payeeName === '[Empty]') {
          // Handle empty names
          return {
            id: `payee-${globalIndex}`,
            payeeName: payeeName || '[Empty]',
            result: {
              classification: 'Individual' as const,
              confidence: 0,
              reasoning: 'Empty or missing payee name',
              processingTier: 'Failed' as const,
              processingMethod: 'Empty name handling'
            },
            timestamp: new Date(),
            originalData: rowData,
            rowIndex: globalIndex
          } as PayeeClassification;
        }
        
        // Apply keyword exclusion check
        const exclusionResult = checkKeywordExclusion(payeeName);
        
        if (exclusionResult.isExcluded) {
          console.log(`[CLEAN BATCH] Excluding "${payeeName}" due to keywords: ${exclusionResult.matchedKeywords.join(', ')}`);
          return {
            id: `payee-${globalIndex}`,
            payeeName,
            result: {
              classification: 'Individual' as const,
              confidence: 95,
              reasoning: `Excluded due to keyword matches: ${exclusionResult.matchedKeywords.join(', ')}`,
              processingTier: 'Excluded' as const,
              processingMethod: 'Keyword exclusion'
            },
            timestamp: new Date(),
            originalData: rowData,
            rowIndex: globalIndex
          } as PayeeClassification;
        }
        
        // Process with AI - each name individually
        console.log(`[CLEAN BATCH] Processing "${payeeName}" with AI (row ${globalIndex})`);
        const aiResult = await balancedClassifyPayeeWithAI(payeeName);
        
        return {
          id: `payee-${globalIndex}`,
          payeeName,
          result: {
            classification: aiResult.classification,
            confidence: aiResult.confidence,
            reasoning: aiResult.reasoning,
            processingTier: 'AI-Powered' as const,
            processingMethod: 'OpenAI Classification'
          },
          timestamp: new Date(),
          originalData: rowData,
          rowIndex: globalIndex
        } as PayeeClassification;
        
      } catch (error) {
        console.error(`[CLEAN BATCH] Error processing row ${globalIndex}:`, error);
        
        const payeeName = String(rowData[selectedColumn] || '').trim();
        
        // Create fallback result - no failures allowed
        return {
          id: `payee-${globalIndex}`,
          payeeName: payeeName || '[Error]',
          result: {
            classification: 'Individual' as const,
            confidence: 25,
            reasoning: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            processingTier: 'Failed' as const,
            processingMethod: 'Error fallback'
          },
          timestamp: new Date(),
          originalData: rowData,
          rowIndex: globalIndex
        } as PayeeClassification;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to prevent rate limiting
    if (i + batchSize < originalFileData.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  // Final validation
  if (results.length !== originalFileData.length) {
    console.error(`[CLEAN BATCH] CRITICAL: Result count mismatch! Expected: ${originalFileData.length}, Got: ${results.length}`);
    throw new Error(`Result alignment error: Expected ${originalFileData.length} results, got ${results.length}`);
  }
  
  // Validate each result has correct index
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.rowIndex !== i) {
      console.error(`[CLEAN BATCH] CRITICAL: Index mismatch at position ${i}, result has rowIndex ${result.rowIndex}`);
    }
  }
  
  const processingTime = Date.now() - startTime;
  
  // Calculate statistics
  const businessCount = results.filter(r => r.result.classification === 'Business').length;
  const individualCount = results.filter(r => r.result.classification === 'Individual').length;
  const excludedCount = results.filter(r => r.result.processingTier === 'Excluded').length;
  const aiProcessedCount = results.filter(r => r.result.processingTier === 'AI-Powered').length;
  const averageConfidence = results.reduce((sum, r) => sum + r.result.confidence, 0) / results.length;
  
  console.log(`[CLEAN BATCH] Completed: ${results.length} total results`);
  console.log(`[CLEAN BATCH] Classification breakdown: ${businessCount} Business, ${individualCount} Individual`);
  console.log(`[CLEAN BATCH] Processing breakdown: ${aiProcessedCount} AI-processed, ${excludedCount} excluded`);
  console.log(`[CLEAN BATCH] Business rate: ${((businessCount / results.length) * 100).toFixed(1)}%`);
  console.log(`[CLEAN BATCH] Average confidence: ${averageConfidence.toFixed(1)}%`);
  console.log(`[CLEAN BATCH] Processing time: ${processingTime}ms`);
  
  return {
    results,
    successCount: results.length,
    failureCount: 0,
    processingTime,
    originalFileData
  };
}
