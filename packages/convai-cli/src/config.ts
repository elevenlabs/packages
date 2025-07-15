/**
 * Configuration management for CLI
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  apiKey?: string;
  defaultEnvironment?: string;
  [key: string]: unknown;
}

/**
 * Get the path to the CLI config file
 */
export function getConfigPath(): string {
  const configDir = path.join(os.homedir(), '.convai');
  return path.join(configDir, 'config.json');
}

/**
 * Load CLI configuration from file
 */
export async function loadConfig(): Promise<CliConfig> {
  const configPath = getConfigPath();
  
  try {
    if (await fs.pathExists(configPath)) {
      const configContent = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(configContent);
    }
  } catch (error) {
    // If config file is corrupted or unreadable, start fresh
    console.warn('Warning: Config file corrupted, starting fresh');
  }
  
  return {};
}

/**
 * Save CLI configuration to file
 */
export async function saveConfig(config: CliConfig): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);
  
  // Ensure config directory exists
  await fs.ensureDir(configDir);
  
  // Save config with proper formatting
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get API key from config or environment variable
 */
export async function getApiKey(): Promise<string | undefined> {
  // First check environment variable (takes precedence)
  const envApiKey = process.env.ELEVENLABS_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }
  
  // Then check config file
  const config = await loadConfig();
  return config.apiKey;
}

/**
 * Set API key in config file
 */
export async function setApiKey(apiKey: string): Promise<void> {
  const config = await loadConfig();
  config.apiKey = apiKey;
  await saveConfig(config);
}

/**
 * Remove API key from config file
 */
export async function removeApiKey(): Promise<void> {
  const config = await loadConfig();
  delete config.apiKey;
  await saveConfig(config);
}

/**
 * Check if user is logged in (has API key)
 */
export async function isLoggedIn(): Promise<boolean> {
  const apiKey = await getApiKey();
  return !!apiKey;
}

/**
 * Get default environment from config
 */
export async function getDefaultEnvironment(): Promise<string> {
  const config = await loadConfig();
  return config.defaultEnvironment || 'prod';
}

/**
 * Set default environment in config
 */
export async function setDefaultEnvironment(environment: string): Promise<void> {
  const config = await loadConfig();
  config.defaultEnvironment = environment;
  await saveConfig(config);
}