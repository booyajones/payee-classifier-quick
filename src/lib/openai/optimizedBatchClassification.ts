
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

export const OPTIMIZED_BATCH_SIZE = 15; // Increased for better throughput
export const MAX_RETRIES = 3;
export const RETRY_DELAY_BASE = 1000; // 1 second base delay

interface CachedResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  timestamp: number;
}

// In-memory cache for session-based deduplication
const classificationCache = new Map<string, CachedResult>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Normalize name for caching (remove extra spaces, standardize case)
 */
function normalizeForCache(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if cached result is still valid
 */
function isCacheValid(result: CachedResult): boolean {
  return Date.now() - result.timestamp < CACHE_TTL;
}

/**
 * Get cached result if available and valid
 */
function getCachedResult(name: string): CachedResult | null {
  const normalized = normalizeForCache(name);
  const cached = classificationCache.get(normalized);
  
  if (cached && isCacheValid(cached)) {
    console.log(`[CACHE] Using cached result for "${name}"`);
    return cached;
  }
  
  if (cached) {
    // Remove expired cache entry
    classificationCache.delete(normalized);
  }
  
  return null;
}

/**
 * Cache a classification result
 */
function setCachedResult(name: string, result: CachedResult): void {
  const normalized = normalizeForCache(name);
  classificationCache.set(normalized, {
    ...result,
    timestamp: Date.now()
  });
}

/**
 * Retry function with exponential backoff
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  baseDelay: number = RETRY_DELAY_BASE
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on authentication errors
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('authentication'))) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Classify multiple payees in an optimized batch with smart prompting
 */
export async function optimizedBatchClassification(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  source: 'cache' | 'api';
}>> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  if (!payeeNames.length) {
    return [];
  }

  console.log(`[OPTIMIZED] Starting classification of ${payeeNames.length} payees`);

  // Step 1: Check cache for existing results
  const results: Array<{
    payeeName: string;
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    source: 'cache' | 'api';
  }> = [];

  const uncachedNames: string[] = [];

  for (const name of payeeNames) {
    const cached = getCachedResult(name);
    if (cached) {
      results.push({
        payeeName: name,
        classification: cached.classification,
        confidence: cached.confidence,
        reasoning: cached.reasoning,
        source: 'cache'
      });
    } else {
      uncachedNames.push(name);
    }
  }

  console.log(`[OPTIMIZED] Found ${results.length} cached results, ${uncachedNames.length} need API calls`);

  // Step 2: Process uncached names in optimized batches
  if (uncachedNames.length > 0) {
    for (let i = 0; i < uncachedNames.length; i += OPTIMIZED_BATCH_SIZE) {
      const batchNames = uncachedNames.slice(i, i + OPTIMIZED_BATCH_SIZE);
      console.log(`[OPTIMIZED] Processing batch ${Math.floor(i/OPTIMIZED_BATCH_SIZE) + 1} with ${batchNames.length} payees`);
      
      try {
        const batchResults = await withRetry(async () => {
          // Create optimized prompt for batch processing - simplified format
          const prompt = `Classify each payee name as "Business" or "Individual". Return only a JSON array of objects with this exact format:
[
  {"name": "payee_name", "classification": "Business", "confidence": 95, "reasoning": "brief explanation"},
  {"name": "next_payee", "classification": "Individual", "confidence": 90, "reasoning": "brief explanation"}
]

Business indicators: LLC, Inc, Corp, Ltd, Company names, Organizations, Government entities
Individual indicators: Personal names (First Last), Professional titles (Dr, Mr, Mrs), Common name patterns

Payee names to classify:
${batchNames.map((name, idx) => `${idx + 1}. "${name}"`).join('\n')}`;

          const apiCall = openaiClient.chat.completions.create({
            model: CLASSIFICATION_MODEL,
            messages: [
              {
                role: "system",
                content: "You are an expert at classifying payee names. Return only valid JSON array, no other text or formatting."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 1000
          });
          
          return await timeoutPromise(apiCall, timeout);
        });

        const content = batchResults.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response content from OpenAI API");
        }

        console.log(`[OPTIMIZED] Raw batch response:`, content);
        
        try {
          // Clean the response - remove any markdown formatting
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          let classifications: any[];
          
          try {
            // Try to parse as direct array first
            classifications = JSON.parse(cleanContent);
          } catch {
            // If that fails, try to parse as object and extract array
            const parsed = JSON.parse(cleanContent);
            classifications = parsed.results || parsed.payees || parsed.classifications || parsed;
          }
          
          if (!Array.isArray(classifications)) {
            console.error(`[OPTIMIZED] Expected array, got:`, typeof classifications, classifications);
            throw new Error("Expected array of classifications");
          }

          // Process each result
          classifications.forEach((result: any, index: number) => {
            if (index >= batchNames.length) {
              console.warn(`[OPTIMIZED] Extra result ignored for batch position ${index}`);
              return;
            }
            
            const originalName = batchNames[index];
            if (result && result.classification && typeof result.confidence === 'number') {
              const classificationResult = {
                payeeName: originalName,
                classification: result.classification as 'Business' | 'Individual',
                confidence: Math.min(100, Math.max(0, result.confidence)),
                reasoning: result.reasoning || 'Batch classification',
                source: 'api' as const
              };
              
              results.push(classificationResult);
              
              // Cache the result
              setCachedResult(originalName, {
                classification: classificationResult.classification,
                confidence: classificationResult.confidence,
                reasoning: classificationResult.reasoning,
                timestamp: Date.now()
              });
              
              console.log(`[OPTIMIZED] Successfully classified "${originalName}": ${result.classification} (${result.confidence}%)`);
            } else {
              console.error(`[OPTIMIZED] Invalid result structure for "${originalName}":`, result);
              throw new Error(`Invalid classification result for ${originalName}`);
            }
          });
          
          // Handle case where we got fewer results than expected
          if (classifications.length < batchNames.length) {
            console.warn(`[OPTIMIZED] Got ${classifications.length} results but expected ${batchNames.length}`);
            // Create fallback results for missing names
            for (let j = classifications.length; j < batchNames.length; j++) {
              const originalName = batchNames[j];
              results.push({
                payeeName: originalName,
                classification: 'Individual',
                confidence: 50,
                reasoning: 'Fallback - insufficient API response',
                source: 'api'
              });
            }
          }
          
        } catch (parseError) {
          console.error(`[OPTIMIZED] Failed to parse batch response:`, content);
          console.error(`[OPTIMIZED] Parse error:`, parseError);
          throw new Error("Failed to parse OpenAI batch response as JSON");
        }
        
        console.log(`[OPTIMIZED] Successfully processed batch ${Math.floor(i/OPTIMIZED_BATCH_SIZE) + 1}`);
        
      } catch (error) {
        console.error(`[OPTIMIZED] Error with batch ${Math.floor(i/OPTIMIZED_BATCH_SIZE) + 1}:`, error);
        throw error;
      }
    }
  }
  
  // Step 3: Ensure results are in the same order as input
  const orderedResults = payeeNames.map(name => {
    const result = results.find(r => r.payeeName === name);
    if (!result) {
      throw new Error(`No classification result found for payee: ${name}`);
    }
    return result;
  });
  
  console.log(`[OPTIMIZED] Completed classification of ${orderedResults.length} payees (${results.filter(r => r.source === 'cache').length} from cache, ${results.filter(r => r.source === 'api').length} from API)`);
  return orderedResults;
}

/**
 * Clear the classification cache (useful for testing or memory management)
 */
export function clearClassificationCache(): void {
  classificationCache.clear();
  console.log('[CACHE] Classification cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; hitRate: number } {
  return {
    size: classificationCache.size,
    hitRate: 0 // Would need tracking to calculate actual hit rate
  };
}
