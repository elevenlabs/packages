/**
 * Configuration management for CLI
 * Simple credential storage with keychain support
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  storeApiKey,
  retrieveApiKey,
  removeApiKey as removeStoredApiKey,
  hasApiKey
} from './auth.js';
export const LOCATIONS = ["us", "global", "eu-residency", "in-residency"] as const;
export type Location = (typeof LOCATIONS)[number];

export interface CliConfig {
  apiKey?: string;
  defaultEnvironment?: string;
  residency?: Location;
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
  
  // Don't store API key in config file for security
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey, ...configWithoutKey } = config;
  
  // Save config with proper formatting and secure permissions
  await fs.writeFile(configPath, JSON.stringify(configWithoutKey, null, 2), { 
    mode: 0o600,
    encoding: 'utf-8' 
  });
}

/**
 * Get API key from storage or environment variable
 */
export async function getApiKey(): Promise<string | undefined> {
  return await retrieveApiKey();
}

/**
 * Set API key in secure storage
 */
export async function setApiKey(apiKey: string): Promise<void> {
  await storeApiKey(apiKey);
}

/**
 * Remove API key from storage
 */
export async function removeApiKey(): Promise<void> {
  await removeStoredApiKey();
}

/**
 * Check if user is logged in (has API key)
 */
export async function isLoggedIn(): Promise<boolean> {
  return await hasApiKey();
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

/**
 * Get residency from config
 */
export async function getResidency(): Promise<string> {
  const config = await loadConfig();
  return config.residency || 'global';
}

/**
 * Set residency in config
 */
export async function setResidency(residency: Location): Promise<void> {
  const config = await loadConfig();
  config.residency = residency;
  await saveConfig(config);
}