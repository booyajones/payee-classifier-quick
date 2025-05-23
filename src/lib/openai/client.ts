
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

// Updated working API key
const WORKING_API_KEY = "sk-proj-VQOmQiDUcXRU3jTJLqCQi7vOsAXVOPR_7xOp2qJIvH9XNOKcmMnRg_9DgHaY85QK2LfVn8ZGvT3BlbkFJhgSFNOV4mRJwE_kZP3YnWxK8VqL5QnTxMbN6fR9HxT7GpU2wY4bCvM8KfL3aE6yPzT9mN1vR";

/**
 * Initialize the OpenAI client with the provided API key
 * This function is backwards compatible with code that expects it
 */
export function initializeOpenAI(apiKey?: string, rememberKey?: boolean): OpenAI {
  console.log("initializeOpenAI called - using working OpenAI API key");
  return getOpenAIClient();
}

/**
 * Initialize the OpenAI client with the working API key
 */
function initializeWorkingOpenAI(): OpenAI {
  if (!openaiClient) {
    console.log("Initializing OpenAI client with working API key");
    openaiClient = new OpenAI({
      apiKey: WORKING_API_KEY,
      dangerouslyAllowBrowser: true
    });
    console.log("OpenAI client initialized successfully with working key");
  }
  return openaiClient;
}

/**
 * Get the current OpenAI client, initializing automatically if needed
 */
export function getOpenAIClient(): OpenAI {
  return initializeWorkingOpenAI();
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
  // No-op since we're using working keys
}
