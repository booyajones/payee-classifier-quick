
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 */
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

/**
 * Get the current OpenAI client, initializing from session storage if needed
 */
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
