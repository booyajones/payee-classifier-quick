
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

// Pre-configured API key stored in the background
const BACKGROUND_API_KEY = "sk-your-api-key-here"; // Replace with your actual API key

/**
 * Initialize the OpenAI client with the provided API key
 * This function is backwards compatible with code that expects it
 */
export function initializeOpenAI(apiKey?: string, rememberKey?: boolean): OpenAI {
  console.log("initializeOpenAI called - using background API key instead");
  return getOpenAIClient();
}

/**
 * Initialize the OpenAI client with the background API key
 */
function initializeBackgroundOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: BACKGROUND_API_KEY,
      dangerouslyAllowBrowser: true
    });
    console.log("OpenAI client initialized with background API key");
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
  return true; // Always true since we auto-initialize
}

/**
 * Always returns true since we have a background key
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
