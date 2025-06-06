import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalEnv = process.env;

describe('environment configuration overrides', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses CLASSIFIER_* env vars', async () => {
    process.env.CLASSIFIER_MAX_CONCURRENCY = '7';
    process.env.CLASSIFIER_MAX_BATCH_SIZE = '9';
    const mod = await import('@/lib/classification/config');
    expect(mod.MAX_CONCURRENCY).toBe(7);
    expect(mod.MAX_BATCH_SIZE).toBe(9);
  });

  it('uses OPENAI_* env vars', async () => {
    process.env.OPENAI_MAX_BATCH_SIZE = '8';
    process.env.OPENAI_MAX_PARALLEL_BATCHES = '4';
    const mod = await import('@/lib/openai/config');
    expect(mod.MAX_BATCH_SIZE).toBe(8);
    expect(mod.ENHANCED_PROCESSING.MAX_PARALLEL_BATCHES).toBe(4);
    expect(mod.MAX_PARALLEL_BATCHES).toBe(4);
  });
});
