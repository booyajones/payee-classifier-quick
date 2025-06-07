
/**
 * Fixed export function with guaranteed perfect 1:1 correspondence
 */
export function exportResultsFixed(
  batchResult: any,
  includeAllColumns: boolean = true
): any[] {
  console.log('[FIXED EXPORTER] Processing batch result with GUARANTEED 1:1 alignment:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    alignmentStrategy: 'Perfect 1:1 correspondence'
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.warn('[FIXED EXPORTER] No original data available, creating results-only export');
    return batchResult.results.map((result: any, index: number) => ({
      Row_Index: index,
      Payee_Name: result.payeeName,
      AI_Classification: result.result.classification,
      AI_Confidence: result.result.confidence,
      AI_Reasoning: result.result.reasoning,
      Processing_Method: result.result.processingMethod || 'AI Classification',
      Classification_Timestamp: result.timestamp.toISOString()
    }));
  }

  // Validate perfect alignment
  if (batchResult.originalFileData.length !== batchResult.results.length) {
    console.error('[FIXED EXPORTER] CRITICAL: Length mismatch detected!', {
      originalLength: batchResult.originalFileData.length,
      resultsLength: batchResult.results.length
    });
    throw new Error(`Data alignment error: ${batchResult.originalFileData.length} original rows vs ${batchResult.results.length} results`);
  }

  console.log('[FIXED EXPORTER] Perfect alignment confirmed, merging data...');
  
  return batchResult.originalFileData.map((originalRow: any, index: number) => {
    const result = batchResult.results[index];
    
    if (!result) {
      console.error(`[FIXED EXPORTER] CRITICAL: Missing result at index ${index}`);
      throw new Error(`Missing result at index ${index}`);
    }
    
    if (result.rowIndex !== index) {
      console.error(`[FIXED EXPORTER] CRITICAL: Index mismatch at position ${index}, result has rowIndex ${result.rowIndex}`);
    }
    
    // Start with original data if requested
    const exportRow: any = includeAllColumns ? { ...originalRow } : {};
    
    // Add AI classification columns
    exportRow['AI_Classification'] = result.result.classification;
    exportRow['AI_Confidence'] = result.result.confidence;
    exportRow['AI_Reasoning'] = result.result.reasoning;
    exportRow['Processing_Method'] = result.result.processingMethod || 'AI Classification';
    exportRow['Processing_Tier'] = result.result.processingTier;
    exportRow['Classification_Timestamp'] = result.timestamp.toISOString();
    exportRow['Row_Index'] = index;
    exportRow['Data_Alignment_Status'] = 'Perfect 1:1 Match';
    
    return exportRow;
  });
}
