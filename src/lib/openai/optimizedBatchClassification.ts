import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { API_TIMEOUT, CLASSIFICATION_MODEL, MAX_PARALLEL_BATCHES } from './config';
import { logger } from '../logger';

export const OPTIMIZED_BATCH_SIZE = 10; // Reduced for better reliability
export const MAX_RETRIES = 2;
export const RETRY_DELAY_BASE = 1000;

interface CachedResult {
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  timestamp: number;
}

// In-memory cache for session-based deduplication
const classificationCache = new Map<string, CachedResult>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 1000;

// Key used for persistent cache storage
const LOCAL_STORAGE_KEY = 'optimized_classification_cache';

// Whether to persist cache to localStorage
let persistCache = true;

let cacheHits = 0;
let cacheLookups = 0;

/**
 * Load cache from localStorage on initialization
 */
function loadCacheFromStorage(): void {
  if (!persistCache || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const stored = JSON.parse(raw) as Record<string, CachedResult>;
    const now = Date.now();
    const cleaned: Record<string, CachedResult> = {};

    Object.entries(stored).forEach(([key, entry]) => {
      if (now - entry.timestamp < CACHE_TTL) {
        classificationCache.set(key, entry);
        cleaned[key] = entry;
      }
    });

    const entries = Object.entries(cleaned);
    if (entries.length > MAX_CACHE_SIZE) {
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.splice(0, entries.length - MAX_CACHE_SIZE);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
    logger.info(`[CACHE] Loaded ${classificationCache.size} cached results from storage`);
  } catch (error) {
    logger.warn('[CACHE] Failed to load cache from storage:', error);
  }
}

/**
 * Save current cache to localStorage
 */
function saveCacheToStorage(): void {
  if (!persistCache || typeof localStorage === 'undefined') {
    return;
  }

  try {
    const entries: [string, CachedResult][] = [];
    const now = Date.now();
    for (const [key, value] of classificationCache.entries()) {
      if (now - value.timestamp < CACHE_TTL) {
        entries.push([key, value]);
      }
    }

    if (entries.length > MAX_CACHE_SIZE) {
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      entries.splice(0, entries.length - MAX_CACHE_SIZE);
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch (error) {
    logger.warn('[CACHE] Failed to save cache to storage:', error);
  }
}

// Load cache immediately when module initializes
loadCacheFromStorage();

// Save cache before the page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', saveCacheToStorage);
}

/**
 * Normalize name for caching
 */
function normalizeForCache(name: string): string {
  if (!name || typeof name !== 'string') {
    logger.warn('[CACHE] Invalid name for caching:', name);
    return '';
  }
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if cached result is still valid
 */
function isCacheValid(result: CachedResult): boolean {
  if (!result || typeof result.timestamp !== 'number') {
    return false;
  }
  return Date.now() - result.timestamp < CACHE_TTL;
}

/**
 * Get cached result if available and valid
 */
function getCachedResult(name: string): CachedResult | null {
  if (!name || typeof name !== 'string') {
    return null;
  }

  const normalized = normalizeForCache(name);
  if (!normalized) {
    return null;
  }

  cacheLookups++;
  const cached = classificationCache.get(normalized);

  if (cached && isCacheValid(cached)) {
    cacheHits++;
    logger.info(`[CACHE] Using cached result for "${name}"`);
    return cached;
  }
  
  if (cached) {
    classificationCache.delete(normalized);
  }
  
  return null;
}

/**
 * Cache a classification result
 */
function setCachedResult(name: string, result: CachedResult): void {
  if (!name || typeof name !== 'string' || !result) {
    logger.warn('[CACHE] Invalid data for caching:', { name, result });
    return;
  }
  
  const normalized = normalizeForCache(name);
  if (!normalized) {
    return;
  }

  if (classificationCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = classificationCache.keys().next().value;
    if (oldestKey) {
      classificationCache.delete(oldestKey);
    }
  }

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
      
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('authentication'))) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      logger.info(`[RETRY] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Create fallback result for failed classifications
 */
function createFallbackResult(payeeName: string, error?: string): {
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  source: 'api';
} {
  return {
    payeeName,
    classification: 'Individual',
    confidence: 0,
    reasoning: error ? `Classification failed: ${error}` : 'Classification failed - using fallback',
    source: 'api'
  };
}

/**
 * Validate and sanitize API response
 */
function validateApiResponse(content: string, expectedCount: number): any[] {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid API response: empty or non-string content');
  }

  logger.info(`[VALIDATION] Raw API response:`, content);

  // The `json_object` response format should already be valid JSON.
  // Remove possible markdown fences for backward compatibility.
  const cleanContent = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  
  let parsed: any;
  try {
    parsed = JSON.parse(cleanContent);
  } catch (parseError) {
    logger.error(`[VALIDATION] JSON parse error:`, parseError);
    throw new Error(`Failed to parse API response as JSON: ${parseError}`);
  }

  // Extract array from various possible response structures
  let classifications: any[];
  if (Array.isArray(parsed)) {
    classifications = parsed;
  } else if (parsed && typeof parsed === 'object') {
    classifications = parsed.results || parsed.payees || parsed.classifications || parsed.data || [];
  } else {
    throw new Error('API response is not in expected format');
  }

  if (!Array.isArray(classifications)) {
    throw new Error('No valid classifications array found in response');
  }

  logger.info(`[VALIDATION] Extracted ${classifications.length} classifications, expected ${expectedCount}`);

  // Validate each classification object
  const validatedClassifications = classifications.slice(0, expectedCount).map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Classification ${index} is not a valid object`);
    }

    const { name, classification, confidence, reasoning } = item;

    if (!classification || (classification !== 'Business' && classification !== 'Individual')) {
      throw new Error(`Invalid classification "${classification}" at index ${index}`);
    }

    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      throw new Error(`Invalid confidence "${confidence}" at index ${index}`);
    }

    return {
      name: name || `Unknown-${index}`,
      classification,
      confidence: Math.min(100, Math.max(0, confidence)),
      reasoning: reasoning || 'No reasoning provided'
    };
  });

  return validatedClassifications;
}

