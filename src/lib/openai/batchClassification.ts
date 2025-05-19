
import { getOpenAIClient } from './client';
import { timeoutPromise } from './utils';
import { classifyPayeeWithAI } from './singleClassification';
import { DEFAULT_API_TIMEOUT, MAX_BATCH_SIZE, CLASSIFICATION_MODEL } from './config';

/**
 * Classify multiple payee names in a batch using the OpenAI API
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

    // Process in smaller batches to prevent timeouts
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
        max_tokens: 1500
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
        
        // Fall back to individual processing for this batch
        console.log("Falling back to individual processing for this batch");
        
        for (const name of batchNames) {
          try {
            const result = await classifyPayeeWithAI(name, timeout);
            results.push({
              payeeName: name,
              ...result
            });
          } catch (innerError) {
            console.error(`Failed to classify ${name} individually:`, innerError);
            // Add a fallback result with low confidence
            results.push({
              payeeName: name,
              classification: 'Individual', // Default fallback
              confidence: 40,
              reasoning: "Classification failed due to API error"
            });
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error in batch classification:", error);
    throw error;
  }
}
