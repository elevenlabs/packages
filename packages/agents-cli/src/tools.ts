/**
 * Tool management for ElevenLabs agents
 */

import fs from 'fs-extra';
import path from 'path';
import { calculateConfigHash } from './utils.js';
import { ElevenLabs } from '@elevenlabs/elevenlabs-js';


export type WebhookTool = ElevenLabs.WebhookToolConfigInput;
export type ClientTool = ElevenLabs.ClientToolConfigInput;

export type Tool = WebhookTool | ClientTool;

// This represents what gets stored in individual tool config files (tool_configs/*.json)
export interface ToolDefinition {
  type: "webhook" | "client";
  config: Tool;
}

// This represents what gets stored in tools.json - references to tool config files
export interface ToolConfigFile {
  name: string;
  type: "webhook" | "client";
  config: string; // Path to the tool config file
}

export interface ToolsConfig {
  tools: ToolConfigFile[];
}

export interface ToolLockData {
  id: string;
  hash: string;
}

export interface ToolsLockFile {
  tools: Record<string, ToolLockData>;
}

/**
 * Creates a default webhook tool configuration
 */
export function createDefaultWebhookTool(name: string): ToolDefinition {
  const tool: WebhookTool = {
    name,
    description: `${name} webhook tool`,
    apiSchema: {
      url: 'https://api.example.com/webhook',
      method: 'POST',
      pathParamsSchema: {},
      queryParamsSchema: {
        required: [],
        properties: {}
      },
      requestBodySchema: {
        type: 'object',
        description: 'Request body for the webhook',
        required: [],
        properties: {}
      },
      requestHeaders: {},
      authConnection: undefined
    },
    responseTimeoutSecs: 30,
    dynamicVariables: {
      dynamicVariablePlaceholders: {}
    },
    disableInterruptions: false
  };
  return { type: 'webhook', config: tool };
}

/**
 * Creates a default client tool configuration
 */
export function createDefaultClientTool(name: string): ToolDefinition {
  const tool: ClientTool = {
    name,
    description: `${name} client tool`,
    expectsResponse: false,
    responseTimeoutSecs: 30,
    parameters: {
      type: 'object',
      description: 'Client tool parameters',
      required: [],
      properties: {
        'input': {
          type: 'string',
          description: 'Input parameter for the client tool'
        }
      }
    },
    dynamicVariables: {
      dynamicVariablePlaceholders: {}
    }
  };
  return { type: 'client', config: tool };
}

/**
 * Reads a tool configuration file (returns the actual tool config, not the wrapper)
 */
export async function readToolConfig<T = Tool>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Tool configuration file not found at ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in tool configuration file ${filePath}`);
    }
    throw error;
  }
}

/**
 * Reads a tool file definition (the wrapper with type and config)
 */
export async function readToolDefinition(filePath: string): Promise<ToolDefinition> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Tool configuration file not found at ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in tool configuration file ${filePath}`);
    }
    throw error;
  }
}

/**
 * Writes a tool configuration to a file
 */
export async function writeToolConfig(filePath: string, config: ToolDefinition): Promise<void> {
  try {
    const directory = path.dirname(filePath);
    if (directory) {
      await fs.ensureDir(directory);
    }

    await fs.writeFile(filePath, JSON.stringify(config, null, 4), 'utf-8');
  } catch (error) {
    throw new Error(`Could not write tool configuration file to ${filePath}: ${error}`);
  }
}

/**
 * Reads the tools configuration file
 */
export async function readToolsConfig(filePath: string): Promise<ToolsConfig> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { tools: [] };
    }
    throw error;
  }
}

/**
 * Writes the tools configuration file
 */
export async function writeToolsConfig(filePath: string, config: ToolsConfig): Promise<void> {
  try {
    const directory = path.dirname(filePath);
    if (directory) {
      await fs.ensureDir(directory);
    }
    
    await fs.writeFile(filePath, JSON.stringify(config, null, 4), 'utf-8');
  } catch (error) {
    throw new Error(`Could not write tools configuration file to ${filePath}: ${error}`);
  }
}

/**
 * Loads the tools lock file
 */
export async function loadToolsLockFile(lockFilePath: string): Promise<ToolsLockFile> {
  try {
    const exists = await fs.pathExists(lockFilePath);
    if (!exists) {
      return { tools: {} };
    }

    const data = await fs.readFile(lockFilePath, 'utf-8');
    const parsed = JSON.parse(data);
    
    return parsed;
  } catch (error) {
    console.warn(`Warning: Could not read tools lock file ${lockFilePath}. Initializing with empty tool list.`);
    return { tools: {} };
  }
}

/**
 * Saves the tools lock file
 */
export async function saveToolsLockFile(lockFilePath: string, lockData: ToolsLockFile): Promise<void> {
  try {
    const directory = path.dirname(lockFilePath);
    if (directory) {
      await fs.ensureDir(directory);
    }

    await fs.writeFile(lockFilePath, JSON.stringify(lockData, null, 4), 'utf-8');
  } catch (error) {
    throw new Error(`Could not write tools lock file to ${lockFilePath}: ${error}`);
  }
}

/**
 * Updates a tool in the lock file
 */
export function updateToolInLock(
  lockData: ToolsLockFile,
  toolName: string,
  toolId: string,
  configHash: string
): void {
  lockData.tools[toolName] = {
    id: toolId,
    hash: configHash
  };
}

/**
 * Gets a tool from the lock file
 */
export function getToolFromLock(lockData: ToolsLockFile, toolName: string): ToolLockData | undefined {
  return lockData.tools[toolName];
}

/**
 * Calculates the hash of a tool configuration
 */
export function calculateToolHash(tool: Tool): string {
  return calculateConfigHash(tool);
}