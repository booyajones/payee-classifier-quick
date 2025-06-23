import { describe, it, expect, vi } from 'vitest';

// Mock openai-based helpers to avoid localStorage access during import
vi.mock('@/lib/openai/enhancedClassification', () => ({
  enhancedClassifyPayeeWithAI: vi.fn(),
  consensusClassification: vi.fn()
}));

import { enhancedClassifyPayee } from '@/lib/classification/enhancedClassification';

// Use offline mode to avoid any network calls
const config = { offlineMode: true } as any;

describe('enhancedClassifyPayee', () => {
  it('classifies business names correctly', async () => {
    const result = await enhancedClassifyPayee('Acme LLC', config);
    expect(result.classification).toBe('Business');
  });

  it('classifies individual names correctly', async () => {
    const result = await enhancedClassifyPayee('john doe', config);
    expect(result.classification).toBe('Individual');
  });

  it('detects security and emergency service keywords', async () => {
    const result = await enhancedClassifyPayee('ABCO FIRE ALARM', config);
    expect(result.classification).toBe('Business');
  });
});
