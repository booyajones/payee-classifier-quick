
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

// New function to classify multiple payees in a single batch request
export async function classifyPayeesBatchWithAI(
  payeeNames: string[],
  timeout: number = DEFAULT_API_TIMEOUT
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
    console.log(`Classifying batch of ${payeeNames.length} payees with OpenAI...`);
    
    // Format the request to include multiple payee names
    const batchContent = payeeNames.map(name => `"${name}"`).join("\n");
    
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
          4. Give brief reasoning for your classification.
          
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
      max_tokens: 2000
    });
    
    // Add timeout to prevent hanging
    const response = await timeoutPromise(apiCall, timeout);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Failed to get a valid response from OpenAI");
    }

    // Parse the JSON response
    try {
      const results = JSON.parse(content);
      if (!Array.isArray(results)) {
        throw new Error("Expected array response from OpenAI");
      }
      
      // Validate and normalize the results
      return results.map((result, index) => {
        // Ensure the result has the correct payee name (in case of mismatch)
        const payeeName = result.payeeName || payeeNames[index];
        return {
          payeeName,
          classification: result.classification as 'Business' | 'Individual',
          confidence: result.confidence,
          reasoning: result.reasoning
        };
      });
    } catch (e) {
      console.error("Failed to parse OpenAI batch response:", content);
      throw new Error("Failed to parse OpenAI batch response as JSON");
    }
  } catch (error) {
    console.error("Error calling OpenAI API for batch classification:", error);
    throw error;
  }
}
