
import { BatchProcessingResult } from '../types';

/**
 * Export results with original file data for V3
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    // If no original file data, create a comprehensive export
    return batchResult.results.map(result => ({
      'Original_Name': result.payeeName,
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod,
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Levenshtein_Score': result.result.similarityScores?.levenshtein || '',
      'Jaro_Winkler_Score': result.result.similarityScores?.jaroWinkler || '',
      'Dice_Coefficient': result.result.similarityScores?.dice || '',
      'Token_Sort_Ratio': result.result.similarityScores?.tokenSort || '',
      'Combined_Similarity': result.result.similarityScores?.combined || '',
      'Timestamp': result.timestamp.toISOString()
    }));
  }

  // Merge original data with classification results
  return batchResult.originalFileData.map((originalRow, index) => {
    const result = batchResult.results.find(r => r.rowIndex === index);

    if (!result) {
      // This shouldn't happen in V3, but just in case with proper typing
      return {
        ...originalRow,
        'Classification': 'Individual' as const,
        'Confidence_%': 50,
        'Processing_Tier': 'Rule-Based' as const,
        'Reasoning': 'Result not found - emergency fallback',
        'Processing_Method': 'Emergency fallback'
      };
    }

    const enhancedData = {
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Unknown',
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Keyword_Confidence': result.result.keywordExclusion?.confidence || '',
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Timestamp': result.timestamp.toISOString()
    };

    // Add similarity scores if available
    if (result.result.similarityScores) {
      enhancedData['Levenshtein_Score'] = result.result.similarityScores.levenshtein;
      enhancedData['Jaro_Winkler_Score'] = result.result.similarityScores.jaroWinkler;
      enhancedData['Dice_Coefficient'] = result.result.similarityScores.dice;
      enhancedData['Token_Sort_Ratio'] = result.result.similarityScores.tokenSort;
      enhancedData['Combined_Similarity'] = result.result.similarityScores.combined;
    }

    return includeAllColumns 
      ? { ...originalRow, ...enhancedData }
      : enhancedData;
  });
}
