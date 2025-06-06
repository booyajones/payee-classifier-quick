
import { ExportRow, ExportContext } from './types';

/**
 * Creates a results map for efficient lookup by row index
 */
export function createResultsMap(results: any[]): Map<number, any> {
  const resultsMap = new Map<number, any>();
  results.forEach(result => {
    const rowIndex = result.rowIndex ?? 0;
    resultsMap.set(rowIndex, result);
  });
  return resultsMap;
}

/**
 * Merges original row data with AI classification results
 */
export function mergeRowWithResult(originalRow: any, result: any | undefined, index: number): ExportRow {
  // Start with ALL original data
  const exportRow: ExportRow = { ...originalRow };

  if (!result) {
    console.error(`[MERGE] CRITICAL: No result found for row ${index} - this should NEVER happen with 1:1 correspondence`);
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
}
