
import { BatchProcessingResult } from '../types';

/**
 * Export results with original file data for V3 - COMPREHENSIVE VERSION
 * This ensures ALL original data is preserved plus classification and exclusion information
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER] Processing batch result:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    sampleOriginalData: batchResult.originalFileData?.slice(0, 1)
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.log('[BATCH EXPORTER] No original file data, creating comprehensive export from results only');
    // If no original file data, create a comprehensive export from results
    return batchResult.results.map(result => ({
      'Payee_Name': result.payeeName,
      'Classification': result.result.classification,
      'Confidence_%': result.result.confidence,
      'Processing_Tier': result.result.processingTier,
      'Reasoning': result.result.reasoning,
      'Processing_Method': result.result.processingMethod || 'Unknown',
      'Keyword_Exclusion': result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No',
      'Matched_Keywords': result.result.keywordExclusion?.matchedKeywords?.join('; ') || '',
      'Keyword_Confidence_%': result.result.keywordExclusion?.confidence || 0,
      'Keyword_Reasoning': result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied',
      'Matching_Rules': result.result.matchingRules?.join('; ') || '',
      'Levenshtein_Score': result.result.similarityScores?.levenshtein || '',
      'Jaro_Winkler_Score': result.result.similarityScores?.jaroWinkler || '',
      'Dice_Coefficient': result.result.similarityScores?.dice || '',
      'Token_Sort_Ratio': result.result.similarityScores?.tokenSort || '',
      'Combined_Similarity': result.result.similarityScores?.combined || '',
      'Classification_Timestamp': result.timestamp.toISOString(),
      'Row_Index': result.rowIndex || 0
    }));
  }

  console.log('[BATCH EXPORTER] Merging original data with classification results');
  // Merge original data with classification results - PRESERVE ALL ORIGINAL COLUMNS
  return batchResult.originalFileData.map((originalRow, index) => {
    const result = batchResult.results.find(r => r.rowIndex === index);

    // Start with ALL original data - this preserves every column from the original file
    const exportRow = { ...originalRow };

    console.log(`[BATCH EXPORTER] Processing row ${index}:`, {
      hasResult: !!result,
      originalRowKeys: Object.keys(originalRow),
      resultPayeeName: result?.payeeName
    });

    if (!result) {
      console.log('[BATCH EXPORTER] No result found for row index:', index, 'using fallback');
      // Add classification columns with fallback values
      exportRow['AI_Classification'] = 'Individual';
      exportRow['AI_Confidence_%'] = 50;
      exportRow['AI_Processing_Tier'] = 'Failed';
      exportRow['AI_Reasoning'] = 'Result not found - processing failed';
      exportRow['AI_Processing_Method'] = 'Emergency fallback';
      exportRow['Keyword_Exclusion'] = 'No';
      exportRow['Matched_Keywords'] = '';
      exportRow['Keyword_Confidence_%'] = 0;
      exportRow['Keyword_Reasoning'] = 'No result found';
      exportRow['Matching_Rules'] = '';
      exportRow['Similarity_Scores'] = '';
      exportRow['Classification_Timestamp'] = new Date().toISOString();
      exportRow['Processing_Row_Index'] = index;
      return exportRow;
    }

    // Add all AI classification data as NEW columns (preserving original structure)
    exportRow['AI_Classification'] = result.result.classification;
    exportRow['AI_Confidence_%'] = result.result.confidence;
    exportRow['AI_Processing_Tier'] = result.result.processingTier;
    exportRow['AI_Reasoning'] = result.result.reasoning;
    exportRow['AI_Processing_Method'] = result.result.processingMethod || 'OpenAI Batch API';
    
    // Keyword exclusion details - CRITICAL INFORMATION
    exportRow['Keyword_Exclusion'] = result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
    exportRow['Matched_Keywords'] = result.result.keywordExclusion?.matchedKeywords?.join('; ') || '';
    exportRow['Keyword_Confidence_%'] = result.result.keywordExclusion?.confidence || 0;
    exportRow['Keyword_Reasoning'] = result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied';
    
    // Enhanced classification details
    exportRow['Matching_Rules'] = result.result.matchingRules?.join('; ') || '';
    
    // Similarity scores (if available) - combined into readable format
    const similarityDetails = [];
    if (result.result.similarityScores?.levenshtein) {
      similarityDetails.push(`Levenshtein: ${result.result.similarityScores.levenshtein}`);
    }
    if (result.result.similarityScores?.jaroWinkler) {
      similarityDetails.push(`Jaro-Winkler: ${result.result.similarityScores.jaroWinkler}`);
    }
    if (result.result.similarityScores?.dice) {
      similarityDetails.push(`Dice: ${result.result.similarityScores.dice}`);
    }
    if (result.result.similarityScores?.tokenSort) {
      similarityDetails.push(`Token Sort: ${result.result.similarityScores.tokenSort}`);
    }
    if (result.result.similarityScores?.combined) {
      similarityDetails.push(`Combined: ${result.result.similarityScores.combined}`);
    }
    exportRow['Similarity_Scores'] = similarityDetails.join(' | ') || '';
    
    // Timestamps and metadata
    exportRow['Classification_Timestamp'] = result.timestamp.toISOString();
    exportRow['Processing_Row_Index'] = result.rowIndex || index;

    console.log(`[BATCH EXPORTER] Final merged row ${index} with ${Object.keys(exportRow).length} columns`);
    return exportRow;
  });
}
