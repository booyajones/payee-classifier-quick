
import { v4 as uuidv4 } from 'uuid';

const ENC_KEY_STORAGE = 'api_key_enc_key';

async function getCryptoKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(ENC_KEY_STORAGE);
  if (stored) {
    const raw = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(ENC_KEY_STORAGE, btoa(String.fromCharCode(...new Uint8Array(raw))));
  return key;
}

async function encryptValue(value: string): Promise<{ iv: string; data: string }> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted)))
  };
}

async function decryptValue(iv: string, data: string): Promise<string> {
  const key = await getCryptoKey();
  const ivArr = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivArr }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

interface StoredApiKey {
  id: string;
  token: string;
  apiKey: string;
  created: number;
  lastUsed: number;
}

// Secure localStorage prefix
const STORAGE_PREFIX = 'secure_api_key_';

/**
 * Securely store an API key and return a token for retrieving it
 * @param apiKey The API key to store
 * @returns A token that can be used to retrieve the key
 */
export async function storeApiKey(apiKey: string): Promise<string> {
  try {
    const id = uuidv4();
    const token = uuidv4();

    const encrypted = await encryptValue(apiKey);

    const entry: StoredApiKey = {
      id,
      token,
      apiKey: JSON.stringify(encrypted),
      created: Date.now(),
      lastUsed: Date.now()
    };

    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));

    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    tokenMap[token] = id;
    localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));

    return token;
  } catch (error) {
    console.error('Failed to store API key:', error);
    throw new Error('Failed to securely store API key');
  }
}

/**
 * Retrieve an API key using a token
 * @param token The token used to retrieve the key
 * @returns The API key or null if not found
 */
export async function getApiKey(token: string): Promise<string | null> {
  try {
    // Look up the ID from the token map
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const id = tokenMap[token];
    
    if (!id) {
      console.warn('Token not found in token map');
      return null;
    }
    
    // Get the stored key entry
    const storedEntry = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (!storedEntry) {
      console.warn('Stored API key entry not found');
      return null;
    }
    
    const entry: StoredApiKey = JSON.parse(storedEntry);
    
    // Verify the token matches
    if (entry.token !== token) {
      console.warn('Token mismatch in stored entry');
      return null;
    }
    
    // Update last used time
    entry.lastUsed = Date.now();
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(entry));

    try {
      const { iv, data } = JSON.parse(entry.apiKey);
      return await decryptValue(iv, data);
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    return null;
  }
}

/**
 * Check if a saved API key token exists
 */
export function hasSavedApiKey(): boolean {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    return Object.keys(tokenMap).length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a stored API key
 */
export function deleteApiKey(token: string): boolean {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    const id = tokenMap[token];
    
    if (!id) {
      return false;
    }
    
    // Remove the stored key
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    
    // Remove from token map
    delete tokenMap[token];
    localStorage.setItem(`${STORAGE_PREFIX}token_map`, JSON.stringify(tokenMap));
    
    return true;
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return false;
  }
}

/**
 * Get all stored API key metadata (without exposing the keys themselves)
 */
export function getStoredApiKeyMetadata(): Array<{id: string, created: number, lastUsed: number}> {
  try {
    const tokenMap = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}token_map`) || '{}');
    
    return Object.values(tokenMap).map(id => {
      const entry: StoredApiKey = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${id}`) || '{}');
      return {
        id: entry.id,
        created: entry.created,
        lastUsed: entry.lastUsed
      };
    });
  } catch (error) {
    console.error('Failed to get API key metadata:', error);
    return [];
  }
}
