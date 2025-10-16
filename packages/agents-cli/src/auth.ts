/**
 * Simple credential management for CLI
 * Secure file storage with proper permissions
 * Supports multiple environments
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Environment API keys mapping
 */
interface ApiKeysStorage {
  [environment: string]: string;
}

/**
 * Get config directory path
 */
function getConfigDir(): string {
  return path.join(os.homedir(), '.agents');
}

/**
 * Get API keys file path (JSON format)
 */
function getApiKeysFile(): string {
  return path.join(getConfigDir(), 'api_keys.json');
}

/**
 * Get legacy API key file path (for migration)
 */
function getLegacyApiKeyFile(): string {
  return path.join(getConfigDir(), 'api_key');
}

/**
 * Ensure config directory exists with secure permissions
 */
async function ensureConfigDir(): Promise<void> {
  const configDir = getConfigDir();
  await fs.ensureDir(configDir);
  
  // Set secure permissions on Unix-like systems
  if (process.platform !== 'win32') {
    await fs.chmod(configDir, 0o700);
  }
}

/**
 * Migrate legacy API key file to new JSON format
 */
async function migrateLegacyApiKey(): Promise<void> {
  const legacyFile = getLegacyApiKeyFile();
  const newFile = getApiKeysFile();
  
  // If new file exists or legacy doesn't exist, no migration needed
  if (await fs.pathExists(newFile) || !(await fs.pathExists(legacyFile))) {
    return;
  }
  
  try {
    // Read legacy API key
    const legacyKey = await fs.readFile(legacyFile, 'utf-8');
    
    // Store under "prod" environment
    const storage: ApiKeysStorage = {
      prod: legacyKey.trim()
    };
    
    // Write to new JSON file
    await fs.writeFile(newFile, JSON.stringify(storage, null, 2), {
      mode: 0o600,
      encoding: 'utf-8'
    });
    
    // Remove legacy file
    await fs.remove(legacyFile);
  } catch (error) {
    // If migration fails, silently continue
  }
}

/**
 * Load all API keys from storage
 */
async function loadApiKeys(): Promise<ApiKeysStorage> {
  await ensureConfigDir();
  await migrateLegacyApiKey();
  
  const keysFile = getApiKeysFile();
  
  try {
    if (await fs.pathExists(keysFile)) {
      const content = await fs.readFile(keysFile, 'utf-8');
      return JSON.parse(content) as ApiKeysStorage;
    }
  } catch (error) {
    // If file is corrupted, start fresh
  }
  
  return {};
}

/**
 * Save API keys to storage
 */
async function saveApiKeys(storage: ApiKeysStorage): Promise<void> {
  await ensureConfigDir();
  const keysFile = getApiKeysFile();
  
  await fs.writeFile(keysFile, JSON.stringify(storage, null, 2), {
    mode: 0o600,
    encoding: 'utf-8'
  });
}

/**
 * Store API key securely for a specific environment
 */
export async function storeApiKey(apiKey: string, environment: string = 'prod'): Promise<void> {
  const storage = await loadApiKeys();
  storage[environment] = apiKey.trim();
  await saveApiKeys(storage);
}

/**
 * Retrieve API key from secure storage for a specific environment
 */
export async function retrieveApiKey(environment: string = 'prod'): Promise<string | undefined> {
  // Environment variable takes highest priority
  const envKey = process.env.ELEVENLABS_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Try file storage
  try {
    const storage = await loadApiKeys();
    return storage[environment];
  } catch (error) {
    // File not readable
  }

  return undefined;
}

/**
 * Remove API key from secure storage for a specific environment
 */
export async function removeApiKey(environment: string = 'prod'): Promise<void> {
  try {
    const storage = await loadApiKeys();
    delete storage[environment];
    
    // If no keys left, remove the file entirely
    if (Object.keys(storage).length === 0) {
      const keysFile = getApiKeysFile();
      if (await fs.pathExists(keysFile)) {
        await fs.remove(keysFile);
      }
    } else {
      await saveApiKeys(storage);
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Check if user has API key stored for a specific environment
 */
export async function hasApiKey(environment: string = 'prod'): Promise<boolean> {
  const apiKey = await retrieveApiKey(environment);
  return !!apiKey;
}

/**
 * List all configured environments
 */
export async function listEnvironments(): Promise<string[]> {
  try {
    const storage = await loadApiKeys();
    return Object.keys(storage);
  } catch (error) {
    return [];
  }
}