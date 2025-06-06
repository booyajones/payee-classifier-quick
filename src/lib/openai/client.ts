
import { logger } from "../logger";

import OpenAI from 'openai';
import { storeApiKey, getApiKey, hasSavedApiKey, deleteApiKey } from '@/lib/backend/apiKeyService';

let openaiClient: OpenAI | null = null;
let currentToken: string | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 */
export async function initializeOpenAI(apiKey?: string, rememberKey?: boolean): Promise<OpenAI> {
  if (apiKey && apiKey.trim() !== '') {
    logger.info("Initializing OpenAI client with provided API key");
    
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      throw new Error("Invalid API key format. OpenAI API keys should start with 'sk-'");
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true
    });
    
    if (rememberKey) {
      try {
        currentToken = await storeApiKey(apiKey.trim());
        logger.info("API key saved to secure storage");
      } catch (error) {
        logger.error("Failed to save API key:", error);
        // Continue without saving if storage fails
      }
    }
    
    return openaiClient;
  }
  
  // Try to get from secure storage
  if (hasSavedApiKey()) {
    logger.info("Attempting to load saved OpenAI API key");
    
    try {
      // Get all stored keys and try to find a valid one
      const tokenMapData = localStorage.getItem('secure_api_key_token_map');
      if (tokenMapData) {
        const metadata = JSON.parse(tokenMapData);
        const tokens = Object.keys(metadata);
        
        for (const token of tokens) {
          try {
            const savedKey = await getApiKey(token);
            if (savedKey && savedKey.startsWith('sk-')) {
              logger.info("Using saved OpenAI API key from secure storage");
              currentToken = token;
              
              openaiClient = new OpenAI({
                apiKey: savedKey,
                dangerouslyAllowBrowser: true
              });
              return openaiClient;
            }
          } catch (error) {
            logger.error("Failed to retrieve API key with token:", token, error);
            // Try next token or clean up invalid token
            deleteApiKey(token);
          }
        }
      }
    } catch (error) {
      logger.error("Error accessing saved API keys:", error);
    }
  }
  
  throw new Error("No OpenAI API key provided. Please set your API key first.");
}

/**
 * Get the current OpenAI client
 */
export async function getOpenAIClient(): Promise<OpenAI> {
  if (!openaiClient) {
    // Try to initialize from saved key
    try {
      return await initializeOpenAI();
    } catch (error) {
      logger.error("Failed to initialize from saved key:", error);
      throw new Error("OpenAI client not initialized. Please set your API key first.");
    }
  }
  return openaiClient;
}

/**
 * Check if the OpenAI client has been initialized
 */
export function isOpenAIInitialized(): boolean {
  if (openaiClient !== null) {
    return true;
  }
  
  return hasSavedApiKey();
}

/**
 * Check if there's a saved OpenAI key
 */
export function hasSavedOpenAIKey(): boolean {
  return hasSavedApiKey();
}

/**
 * Clear saved OpenAI keys
 */
export function clearOpenAIKeys(): void {
  if (currentToken) {
    deleteApiKey(currentToken);
    currentToken = null;
  }
  
  // Clear any remaining keys from the old localStorage system
  localStorage.removeItem('openai_api_key');
  
  openaiClient = null;
  logger.info("OpenAI client and saved keys cleared");
}

/**
 * Test the current OpenAI connection
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const client = await getOpenAIClient();
    // Make a simple API call to test the connection
    await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    return true;
  } catch (error) {
    logger.error("OpenAI connection test failed:", error);
    return false;
  }
}
