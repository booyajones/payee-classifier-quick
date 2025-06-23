import { logger } from "../logger";

import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { classifyPayeeWithAI } from './singleClassification';
import { API_TIMEOUT, CLASSIFICATION_MODEL } from './config';
import { MAX_CONCURRENCY as BATCH_CONCURRENCY } from '../classification/config';

export const MAX_BATCH_SIZE = 5; // Reduced for better reliability
export { BATCH_CONCURRENCY };

/**
 * Classify multiple payee names in a batch using the OpenAI API
 */
export async function classifyPayeesBatchWithAI(
  payeeNames: string[],
  timeout: number = API_TIMEOUT
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}>> {
  const openaiClient = await getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  if (!payeeNames.length) {
    return [];
  }

  logger.info(`[BATCH] Starting classification of ${payeeNames.length} payees`);

  const results: Array<{
    payeeName: string;
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
  }> = [];

  // Process in smaller batches with limited concurrency
  for (let i = 0; i < payeeNames.length; i += MAX_BATCH_SIZE) {
    const batchNames = payeeNames.slice(i, i + MAX_BATCH_SIZE);
    logger.info(`[BATCH] Processing batch ${Math.floor(i/MAX_BATCH_SIZE) + 1} with ${batchNames.length} payees`);

    try {
      const batchResults: Array<{
        payeeName: string;
        classification: 'Business' | 'Individual';
        confidence: number;
        reasoning: string;
      }> = [];

      for (let j = 0; j < batchNames.length; j += BATCH_CONCURRENCY) {
        const chunk = batchNames.slice(j, j + BATCH_CONCURRENCY);
        const chunkResults = await Promise.all(
          chunk.map(async (name) => {
            try {
              const result = await classifyPayeeWithAI(name, timeout);
              return { payeeName: name, ...result };
            } catch (error) {
              logger.error(`[INDIVIDUAL] Failed to classify ${name}:`, error);
              throw new Error(`Classification failed for ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          })
        );
        batchResults.push(...chunkResults);
      }

      results.push(...batchResults);

      logger.info(`[BATCH] Successfully processed batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}`);

    } catch (error) {
      logger.error(`[BATCH] Error with batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}:`, error);
      throw error;
    }
  }
  
  logger.info(`[BATCH] Completed classification of ${results.length} payees`);
  return results;
}
