
import OpenAI from 'openai';
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

/**
 * Classify a single payee name using the OpenAI API
 */
export async function classifyPayeeWithAI(
  payeeName: string, 
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<{
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }

  if (!payeeName || payeeName.trim() === '') {
    throw new Error("Invalid payee name provided");
  }

  try {
    console.log(`Classifying "${payeeName}" with OpenAI...`);
    
    const apiCall = openaiClient.chat.completions.create({
      model: CLASSIFICATION_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a financial data specialist focused on classifying payee names as either "Business" or "Individual".
          
          Instructions:
          1. Analyze the provided payee name.
          2. Classify it as either "Business" or "Individual".
          3. Provide confidence level as a percentage between 0-100.
          4. Give detailed reasoning for your classification.
          5. Return ONLY valid JSON in the exact format: {"classification": "Business|Individual", "confidence": number, "reasoning": "your detailed explanation"}
          
          Consider factors like:
          - Business indicators: LLC, Inc, Corp, Company, legal suffixes, industry terms
          - Individual indicators: personal names, titles (Dr., Mr., Mrs.), name patterns
          - Ambiguous cases: sole proprietorships may use personal names
          
          Be precise and objective in your analysis.`
        },
        {
          role: "user",
          content: payeeName
        }
      ],
      response_format: { "type": "json_object" },
      temperature: 0.2,
      max_tokens: 500
    });
    
    // Add timeout to prevent hanging
    const response = await timeoutPromise(apiCall, timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to get a valid response from OpenAI");
    }

    console.log("OpenAI response content:", content);
    
    // Parse the JSON response
    try {
      const result = JSON.parse(content);
      return {
        classification: result.classification as 'Business' | 'Individual',
        confidence: result.confidence,
        reasoning: result.reasoning
      };
    } catch (e) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Failed to parse OpenAI response as JSON");
    }
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw error;
  }
}
