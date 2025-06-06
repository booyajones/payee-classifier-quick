
import { BatchProcessingResult } from '../types';

/**
 * Export results with original file data for V3 - COMPREHENSIVE VERSION
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER] Processing batch result:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.log('[BATCH EXPORTER] No original file data, creating comprehensive export from results only');
    // If no original file data, create a comprehensive export from results
    return batchResult.results.map(result => {
      const exportRow = {
        'Original_Payee_Name': result.payeeName,
        'Classification': result.result.classification,
        'Confidence_%': result.result.confidence,
        'Processing_Tier': result.result.processingTier,
        'Reasoning': result.result.reasoning,
        'Processing_Method': result.result.processingMethod || 'Unknown',
        'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
        'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
        'Keyword_Confidence': result.result.keywordExclusion?.confidence?.toString() || '0',
        'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
        'Matching_Rules': result.result.matchingRules?.join('; ') || '',
        'Levenshtein_Score': result.result.similarityScores?.levenshtein?.toString() || '',
        'Jaro_Winkler_Score': result.result.similarityScores?.jaroWinkler?.toString() || '',
        'Dice_Coefficient': result.result.similarityScores?.dice?.toString() || '',
        'Token_Sort_Ratio': result.result.similarityScores?.tokenSort?.toString() || '',
        'Combined_Similarity': result.result.similarityScores?.combined?.toString() || '',
        'Classification_Timestamp': result.timestamp.toISOString(),
        'Row_Index': result.rowIndex || 0
      };

      console.log('[BATCH EXPORTER] Created comprehensive row:', exportRow);
      return exportRow;
    });
  }

  console.log('[BATCH EXPORTER] Merging original data with classification results');
  // Merge original data with classification results - PRESERVE ALL ORIGINAL COLUMNS
  return batchResult.originalFileData.map((originalRow, index) => {
    const result = batchResult.results.find(r => r.rowIndex === index);

    // Start with ALL original data - this preserves every column from the original file
    const exportRow = { ...originalRow };

    if (!result) {
      console.log('[BATCH EXPORTER] No result found for row index:', index, 'using fallback');
      // Emergency fallback with proper typing
      exportRow['Classification'] = 'Individual';
      exportRow['Confidence_%'] = 50;
      exportRow['Processing_Tier'] = 'Failed';
      exportRow['Reasoning'] = 'Result not found - emergency fallback';
      exportRow['Processing_Method'] = 'Emergency fallback';
      exportRow['Matched_Keywords'] = '';
      exportRow['Keyword_Exclusion'] = 'No';
      exportRow['Keyword_Confidence'] = '0';
      exportRow['Keyword_Reasoning'] = 'No result found';
      exportRow['Matching_Rules'] = '';
      exportRow['Levenshtein_Score'] = '';
      exportRow['Jaro_Winkler_Score'] = '';
      exportRow['Dice_Coefficient'] = '';
      exportRow['Token_Sort_Ratio'] = '';
      exportRow['Combined_Similarity'] = '';
      exportRow['Classification_Timestamp'] = new Date().toISOString();
      exportRow['Row_Index'] = index;
      return exportRow;
    }

    console.log('[BATCH EXPORTER] Processing result for row', index, ':', {
      payeeName: result.payeeName,
      hasKeywordExclusion: !!result.result.keywordExclusion,
      originalRowKeys: Object.keys(originalRow)
    });

    // Add all classification data as NEW columns (preserving original structure)
    exportRow['Classification'] = result.result.classification;
    exportRow['Confidence_%'] = result.result.confidence;
    exportRow['Processing_Tier'] = result.result.processingTier;
    exportRow['Reasoning'] = result.result.reasoning;
    exportRow['Processing_Method'] = result.result.processingMethod || 'Unknown';
    
    // Keyword exclusion details
    exportRow['Matched_Keywords'] = result.result.keywordExclusion?.matchedKeywords?.join('; ') || '';
    exportRow['Keyword_Exclusion'] = result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
    exportRow['Keyword_Confidence'] = result.result.keywordExclusion?.confidence?.toString() || '0';
    exportRow['Keyword_Reasoning'] = result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied';
    
    // Matching rules
    exportRow['Matching_Rules'] = result.result.matchingRules?.join('; ') || '';
    
    // Similarity scores (if available)
    exportRow['Levenshtein_Score'] = result.result.similarityScores?.levenshtein?.toString() || '';
    exportRow['Jaro_Winkler_Score'] = result.result.similarityScores?.jaroWinkler?.toString() || '';
    exportRow['Dice_Coefficient'] = result.result.similarityScores?.dice?.toString() || '';
    exportRow['Token_Sort_Ratio'] = result.result.similarityScores?.tokenSort?.toString() || '';
    exportRow['Combined_Similarity'] = result.result.similarityScores?.combined?.toString() || '';
    
    // Timestamps and metadata
    exportRow['Classification_Timestamp'] = result.timestamp.toISOString();
    exportRow['Row_Index'] = result.rowIndex || index;

    console.log('[BATCH EXPORTER] Final merged row with', Object.keys(exportRow).length, 'columns');
    return exportRow;
  });
}
