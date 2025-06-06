
import { logger } from "../logger";
import OpenAI from 'openai';
import { storeApiKey, getApiKey, hasSavedApiKey, deleteApiKey, clearAllApiKeys, getApiKeyDiagnostics } from '@/lib/backend/apiKeyService';

let openaiClient: OpenAI | null = null;
let currentToken: string | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 */
export async function initializeOpenAI(apiKey?: string, rememberKey?: boolean): Promise<OpenAI> {
  logger.info("[OPENAI_CLIENT] Initializing OpenAI client...");
  
  if (apiKey && apiKey.trim() !== '') {
    logger.info("[OPENAI_CLIENT] Initializing with provided API key");
    
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      throw new Error("Invalid API key format. OpenAI API keys should start with 'sk-'");
    }
    
    // Test the API key by creating a client and making a test call
    const testClient = new OpenAI({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true
    });
    
    try {
      // Test the API key with a minimal request
      await testClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
      
      logger.info("[OPENAI_CLIENT] API key validation successful");
    } catch (error) {
      logger.error("[OPENAI_CLIENT] API key validation failed:", error);
      throw new Error("Invalid API key. Please check your OpenAI API key and try again.");
    }
    
    openaiClient = testClient;
    
    if (rememberKey) {
      try {
        currentToken = await storeApiKey(apiKey.trim());
        logger.info("[OPENAI_CLIENT] API key saved to secure storage");
      } catch (error) {
        logger.error("[OPENAI_CLIENT] Failed to save API key:", error);
        // Continue without saving if storage fails
      }
    }
    
    return openaiClient;
  }
  
  // Try to get from secure storage
  if (hasSavedApiKey()) {
    logger.info("[OPENAI_CLIENT] Attempting to load saved OpenAI API key");
    
    try {
      const diagnostics = getApiKeyDiagnostics();
      logger.info("[OPENAI_CLIENT] Storage diagnostics:", diagnostics);
      
      // Check if encryption key is missing
      if (!diagnostics.hasEncryptionKey && diagnostics.tokenCount > 0) {
        logger.warn("[OPENAI_CLIENT] Encryption key missing - stored keys cannot be decrypted");
        // Clear invalid stored data since it can't be decrypted
        clearAllApiKeys();
        throw new Error("Stored API key data is corrupted and has been cleared. Please re-enter your API key.");
      }
      
      // Get all stored keys and try to find a valid one
      const tokenMapData = localStorage.getItem('secure_api_key_token_map');
      if (tokenMapData) {
        const metadata = JSON.parse(tokenMapData);
        const tokens = Object.keys(metadata);
        
        logger.info(`[OPENAI_CLIENT] Found ${tokens.length} stored tokens`);
        
        for (const token of tokens) {
          try {
            logger.info(`[OPENAI_CLIENT] Trying token: ${token.slice(-8)}`);
            const savedKey = await getApiKey(token);
            if (savedKey && savedKey.startsWith('sk-')) {
              logger.info("[OPENAI_CLIENT] Testing saved API key...");
              
              // Test the saved key
              const testClient = new OpenAI({
                apiKey: savedKey,
                dangerouslyAllowBrowser: true
              });
              
              try {
                await testClient.chat.completions.create({
                  model: 'gpt-4o-mini',
                  messages: [{ role: 'user', content: 'test' }],
                  max_tokens: 1
                });
                
                logger.info("[OPENAI_CLIENT] Saved API key is valid, using it");
                currentToken = token;
                openaiClient = testClient;
                return openaiClient;
              } catch (testError) {
                logger.error(`[OPENAI_CLIENT] Saved API key test failed:`, testError);
                // Delete invalid key and continue to next
                deleteApiKey(token);
              }
            } else if (savedKey === null) {
              logger.warn(`[OPENAI_CLIENT] Could not decrypt API key for token ${token.slice(-8)} - deleting`);
              deleteApiKey(token);
            }
          } catch (error) {
            logger.error(`[OPENAI_CLIENT] Failed to retrieve API key with token ${token.slice(-8)}:`, error);
            // Try to clean up invalid token
            try {
              deleteApiKey(token);
            } catch (deleteError) {
              logger.error("[OPENAI_CLIENT] Failed to delete invalid token:", deleteError);
            }
          }
        }
        
        logger.warn("[OPENAI_CLIENT] No valid saved API keys found");
      }
    } catch (error) {
      logger.error("[OPENAI_CLIENT] Error accessing saved API keys:", error);
      if (error instanceof Error && error.message.includes("corrupted")) {
        throw error; // Re-throw corruption errors
      }
    }
  } else {
    logger.info("[OPENAI_CLIENT] No saved API keys found");
  }
  
  throw new Error("No valid OpenAI API key found. Please set your API key first.");
}

/**
 * Get the current OpenAI client
 */
export async function getOpenAIClient(): Promise<OpenAI> {
  if (!openaiClient) {
    logger.info("[OPENAI_CLIENT] Client not initialized, attempting to initialize from saved key");
    try {
      return await initializeOpenAI();
    } catch (error) {
      logger.error("[OPENAI_CLIENT] Failed to initialize from saved key:", error);
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
    logger.info("[OPENAI_CLIENT] Client is initialized in memory");
    return true;
  }
  
  const hasSaved = hasSavedApiKey();
  logger.info(`[OPENAI_CLIENT] Client not in memory, has saved keys: ${hasSaved}`);
  return hasSaved;
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
  logger.info("[OPENAI_CLIENT] Clearing all OpenAI keys and client");
  
  if (currentToken) {
    deleteApiKey(currentToken);
    currentToken = null;
  }
  
  // Clear all stored keys
  clearAllApiKeys();
  
  // Clear any remaining keys from the old localStorage system
  localStorage.removeItem('openai_api_key');
  
  openaiClient = null;
  logger.info("[OPENAI_CLIENT] OpenAI client and saved keys cleared");
}

/**
 * Test the current OpenAI connection
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    logger.info("[OPENAI_CLIENT] Testing OpenAI connection...");
    const client = await getOpenAIClient();
    
    // Make a simple API call to test the connection
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    logger.info("[OPENAI_CLIENT] Connection test successful");
    return true;
  } catch (error) {
    logger.error("[OPENAI_CLIENT] Connection test failed:", error);
    return false;
  }
}

/**
 * Get diagnostic information about the OpenAI client
 */
export function getOpenAIClientDiagnostics(): {
  isInitialized: boolean;
  hasCurrentToken: boolean;
  storageInfo: any;
} {
  return {
    isInitialized: openaiClient !== null,
    hasCurrentToken: currentToken !== null,
    storageInfo: getApiKeyDiagnostics()
  };
}
