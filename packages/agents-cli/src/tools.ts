/**
 * Tool management for ElevenLabs agents
 */

import fs from 'fs-extra';
import path from 'path';
import { calculateConfigHash } from './utils.js';

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
    path_params_schema?: Record<string, unknown>;
    query_params_schema?: {
      properties: Record<string, unknown>;
      required?: string[];
    };
    request_body_schema?: {
      type?: string;
      required?: string[];
      description?: string;
      properties?: Record<string, unknown>;
    } | null;
    request_headers?: Record<string, string | { secret_id: string } | { variable_name: string }>;
    auth_connection?: unknown;
  };
  response_timeout_secs: number;
  dynamic_variables: {
    dynamic_variable_placeholders: Record<string, unknown>;
  };
  assignments?: unknown[];
  disable_interruptions?: boolean;
  force_pre_tool_speech?: boolean;
}

export interface ClientTool {
  // Note: tool_id is now stored in tools.json, not in individual config files
  tool_id?: string; // @deprecated - for backwards compatibility only
  name: string;
  description: string;
  type: 'client';
  expects_response?: boolean;
  response_timeout_secs?: number;
  parameters?: {
    type?: string;
    required?: string[];
    description?: string;
    properties?: Record<string, unknown>;
  };
  dynamic_variables?: {
    dynamic_variable_placeholders: Record<string, unknown>;
  };
  assignments?: unknown[];
  disable_interruptions?: boolean;
  force_pre_tool_speech?: boolean;
}

export type Tool = WebhookTool | ClientTool;

export interface ToolDefinition {
  type: 'webhook' | 'client';
  config?: string;
  id?: string;
  env?: string;
}

export interface ToolsConfig {
  tools: ToolDefinition[];
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
      request_body_schema: {
        type: 'object',
        description: 'Request body for the webhook',
        properties: {}
      },
      request_headers: {
        'Content-Type': 'application/json'
      }
    },
    response_timeout_secs: 30,
    dynamic_variables: {
      dynamic_variable_placeholders: {}
    },
    assignments: [],
    disable_interruptions: false,
    force_pre_tool_speech: false
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
    parameters: {
      type: 'object',
      description: 'Parameters for the client tool',
      properties: {}
    },
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
 * Calculates the hash of a tool configuration
 */
export function calculateToolHash(tool: Tool): string {
  return calculateConfigHash(tool);
}