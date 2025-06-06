import { describe, it, expect, vi } from 'vitest';

// Mock the OpenAI client used in optimizedBatchClassification
vi.mock('@/lib/openai/client', () => ({
  getOpenAIClient: () => ({
    chat: {
      completions: {
        create: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  {
                    name: 'Acme LLC',
                    classification: 'Business',
                    confidence: 95,
                    reasoning: 'mock'
                  },
                  {
                    name: 'John Doe',
                    classification: 'Individual',
                    confidence: 90,
                    reasoning: 'mock'
                  }
                ])
              }
            }
          ]
        })
      }
    }
  })
}));

import { optimizedBatchClassification } from '@/lib/openai/optimizedBatchClassification';

describe('optimizedBatchClassification', () => {
  it('classifies a batch of names', async () => {
    const results = await optimizedBatchClassification(['Acme LLC', 'John Doe']);
    const map = Object.fromEntries(results.map(r => [r.payeeName, r.classification]));
    expect(map['Acme LLC']).toBe('Business');
    expect(map['John Doe']).toBe('Individual');
  });
});
