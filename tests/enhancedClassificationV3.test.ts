import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enhancedClassifyPayeeV3 } from '@/lib/classification/enhancedClassificationV3';

function mockLocalStorage() {
  const storage = {
    getItem: () => JSON.stringify([]),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  } as unknown as Storage;
  Object.defineProperty(global, 'localStorage', { value: storage, configurable: true });
}

describe('enhancedClassifyPayeeV3 fallback', () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    // @ts-ignore
    delete (global as any).localStorage;
  });

  it('returns Business when business keywords present', async () => {
    const result = await enhancedClassifyPayeeV3('ACME SECURITY SERVICES');
    expect(result.classification).toBe('Business');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });

  it('returns Business when industry identifiers present', async () => {
    const result = await enhancedClassifyPayeeV3('GLOBAL ELECTRIC SUPPLY');
    expect(result.classification).toBe('Business');
    expect(result.confidence).toBeGreaterThanOrEqual(60);
  });
});
