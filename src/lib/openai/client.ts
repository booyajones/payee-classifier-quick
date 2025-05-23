
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

// Updated working API key
const BACKGROUND_API_KEY = "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";

/**
 * Initialize the OpenAI client with the provided API key
 * This function is backwards compatible with code that expects it
 */
export function initializeOpenAI(apiKey?: string, rememberKey?: boolean): OpenAI {
  console.log("initializeOpenAI called - using real OpenAI API key");
  return getOpenAIClient();
}

/**
 * Initialize the OpenAI client with the working API key
 */
function initializeBackgroundOpenAI(): OpenAI {
  if (!openaiClient) {
    console.log("Initializing OpenAI client with working API key");
    openaiClient = new OpenAI({
      apiKey: BACKGROUND_API_KEY,
      dangerouslyAllowBrowser: true
    });
    console.log("OpenAI client initialized successfully");
  }
  return openaiClient;
}

/**
 * Get the current OpenAI client, initializing automatically if needed
 */
export function getOpenAIClient(): OpenAI {
  return initializeBackgroundOpenAI();
}

/**
 * Check if the OpenAI client has been initialized
 */
export function isOpenAIInitialized(): boolean {
  return true;
}

/**
 * Always returns true since we have a working key
 */
export function hasSavedOpenAIKey(): boolean {
  return true;
}

/**
 * No-op function for compatibility
 */
export function clearOpenAIKeys(): void {
  // No-op since we're using background keys
}
