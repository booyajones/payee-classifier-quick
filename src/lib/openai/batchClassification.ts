
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
    throw new Error("OpenAI client not initialized. Please check configuration.");
  }

  if (!payeeNames.length) {
    return [];
  }

  console.log(`[BATCH] Starting classification of ${payeeNames.length} payees`);

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
      console.log(`[BATCH] Processing batch ${Math.floor(i/MAX_BATCH_SIZE) + 1} with ${batchNames.length} payees`);
      
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
        console.log(`[BATCH] Sending API request for batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}`);
        
        // Add timeout to prevent hanging (longer timeout for batches)
        const response = await timeoutPromise(apiCall, timeout);
        
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No response content from OpenAI API");
        }
        
        console.log(`[BATCH] Raw API response:`, content.substring(0, 200) + "...");
        
        // Parse the JSON response and validate it
        const parsedResponse = JSON.parse(content);
        
        // Handle both array and object responses
        let batchResults;
        if (Array.isArray(parsedResponse)) {
          batchResults = parsedResponse;
        } else if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
          batchResults = parsedResponse.results;
        } else {
          throw new Error("Expected array response from OpenAI");
        }
        
        console.log(`[BATCH] Successfully parsed ${batchResults.length} results`);
        
        // Validate each result
        for (const result of batchResults) {
          if (!result.payeeName || !result.classification || typeof result.confidence !== 'number') {
            console.error(`[BATCH] Invalid result structure:`, result);
            throw new Error(`Invalid result structure for ${result.payeeName || 'unknown payee'}`);
          }
        }
        
        // Add these results to our full results array
        results.push(...batchResults);
        
      } catch (error) {
        console.error(`[BATCH] Error with batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}:`, error);
        
        // Check for authentication errors
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('authentication'))) {
          throw new Error(`OpenAI API authentication failed. Please check your API key.`);
        }
        
        // For other errors, fall back to individual processing for this batch
        console.log(`[BATCH] Falling back to individual processing for batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}`);
        
        const individualResults = await Promise.all(
          batchNames.map(async (name) => {
            try {
              const result = await classifyPayeeWithAI(name, timeout);
              return {
                payeeName: name,
                ...result
              };
            } catch (innerError) {
              console.error(`[INDIVIDUAL] Failed to classify ${name}:`, innerError);
              throw new Error(`Classification failed for ${name}: ${innerError instanceof Error ? innerError.message : 'Unknown error'}`);
            }
          })
        );
        
        results.push(...individualResults);
      }
    }
    
    console.log(`[BATCH] Completed classification of ${results.length} payees`);
    return results;
  } catch (error) {
    console.error(`[BATCH] Fatal error in batch classification:`, error);
    throw error;
  }
}
