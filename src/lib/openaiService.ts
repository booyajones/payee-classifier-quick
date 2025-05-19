
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

// Default timeout for OpenAI API calls (in ms)
const DEFAULT_API_TIMEOUT = 30000; // 30 seconds

export function initializeOpenAI(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("Invalid API key provided");
  }

  try {
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Note: In a production app, API calls should be made from a backend
    });
    console.log("OpenAI client initialized successfully");
    
    // Store the API key in session storage for persistence during the session
    sessionStorage.setItem("openai_api_key", apiKey);
  } catch (error) {
    console.error("Error initializing OpenAI client:", error);
    throw error;
  }
}

export function getOpenAIClient(): OpenAI | null {
  // If client isn't initialized but we have a key in session storage, try to initialize
  if (!openaiClient) {
    const storedApiKey = sessionStorage.getItem("openai_api_key");
    if (storedApiKey) {
      try {
        initializeOpenAI(storedApiKey);
      } catch (error) {
        console.error("Failed to initialize OpenAI with stored key:", error);
        // Clear the invalid key
        sessionStorage.removeItem("openai_api_key");
      }
    }
  }
  
  return openaiClient;
}

/**
 * Helper function to create a promise that rejects after a timeout
 */
function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });
  
  return Promise.race([
    promise,
    timeoutPromise
  ]).then(
    result => {
      clearTimeout(timeoutId);
      return result as T;
    },
    error => {
      clearTimeout(timeoutId);
      throw error;
    }
  );
}

export async function classifyPayeeWithAI(
  payeeName: string, 
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<{
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }

  if (!payeeName || payeeName.trim() === '') {
    throw new Error("Invalid payee name provided");
  }

  try {
    console.log(`Classifying "${payeeName}" with OpenAI...`);
    
    const apiCall = openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Using the faster model for better performance
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

// Modified batch function with smaller batch sizes and improved error handling
export async function classifyPayeesBatchWithAI(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT * 2 // Double the timeout for batch processing
): Promise<Array<{
  payeeName: string;
  classification: 'Business' | 'Individual';
  confidence: number;
  reasoning: string;
}>> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }

  if (!payeeNames.length) {
    return [];
  }

  try {
    // IMPORTANT: Reduce batch size to 5 to prevent timeouts and JSON parsing errors
    // Process at most 5 payees at once to improve reliability
    const MAX_BATCH_SIZE = 5; 
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
        model: "gpt-4o-mini", // Using the faster model
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
