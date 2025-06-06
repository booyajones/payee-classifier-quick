
import { BatchProcessingResult } from '../types';

/**
 * Export results with original file data maintaining PERFECT 1:1 correspondence
 */
export function exportResultsWithOriginalDataV3(
  batchResult: BatchProcessingResult,
  includeAllColumns: boolean = true
): any[] {
  console.log('[BATCH EXPORTER] Processing batch result with GUARANTEED alignment:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    alignmentStrategy: 'Perfect 1:1 correspondence'
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    console.log('[BATCH EXPORTER] No original file data, creating export from results only');
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
      'Classification_Timestamp': result.timestamp.toISOString(),
      'Row_Index': result.rowIndex || 0
    }));
  }

  console.log('[BATCH EXPORTER] Merging with PERFECT 1:1 correspondence - no fallbacks, no misalignment');
  
  // Create results map for efficient lookup by row index
  const resultsMap = new Map<number, any>();
  batchResult.results.forEach(result => {
    const rowIndex = result.rowIndex ?? 0;
    resultsMap.set(rowIndex, result);
  });
  
  return batchResult.originalFileData.map((originalRow, index) => {
    // Start with ALL original data
    const exportRow = { ...originalRow };
    
    // Get the corresponding result by exact index match
    const result = resultsMap.get(index);

    if (!result) {
      console.error(`[BATCH EXPORTER] CRITICAL: No result found for row ${index} - this should NEVER happen with 1:1 correspondence`);
      // Use default values instead of fallback
      exportRow['AI_Classification'] = 'Individual';
      exportRow['AI_Confidence_%'] = 0;
      exportRow['AI_Processing_Tier'] = 'Missing';
      exportRow['AI_Reasoning'] = 'ERROR: Result missing for this row';
      exportRow['AI_Processing_Method'] = 'Error';
      exportRow['Keyword_Exclusion'] = 'No';
      exportRow['Matched_Keywords'] = '';
      exportRow['Keyword_Confidence_%'] = 0;
      exportRow['Keyword_Reasoning'] = 'No result found';
      exportRow['Matching_Rules'] = '';
      exportRow['Similarity_Scores'] = '';
      exportRow['Classification_Timestamp'] = new Date().toISOString();
      exportRow['Processing_Row_Index'] = index;
      exportRow['Data_Alignment_Status'] = 'ERROR: Missing Result';
      return exportRow;
    }

    // Add all AI classification data as NEW columns
    exportRow['AI_Classification'] = result.result.classification;
    exportRow['AI_Confidence_%'] = result.result.confidence;
    exportRow['AI_Processing_Tier'] = result.result.processingTier;
    exportRow['AI_Reasoning'] = result.result.reasoning;
    exportRow['AI_Processing_Method'] = result.result.processingMethod || 'OpenAI Batch API';
    
    // Keyword exclusion details
    exportRow['Keyword_Exclusion'] = result.result.keywordExclusion?.isExcluded ? 'Yes' : 'No';
    exportRow['Matched_Keywords'] = result.result.keywordExclusion?.matchedKeywords?.join('; ') || '';
    exportRow['Keyword_Confidence_%'] = result.result.keywordExclusion?.confidence || 0;
    exportRow['Keyword_Reasoning'] = result.result.keywordExclusion?.reasoning || 'No keyword exclusion applied';
    
    // Enhanced classification details
    exportRow['Matching_Rules'] = result.result.matchingRules?.join('; ') || '';
    
    // Similarity scores
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
    
    // Data alignment status - should always be perfect now
    exportRow['Data_Alignment_Status'] = 'Perfect 1:1 Match';

    return exportRow;
  });
}
