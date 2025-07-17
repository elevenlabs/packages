/**
 * Tool management for conversational AI agents
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { calculateConfigHash } from './utils';

export interface WebhookToolSchema {
  id: string;
  type: string;
  value_type: string;
  description: string;
  dynamic_variable: string;
  constant_value: string;
  required: boolean;
  properties?: WebhookToolSchema[];
}

export interface WebhookTool {
  name: string;
  description: string;
  type: 'webhook';
  api_schema: {
    url: string;
    method: string;
    path_params_schema: unknown[];
    query_params_schema: unknown[];
    request_body_schema: WebhookToolSchema;
    request_headers: Array<{
      type: 'value' | 'secret';
      name: string;
      value?: string;
      secret_id?: string;
    }>;
    auth_connection: unknown;
  };
  response_timeout_secs: number;
  dynamic_variables: {
    dynamic_variable_placeholders: Record<string, unknown>;
  };
}

export interface ClientToolParameter {
  id: string;
  type: string;
  value_type: string;
  description: string;
  dynamic_variable: string;
  constant_value: string;
  required: boolean;
}

export interface ClientTool {
  name: string;
  description: string;
  type: 'client';
  expects_response: boolean;
  response_timeout_secs: number;
  parameters: ClientToolParameter[];
  dynamic_variables: {
    dynamic_variable_placeholders: Record<string, unknown>;
  };
}

export type Tool = WebhookTool | ClientTool;

export interface ToolDefinition {
  name: string;
  type: 'webhook' | 'client';
  config?: string;
}

export interface ToolsConfig {
  tools: ToolDefinition[];
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
export function createDefaultWebhookTool(name: string): WebhookTool {
  return {
    name,
    description: `${name} webhook tool`,
    type: 'webhook',
    api_schema: {
      url: 'https://api.example.com/webhook',
      method: 'POST',
      path_params_schema: [],
      query_params_schema: [],
      request_body_schema: {
        id: 'body',
        type: 'object',
        value_type: 'llm_prompt',
        description: 'Request body for the webhook',
        dynamic_variable: '',
        constant_value: '',
        required: true,
        properties: []
      },
      request_headers: [
        {
          type: 'value',
          name: 'Content-Type',
          value: 'application/json'
        }
      ],
      auth_connection: null
    },
    response_timeout_secs: 30,
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    }
  };
}

/**
 * Creates a default client tool configuration
 */
export function createDefaultClientTool(name: string): ClientTool {
  return {
    name,
    description: `${name} client tool`,
    type: 'client',
    expects_response: false,
    response_timeout_secs: 30,
    parameters: [
      {
        id: 'input',
        type: 'string',
        value_type: 'llm_prompt',
        description: 'Input parameter for the client tool',
        dynamic_variable: '',
        constant_value: '',
        required: true
      }
    ],
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    }
  };
}

/**
 * Reads a tool configuration file
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
 * Writes a tool configuration to a file
 */
export async function writeToolConfig(filePath: string, config: Tool): Promise<void> {
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