/**
 * Process a single batch of payee names with retry and caching
 */
async function processBatch(
  batchNames: string[],
  batchNumber: number,
  openaiClient: any, // Fixed: Changed from Promise<OpenAI> to any to match usage
  timeout: number
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  source: 'api';
}>> {
  logger.info(`[OPTIMIZED] Processing batch ${batchNumber} with ${batchNames.length} names`);

  try {
    const batchResults = await withRetry(async () => {
      const prompt = `Classify each payee name as "Business" or "Individual". Return ONLY a JSON array:\n` +
        `[\n  {"name": "payee_name", "classification": "Business", "confidence": 95, "reasoning": "brief reason"},\n` +
        `  {"name": "next_payee", "classification": "Individual", "confidence": 90, "reasoning": "brief reason"}\n]\n\n` +
        `Names to classify:\n${batchNames.map((name, idx) => `${idx + 1}. "${name}"`).join('\n')}`;

      const apiCall = openaiClient.chat.completions.create({
        model: CLASSIFICATION_MODEL,
        messages: [
          { role: 'system', content: 'You are an expert classifier. Return only valid JSON array, no other text.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 800
      });

      return await timeoutPromise(apiCall, timeout);
    });

    // Type the response properly to fix the TypeScript error
    const content = (batchResults as any)?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI API');
    }

    const validatedClassifications = validateApiResponse(content, batchNames.length);

    const batchOutput: Array<{
      payeeName: string;
      classification: 'Business' | 'Individual';
      confidence: number;
      reasoning: string;
      source: 'api';
    }> = [];

    validatedClassifications.forEach((result, index) => {
      if (index < batchNames.length) {
        const originalName = batchNames[index];
        const classificationResult = {
          payeeName: originalName,
          classification: result.classification as 'Business' | 'Individual',
          confidence: result.confidence,
          reasoning: result.reasoning,
          source: 'api' as const
        };

        batchOutput.push(classificationResult);

        try {
          setCachedResult(originalName, {
            classification: classificationResult.classification,
            confidence: classificationResult.confidence,
            reasoning: classificationResult.reasoning,
            timestamp: Date.now()
          });
        } catch (cacheError) {
          logger.warn(`[OPTIMIZED] Failed to cache result for "${originalName}":`, cacheError);
        }

        logger.info(`[OPTIMIZED] Classified "${originalName}": ${result.classification} (${result.confidence}%)`);
      }
    });

    if (validatedClassifications.length < batchNames.length) {
      for (let j = validatedClassifications.length; j < batchNames.length; j++) {
        const missingName = batchNames[j];
        if (missingName) {
          batchOutput.push(createFallbackResult(missingName, 'Incomplete API response'));
        }
      }
    }

    return batchOutput;
  } catch (error) {
    logger.error(`[OPTIMIZED] Batch ${batchNumber} failed:`, error);

    const fallback: Array<{
      payeeName: string;
      classification: 'Business' | 'Individual';
      confidence: number;
      reasoning: string;
      source: 'api';
    }> = [];
    batchNames.forEach(name => {
      if (name) {
        fallback.push(createFallbackResult(name, error instanceof Error ? error.message : 'Unknown error'));
      }
    });
    return fallback;
  }
}

/**
 * Classify multiple payees in an optimized batch
 */
export async function optimizedBatchClassification(
  payeeNames: string[],
  timeout: number = API_TIMEOUT
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
  source: 'cache' | 'api';
}>> {
  logger.info(`[OPTIMIZED] Starting classification of ${payeeNames.length} payees`);

  // Input validation
  if (!Array.isArray(payeeNames)) {
    logger.error('[OPTIMIZED] Invalid input: payeeNames is not an array');
    return [];
  }

  const openaiClient = await getOpenAIClient(); // Fixed: Properly await the client
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please check your API key.");
  }

  // Filter and validate names
  const validNames = payeeNames.filter(name => name && typeof name === 'string' && name.trim());
  if (validNames.length === 0) {
    logger.warn('[OPTIMIZED] No valid names to process');
    return [];
  }

  const results: Array<{
    payeeName: string;
    classification: 'Business' | 'Individual';
    confidence: number;
    reasoning: string;
    source: 'cache' | 'api';
  }> = [];

  // Step 1: Check cache
  const uncachedNames: string[] = [];
  for (const name of validNames) {
    try {
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
    } catch (error) {
      logger.error(`[OPTIMIZED] Cache error for "${name}":`, error);
      uncachedNames.push(name);
    }
  }

  logger.info(`[OPTIMIZED] Cache: ${results.length} hits, ${uncachedNames.length} need API`);

  // Step 2: Process uncached names in batches with controlled concurrency
  if (uncachedNames.length > 0) {
    const batches: string[][] = [];
    for (let i = 0; i < uncachedNames.length; i += OPTIMIZED_BATCH_SIZE) {
      batches.push(uncachedNames.slice(i, i + OPTIMIZED_BATCH_SIZE));
    }

    let active: Promise<Array<{ payeeName: string; classification: 'Business' | 'Individual'; confidence: number; reasoning: string; source: 'api'; }>>[] = [];

    for (let i = 0; i < batches.length; i++) {
      active.push(processBatch(batches[i], i + 1, openaiClient, timeout)); // Fixed: Pass the resolved client
      if (active.length === MAX_PARALLEL_BATCHES || i === batches.length - 1) {
        const resolved = await Promise.all(active);
        resolved.forEach(r => results.push(...r));
        active = [];
      }
    }
  }
  const orderedResults = validNames.map(name => {
    const result = results.find(r => r.payeeName === name);
    if (!result) {
      logger.warn(`[OPTIMIZED] Missing result for "${name}", creating fallback`);
      return createFallbackResult(name, 'No result found');
    }
    return result;
  });
  
  logger.info(`[OPTIMIZED] Completed: ${orderedResults.length} total, ${results.filter(r => r.source === 'cache').length} cached, ${results.filter(r => r.source === 'api').length} from API`);
  return orderedResults;
}

/**
 * Clear the classification cache
 */
export function clearClassificationCache(): void {
  classificationCache.clear();
  if (persistCache && typeof localStorage !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  logger.info('[CACHE] Classification cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; hitRate: number } {
  const size = classificationCache.size;
  const hitRate = cacheLookups === 0 ? 0 : cacheHits / cacheLookups;
  return {
    size,
    hitRate
  };
}

/**
 * Enable or disable cache persistence
 */
export function setCachePersistence(enabled: boolean): void {
  persistCache = enabled;
}
