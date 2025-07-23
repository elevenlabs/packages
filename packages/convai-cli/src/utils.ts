import { createHash } from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

export const LOCK_FILE_AGENTS_KEY = "agents";

export interface LockFileAgent {
  id: string;
  hash: string;
}

export interface LockFileData {
  agents: Record<string, Record<string, LockFileAgent>>;
  tools: Record<string, LockFileAgent>;
}

/**
 * Calculates the MD5 hash of a configuration object.
 * 
 * @param config - The configuration object
 * @returns The hexadecimal representation of the MD5 hash
 */
export function calculateConfigHash(config: unknown): string {
  // Convert the object to a sorted JSON string to ensure consistent hashes
  const configObj = config as Record<string, unknown>;
  const configString = JSON.stringify(configObj, Object.keys(configObj).sort());
  
  // Calculate MD5 hash
  const hash = createHash('md5');
  hash.update(configString, 'utf-8');
  return hash.digest('hex');
}

/**
 * Reads an agent configuration file.
 * 
 * @param filePath - The path to the JSON configuration file
 * @returns A promise that resolves to the agent configuration object
 * @throws {Error} If the configuration file is not found or contains invalid JSON
 */
export async function readAgentConfig<T = Record<string, unknown>>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Configuration file not found at ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in configuration file ${filePath}`);
    }
    throw error;
  }
}

/**
 * Writes an agent configuration to a file.
 * 
 * @param filePath - The path to write the JSON configuration file
 * @param config - The object containing the agent configuration
 * @throws {Error} If there is an error writing the file
 */
export async function writeAgentConfig(filePath: string, config: unknown): Promise<void> {
  try {
    // Ensure the directory exists before writing
    const directory = path.dirname(filePath);
    if (directory) {
      await fs.ensureDir(directory);
    }
    
    await fs.writeFile(filePath, JSON.stringify(config, null, 4), 'utf-8');
  } catch (error) {
    throw new Error(`Could not write configuration file to ${filePath}: ${error}`);
  }
}

/**
 * Loads the lock file. If it doesn't exist or is invalid, returns a default structure.
 * 
 * @param lockFilePath - Path to the lock file
 * @returns Promise that resolves to the lock file data
 */
export async function loadLockFile(lockFilePath: string): Promise<LockFileData> {
  try {
    const exists = await fs.pathExists(lockFilePath);
    if (!exists) {
      return { [LOCK_FILE_AGENTS_KEY]: {}, tools: {} };
    }

    const data = await fs.readFile(lockFilePath, 'utf-8');
    const parsed = JSON.parse(data);
    
    if (!parsed[LOCK_FILE_AGENTS_KEY] || typeof parsed[LOCK_FILE_AGENTS_KEY] !== 'object') {
      console.warn(`Warning: Lock file ${lockFilePath} is malformed or missing '${LOCK_FILE_AGENTS_KEY}' key. Initializing with empty agent list.`);
      parsed[LOCK_FILE_AGENTS_KEY] = {};
    }
    
    if (!parsed.tools || typeof parsed.tools !== 'object') {
      parsed.tools = {};
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(`Warning: Could not decode JSON from lock file ${lockFilePath}. Initializing with empty lists.`);
    } else {
      console.warn(`Warning: Could not read lock file ${lockFilePath}. Initializing with empty lists.`);
    }
    return { [LOCK_FILE_AGENTS_KEY]: {}, tools: {} };
  }
}

/**
 * Saves the lock data to the lock file.
 * 
 * @param lockFilePath - Path to the lock file
 * @param lockData - The lock data to save
 * @throws {Error} If there is an error writing the file
 */
export async function saveLockFile(lockFilePath: string, lockData: LockFileData): Promise<void> {
  try {
    // Ensure the directory exists before writing
    const directory = path.dirname(lockFilePath);
    if (directory) {
      await fs.ensureDir(directory);
    }

    await fs.writeFile(lockFilePath, JSON.stringify(lockData, null, 4), 'utf-8');
  } catch (error) {
    throw new Error(`Could not write lock file to ${lockFilePath}: ${error}`);
  }
}

/**
 * Retrieves agent ID and hash from lock data by agent name and tag.
 * 
 * @param lockData - The lock file data
 * @param agentName - The agent name
 * @param tag - The environment tag
 * @returns The agent data if found, undefined otherwise
 */
export function getAgentFromLock(lockData: LockFileData, agentName: string, tag: string): LockFileAgent | undefined {
  return lockData[LOCK_FILE_AGENTS_KEY]?.[agentName]?.[tag];
}

/**
 * Updates or adds an agent's ID and hash in the lock data.
 * 
 * @param lockData - The lock file data to update
 * @param agentName - The agent name
 * @param tag - The environment tag
 * @param agentId - The agent ID
 * @param configHash - The configuration hash
 */
export function updateAgentInLock(
  lockData: LockFileData, 
  agentName: string, 
  tag: string, 
  agentId: string, 
  configHash: string
): void {
  if (!lockData[LOCK_FILE_AGENTS_KEY] || typeof lockData[LOCK_FILE_AGENTS_KEY] !== 'object') {
    lockData[LOCK_FILE_AGENTS_KEY] = {};
  }
  
  const agents = lockData[LOCK_FILE_AGENTS_KEY];
  if (!agents[agentName]) {
    agents[agentName] = {};
  }
  
  agents[agentName][tag] = {
    id: agentId,
    hash: configHash
  };
}

/**
 * Updates or adds a tool's ID and hash in the lock data.
 * 
 * @param lockData - The lock file data to update
 * @param toolName - The tool name
 * @param toolId - The tool ID
 * @param configHash - The configuration hash
 */
export function updateToolInLock(
  lockData: LockFileData,
  toolName: string,
  toolId: string,
  configHash: string
): void {
  if (!lockData.tools || typeof lockData.tools !== 'object') {
    lockData.tools = {};
  }
  
  lockData.tools[toolName] = {
    id: toolId,
    hash: configHash
  };
}

/**
 * Retrieves tool ID and hash from lock data by tool name.
 * 
 * @param lockData - The lock file data
 * @param toolName - The tool name
 * @returns The tool data if found, undefined otherwise
 */
export function getToolFromLock(lockData: LockFileData, toolName: string): LockFileAgent | undefined {
  return lockData.tools?.[toolName];
} 