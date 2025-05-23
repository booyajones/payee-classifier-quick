
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { classifyPayeeWithAI } from './singleClassification';
import { DEFAULT_API_TIMEOUT, CLASSIFICATION_MODEL } from './config';

// Increased batch size for better throughput
export const MAX_BATCH_SIZE = 15; // Increased from 5 to 15

/**
 * Classify multiple payee names in a batch using the OpenAI API
 * Optimized for higher throughput with larger batch sizes
 */
export async function classifyPayeesBatchWithAI(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT * 2 // Double the timeout for batch processing
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}>> {
  const openaiClient = getOpenAIClient();
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }

  if (!payeeNames.length) {
    return [];
  }

  try {
    const results: Array<{
      payeeName: string;
      classification: 'Business' | 'Individual';
      confidence: number;
      reasoning: string;
    }> = [];

    // Process in larger batches to improve throughput
    for (let i = 0; i < payeeNames.length; i += MAX_BATCH_SIZE) {
      const batchNames = payeeNames.slice(i, i + MAX_BATCH_SIZE);
      console.log(`Classifying batch of ${batchNames.length} payees with OpenAI (batch ${Math.floor(i/MAX_BATCH_SIZE) + 1})...`);
      
      // Format the request to include multiple payee names
      const batchContent = batchNames.map(name => `"${name}"`).join("\n");
      
      const apiCall = openaiClient.chat.completions.create({
        model: CLASSIFICATION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a financial data specialist focused on classifying payee names as either "Business" or "Individual".
            
            You will be given a list of payee names, one per line. For each name:
            1. Analyze the provided payee name.
            2. Classify it as either "Business" or "Individual".
            3. Provide confidence level as a percentage between 0-100.
            4. Give brief reasoning for your classification (keep it concise).
            
            Return ONLY valid JSON in the exact format: 
            [
              {"payeeName": "name1", "classification": "Business|Individual", "confidence": number, "reasoning": "brief explanation"},
              {"payeeName": "name2", "classification": "Business|Individual", "confidence": number, "reasoning": "brief explanation"},
              ...
            ]
            
            Include ALL payee names in your response in the exact same order provided.`
          },
          {
            role: "user",
            content: batchContent
          }
        ],
        response_format: { "type": "json_object" },
        temperature: 0.2,
        max_tokens: 2500 // Increased for larger batches
      });
      
      try {
        // Add timeout to prevent hanging (longer timeout for batches)
        const response = await timeoutPromise(apiCall, timeout);
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("Failed to get a valid response from OpenAI");
        }
        
        // Parse the JSON response and validate it
        const batchResults = JSON.parse(content);
        if (!Array.isArray(batchResults)) {
          throw new Error("Expected array response from OpenAI");
        }
        
        console.log("Batch classification successful for", batchResults.length, "payees");
        
        // Add these results to our full results array
        results.push(...batchResults);
        
      } catch (error) {
        console.error(`Error with batch classification (${i}-${i + MAX_BATCH_SIZE}):`, error);
        
        // If it's an authentication error, throw it immediately - don't try fallbacks
        if (error instanceof Error && error.message.includes('401')) {
          throw new Error(`OpenAI API authentication failed. Please check your API key: ${error.message}`);
        }
        
        // For other errors, fall back to individual processing for this batch
        console.log("Falling back to individual processing for this batch");
        
        const individualPromises = batchNames.map(async (name) => {
          try {
            const result = await classifyPayeeWithAI(name, timeout);
            return {
              payeeName: name,
              ...result
            };
          } catch (innerError) {
            console.error(`Failed to classify ${name} individually:`, innerError);
            
            // If it's an auth error, throw it
            if (innerError instanceof Error && innerError.message.includes('401')) {
              throw new Error(`OpenAI API authentication failed for ${name}: ${innerError.message}`);
            }
            
            // For other errors, throw instead of returning fallback
            throw new Error(`Classification failed for ${name}: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
          }
        });
        
        // Process individual requests in parallel with limited concurrency
        const batchResults = await Promise.all(individualPromises);
        results.push(...batchResults);
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error in batch classification:", error);
    throw error;
  }
}
