
import OpenAI from 'openai';
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { API_TIMEOUT, CLASSIFICATION_MODEL } from './config';
import { logger } from '../logger';

/**
 * Classify a single payee name using the OpenAI API
 */
export async function classifyPayeeWithAI(
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
    logger.info(`[DEBUG] Classifying "${payeeName}" with OpenAI API...`);
    
    const apiCall = openaiClient.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content: `Classify payee names as "Business" or "Individual". Return JSON: {"classification": "Business|Individual", "confidence": number, "reasoning": "brief explanation"}`
        },
        {
          role: "user",
          content: `Classify: "${payeeName}"`
        }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.1,
      max_tokens: 150 // Reduced for faster response
    });
    
    logger.info(`[DEBUG] Making API call for "${payeeName}"...`);
    
    const response = await timeoutPromise(apiCall, timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI API");
    }

    logger.info(`[DEBUG] Raw OpenAI response for "${payeeName}":`, content);
    
    try {
      const result = JSON.parse(content);
      
      if (!result.classification || typeof result.confidence !== 'number' || !result.reasoning) {
        throw new Error(`Invalid response structure: ${JSON.stringify(result)}`);
      }
      
      logger.info(`[DEBUG] Successfully classified "${payeeName}": ${result.classification} (${result.confidence}%)`);
      
      return {
        classification: result.classification as 'Business' | 'Individual',
        confidence: Math.min(100, Math.max(0, result.confidence)),
        reasoning: result.reasoning
      };
    } catch (parseError) {
      logger.error(`[DEBUG] Failed to parse response for "${payeeName}":`, content);
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    logger.error(`[DEBUG] Error calling OpenAI API for "${payeeName}":`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('authentication')) {
        throw new Error("Invalid OpenAI API key. Please check your API key and try again.");
      }
      if (error.message.includes('429')) {
        throw new Error("OpenAI API rate limit exceeded. Please wait a moment and try again.");
      }
      if (error.message.includes('timeout')) {
        throw new Error("OpenAI API request timed out. Please try again.");
      }
    }
    
    throw error;
  }
}
