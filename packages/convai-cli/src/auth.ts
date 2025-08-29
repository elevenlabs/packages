/**
 * Simple credential management for CLI
 * Just basic keychain storage + secure file permissions
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Optional keychain import - graceful fallback if not available
let keytar: any;
try {
  // Skip keytar in CI environments where it might cause permission issues
  if (!process.env.CI && !process.env.GITHUB_ACTIONS && !process.env.DOCKER_CONTAINER) {
    keytar = require('keytar');
  }
} catch (error) {
  // Keychain not available, will use file storage
}

const SERVICE_NAME = 'ElevenLabs-ConvAI-CLI';
const ACCOUNT_NAME = 'api-key';

/**
 * Get config directory path
 */
function getConfigDir(): string {
  return path.join(os.homedir(), '.convai');
}

/**
 * Get API key file path
 */
function getApiKeyFile(): string {
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
 * Store API key securely
 */
export async function storeApiKey(apiKey: string): Promise<void> {
  // Try keychain first if available
  if (keytar) {
    try {
      await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
      return;
    } catch (error) {
      // Fall through to file storage
    }
  }

  // Fall back to secure file storage
  await ensureConfigDir();
  const keyFile = getApiKeyFile();
  await fs.writeFile(keyFile, apiKey, { 
    mode: 0o600,
    encoding: 'utf-8' 
  });
}

/**
 * Retrieve API key from secure storage
 */
export async function retrieveApiKey(): Promise<string | undefined> {
  // Environment variable takes highest priority
  const envKey = process.env.ELEVENLABS_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Try keychain if available
  if (keytar) {
    try {
      const apiKey = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (apiKey) {
        return apiKey;
      }
    } catch (error) {
      // Fall through to file storage
    }
  }

  // Try file storage
  try {
    const keyFile = getApiKeyFile();
    if (await fs.pathExists(keyFile)) {
      return await fs.readFile(keyFile, 'utf-8');
    }
  } catch (error) {
    // File not readable
  }

  return undefined;
}

/**
 * Remove API key from secure storage
 */
export async function removeApiKey(): Promise<void> {
  // Remove from keychain if available
  if (keytar) {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch (error) {
      // Ignore errors
    }
  }

  // Remove file
  try {
    const keyFile = getApiKeyFile();
    if (await fs.pathExists(keyFile)) {
      await fs.remove(keyFile);
    }
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Check if user has API key stored
 */
export async function hasApiKey(): Promise<boolean> {
  const apiKey = await retrieveApiKey();
  return !!apiKey;
}