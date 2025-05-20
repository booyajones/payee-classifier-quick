
import OpenAI from 'openai';
import { getApiKey, storeApiKey, hasSavedApiKey } from '../backend/apiKeyService';

let openaiClient: OpenAI | null = null;
let currentApiKeyToken: string | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 * @param apiKey The OpenAI API key
 * @param rememberKey Whether to store the key securely
 */
export function initializeOpenAI(apiKey: string, rememberKey: boolean = false): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("Invalid API key provided");
  }

  try {
    // Initialize the OpenAI client
    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Note: In a production app, API calls should be made from a backend
    });
    console.log("OpenAI client initialized successfully");
    
    if (rememberKey) {
      // Store the API key securely and get a token
      currentApiKeyToken = storeApiKey(apiKey);
      // Save the token to session for temp persistence
      sessionStorage.setItem("openai_api_key_token", currentApiKeyToken);
    } else {
      // For temporary usage, still store in session
      sessionStorage.setItem("openai_api_key", apiKey);
    }
  } catch (error) {
    console.error("Error initializing OpenAI client:", error);
    throw error;
  }
}

/**
 * Get the current OpenAI client, initializing from storage if needed
 */
export function getOpenAIClient(): OpenAI | null {
  // If client isn't initialized, try to initialize
  if (!openaiClient) {
    // First try to get from secure storage using token
    const storedToken = sessionStorage.getItem("openai_api_key_token");
    
    if (storedToken) {
      const apiKey = getApiKey(storedToken);
      if (apiKey) {
        try {
          // Initialize with retrieved key
          openaiClient = new OpenAI({
            apiKey,
            dangerouslyAllowBrowser: true
          });
          currentApiKeyToken = storedToken;
          return openaiClient;
        } catch (error) {
          console.error("Failed to initialize OpenAI with stored key:", error);
        }
      }
    }
    
    // Fall back to session storage for temporary keys
    const tempApiKey = sessionStorage.getItem("openai_api_key");
    if (tempApiKey) {
      try {
        openaiClient = new OpenAI({
          apiKey: tempApiKey,
          dangerouslyAllowBrowser: true
        });
      } catch (error) {
        console.error("Failed to initialize OpenAI with temp key:", error);
        // Clear the invalid key
        sessionStorage.removeItem("openai_api_key");
      }
    }
  }
  
  return openaiClient;
}

/**
 * Check if the OpenAI client has been initialized
 */
export function isOpenAIInitialized(): boolean {
  return openaiClient !== null;
}

/**
 * Check if there's a saved API key
 */
export function hasSavedOpenAIKey(): boolean {
  return hasSavedApiKey() || sessionStorage.getItem("openai_api_key") !== null;
}

/**
 * Clear any stored API keys and reset the client
 */
export function clearOpenAIKeys(): void {
  openaiClient = null;
  currentApiKeyToken = null;
  sessionStorage.removeItem("openai_api_key");
  sessionStorage.removeItem("openai_api_key_token");
}
