
import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Initialize the OpenAI client with the provided API key
 */
export function initializeOpenAI(apiKey?: string, rememberKey?: boolean): OpenAI {
  if (apiKey && apiKey.trim() !== '') {
    console.log("Initializing OpenAI client with provided API key");
    
    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      throw new Error("Invalid API key format. OpenAI API keys should start with 'sk-'");
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey.trim(),
      dangerouslyAllowBrowser: true
    });
    
    if (rememberKey) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      console.log("API key saved to localStorage");
    }
    
    return openaiClient;
  }
  
  // Try to get from localStorage
  const savedKey = localStorage.getItem('openai_api_key');
  if (savedKey && savedKey.trim() !== '') {
    console.log("Using saved OpenAI API key from localStorage");
    
    if (!savedKey.startsWith('sk-')) {
      localStorage.removeItem('openai_api_key');
      throw new Error("Saved API key is invalid. Please set a new API key.");
    }
    
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
    if (savedKey && savedKey.trim() !== '') {
      try {
        return initializeOpenAI(savedKey);
      } catch (error) {
        console.error("Failed to initialize from saved key:", error);
        localStorage.removeItem('openai_api_key');
      }
    }
    throw new Error("OpenAI client not initialized. Please set your API key first.");
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
  
  const savedKey = localStorage.getItem('openai_api_key');
  return savedKey !== null && savedKey.trim() !== '' && savedKey.startsWith('sk-');
}

/**
 * Check if there's a saved OpenAI key
 */
export function hasSavedOpenAIKey(): boolean {
  const savedKey = localStorage.getItem('openai_api_key');
  return savedKey !== null && savedKey.trim() !== '' && savedKey.startsWith('sk-');
}

/**
 * Clear saved OpenAI keys
 */
export function clearOpenAIKeys(): void {
  localStorage.removeItem('openai_api_key');
  openaiClient = null;
  console.log("OpenAI client and saved keys cleared");
}

/**
 * Test the current OpenAI connection
 */
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const client = getOpenAIClient();
    // Make a simple API call to test the connection
    await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    return true;
  } catch (error) {
    console.error("OpenAI connection test failed:", error);
    return false;
  }
}
