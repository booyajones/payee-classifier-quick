
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { API_TIMEOUT, CLASSIFICATION_MODEL } from './config';
import { logger } from '../logger';
import type OpenAI from 'openai';

/**
 * Balanced classification with improved prompts and validation
 */
export async function balancedClassifyPayeeWithAI(
  payeeName: string, 
  timeout: number = API_TIMEOUT
): Promise<{
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}> {
  const openaiClient = await getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }

  if (!payeeName || payeeName.trim() === '') {
    throw new Error("Invalid payee name provided");
  }

  try {
    logger.info(`[BALANCED] Classifying "${payeeName}" with balanced AI...`);
    
    const apiCall = openaiClient.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert at classifying payee names as either "Business" or "Individual". 

IMPORTANT: Be balanced and accurate. Do NOT bias toward businesses.

BUSINESS examples:
- "ABC Corporation LLC" (has legal suffix)
- "Smith & Associates" (partnership indicator)
- "Joe's Pizza Restaurant" (clearly commercial)
- "Advanced Computer Systems Inc" (corporate structure)

INDIVIDUAL examples:
- "John Smith" (simple personal name)
- "Mary Johnson-Davis" (hyphenated personal name)
- "Dr. Robert Wilson" (professional title + name)
- "Sarah Chen, CPA" (personal name with credential)

For ambiguous cases like "Smith Consulting" or "Johnson Services", consider:
- Could be sole proprietor (Individual) or small business (Business)
- Default to Business ONLY if clear commercial indicators exist
- When uncertain, lean toward Individual for simple name patterns

Return JSON: {"classification": "Business|Individual", "confidence": number, "reasoning": "brief explanation"}`
        },
        {
          role: "user",
          content: `Classify: "${payeeName}"`
        }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.2, // Slightly higher for more nuanced decisions
      max_tokens: 200
    });
    
    const response: OpenAI.Chat.Completions.ChatCompletion = await timeoutPromise(apiCall, timeout);
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response content from OpenAI API");
    }

    logger.info(`[BALANCED] Raw response for "${payeeName}":`, content);
    
    const result = JSON.parse(content);
    
    // Validation checks
    if (!result.classification || !['Business', 'Individual'].includes(result.classification)) {
      throw new Error(`Invalid classification: ${result.classification}`);
    }
    
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 100) {
      throw new Error(`Invalid confidence: ${result.confidence}`);
    }
    
    // Quality check: Flag suspiciously high business classification rates
    const businessBias = await checkClassificationBias(result.classification);
    if (businessBias.shouldFlag) {
      logger.warn(`[BALANCED] Potential bias detected: ${businessBias.message}`);
    }
    
    logger.info(`[BALANCED] Classified "${payeeName}": ${result.classification} (${result.confidence}%)`);
    
    return {
      classification: result.classification,
      confidence: Math.min(100, Math.max(0, result.confidence)),
      reasoning: result.reasoning || 'Classified via balanced AI'
    };
    
  } catch (error) {
    logger.error(`[BALANCED] Error classifying "${payeeName}":`, error);
    throw error;
  }
}

/**
 * Track classification patterns to detect bias
 */
async function checkClassificationBias(classification: 'Business' | 'Individual'): Promise<{
  shouldFlag: boolean;
  message: string;
}> {
  try {
    const stats = JSON.parse(localStorage.getItem('classificationStats') || '{"business": 0, "individual": 0}');
    stats[classification.toLowerCase()]++;
    
    const total = stats.business + stats.individual;
    const businessRate = stats.business / total;
    
    localStorage.setItem('classificationStats', JSON.stringify(stats));
    
    // Flag if business rate exceeds 80% after 20+ classifications
    if (total >= 20 && businessRate > 0.8) {
      return {
        shouldFlag: true,
        message: `High business classification rate: ${(businessRate * 100).toFixed(1)}% (${stats.business}/${total})`
      };
    }
    
    return { shouldFlag: false, message: '' };
  } catch (error) {
    return { shouldFlag: false, message: '' };
  }
}
