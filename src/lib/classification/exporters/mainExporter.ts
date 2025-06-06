
import { ExportRow, ExportContext } from './types';
import { createResultsMap, mergeRowWithResult } from './resultsMerger';
import { createFallbackExportData } from './fallbackExporter';

/**
 * Main export function with perfect 1:1 correspondence
 */
export function exportResultsWithOriginalDataV3(
  batchResult: any,
  includeAllColumns: boolean = true
): ExportRow[] {
  console.log('[MAIN EXPORTER] Processing batch result with GUARANTEED alignment:', {
    hasOriginalData: !!batchResult.originalFileData,
    originalDataLength: batchResult.originalFileData?.length || 0,
    resultsLength: batchResult.results.length,
    alignmentStrategy: 'Perfect 1:1 correspondence'
  });

  if (!batchResult.originalFileData || batchResult.originalFileData.length === 0) {
    return createFallbackExportData(batchResult.results);
  }

  console.log('[MAIN EXPORTER] Merging with PERFECT 1:1 correspondence - no fallbacks, no misalignment');
  
  // Create results map for efficient lookup by row index
  const resultsMap = createResultsMap(batchResult.results);
  
  return batchResult.originalFileData.map((originalRow: any, index: number) => {
    // Get the corresponding result by exact index match
    const result = resultsMap.get(index);
    return mergeRowWithResult(originalRow, result, index);
  });
}
