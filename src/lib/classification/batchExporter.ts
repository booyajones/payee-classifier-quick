
import { BatchProcessingResult } from '../types';

/**
 * Export results with original file data for V3
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
    console.log('[BATCH EXPORTER] No original file data, creating comprehensive export');
    // If no original file data, create a comprehensive export
    return batchResult.results.map(result => {
      console.log('[BATCH EXPORTER] Processing result:', {
        payeeName: result.payeeName,
        hasKeywordExclusion: !!result.result.keywordExclusion,
        keywordExclusionData: result.result.keywordExclusion
      });

      return {
        'Original_Name': result.payeeName,
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
        'Timestamp': result.timestamp.toISOString()
      };
    });
  }

  console.log('[BATCH EXPORTER] Merging original data with classification results');
  // Merge original data with classification results
  return batchResult.originalFileData.map((originalRow, index) => {
    const result = batchResult.results.find(r => r.rowIndex === index);

    if (!result) {
      console.log('[BATCH EXPORTER] No result found for row index:', index);
      // This shouldn't happen in V3, but just in case with proper typing
      return {
        ...originalRow,
        'Classification': 'Individual' as const,
        'Confidence_%': 50,
        'Processing_Tier': 'Rule-Based' as const,
        'Reasoning': 'Result not found - emergency fallback',
        'Processing_Method': 'Emergency fallback',
        'Matched_Keywords': '',
        'Keyword_Exclusion': 'No',
        'Keyword_Confidence': '0',
        'Keyword_Reasoning': 'No result found'
      };
    }

    console.log('[BATCH EXPORTER] Processing result for row', index, ':', {
      payeeName: result.payeeName,
      hasKeywordExclusion: !!result.result.keywordExclusion,
      keywordExclusionData: result.result.keywordExclusion
    });

    const enhancedData = {
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
      'Timestamp': result.timestamp.toISOString()
    };

    // Add similarity scores if available
    if (result.result.similarityScores) {
      enhancedData['Levenshtein_Score'] = result.result.similarityScores.levenshtein?.toString() || '';
      enhancedData['Jaro_Winkler_Score'] = result.result.similarityScores.jaroWinkler?.toString() || '';
      enhancedData['Dice_Coefficient'] = result.result.similarityScores.dice?.toString() || '';
      enhancedData['Token_Sort_Ratio'] = result.result.similarityScores.tokenSort?.toString() || '';
      enhancedData['Combined_Similarity'] = result.result.similarityScores.combined?.toString() || '';
    } else {
      enhancedData['Levenshtein_Score'] = '';
      enhancedData['Jaro_Winkler_Score'] = '';
      enhancedData['Dice_Coefficient'] = '';
      enhancedData['Token_Sort_Ratio'] = '';
      enhancedData['Combined_Similarity'] = '';
    }

    const finalRow = includeAllColumns 
      ? { ...originalRow, ...enhancedData }
      : enhancedData;

    console.log('[BATCH EXPORTER] Final row data:', finalRow);
    return finalRow;
  });
}
