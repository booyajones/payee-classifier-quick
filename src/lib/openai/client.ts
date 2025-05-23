
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 */
export function initializeOpenAI(apiKey?: string, rememberKey?: boolean): OpenAI {
  if (apiKey && apiKey.trim() !== '') {
    console.log("Initializing OpenAI client with provided API key");
    openaiClient = new OpenAI({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true
    });
    
    if (rememberKey) {
      localStorage.setItem('openai_api_key', apiKey.trim());
    }
    
    return openaiClient;
  }
  
  // Try to get from localStorage
  const savedKey = localStorage.getItem('openai_api_key');
  if (savedKey) {
    console.log("Using saved OpenAI API key");
    openaiClient = new OpenAI({
      apiKey: savedKey,
      dangerouslyAllowBrowser: true
    });
    return openaiClient;
  }
  
  throw new Error("No OpenAI API key provided. Please set your API key first.");
}

/**
 * Get the current OpenAI client
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    // Try to initialize from saved key
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      return initializeOpenAI(savedKey);
    }
    throw new Error("OpenAI client not initialized. Please set your API key first.");
  }
  return openaiClient;
}

/**
 * Check if the OpenAI client has been initialized
 */
export function isOpenAIInitialized(): boolean {
  return openaiClient !== null || localStorage.getItem('openai_api_key') !== null;
}

/**
 * Check if there's a saved OpenAI key
 */
export function hasSavedOpenAIKey(): boolean {
  return localStorage.getItem('openai_api_key') !== null;
}

/**
 * Clear saved OpenAI keys
 */
export function clearOpenAIKeys(): void {
  localStorage.removeItem('openai_api_key');
  openaiClient = null;
}
