import { describe, it, expect } from 'vitest';
import { exportResultsWithOriginalDataV3 } from '@/lib/classification/exporters';

const baseResult = {
  payeeName: 'Acme LLC',
  result: {
    classification: 'Business',
    confidence: 95,
    reasoning: 'ok',
    processingTier: 'AI-Powered'
  },
  timestamp: new Date('2024-01-01T00:00:00Z'),
  rowIndex: 0
};

describe('exportResultsWithOriginalDataV3 includeAllColumns option', () => {
  const batch = {
    results: [baseResult],
    successCount: 1,
    failureCount: 0,
    originalFileData: [{ Name: 'Acme LLC', Extra: 'x' }]
  };

  it('returns only AI columns when includeAllColumns is false', () => {
    const rows = exportResultsWithOriginalDataV3(batch, false);
    const row = rows[0];
    expect(row.Name).toBeUndefined();
    expect(row['AI_Classification']).toBe('Business');
  });

  it('preserves original columns when includeAllColumns is true', () => {
    const rows = exportResultsWithOriginalDataV3(batch, true);
    const row = rows[0];
    expect(row.Name).toBe('Acme LLC');
    expect(row['AI_Classification']).toBe('Business');
  });
});
