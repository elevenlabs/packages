import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ConversationalConfig, AgentPlatformSettingsRequestModel } from '@elevenlabs/elevenlabs-js/api';
import { getApiKey, loadConfig, Location } from './config';
import { toCamelCaseKeys, toSnakeCaseKeys } from './utils';

// Type guard for conversational config
function isConversationalConfig(config: unknown): config is ConversationalConfig {
  return typeof config === 'object' && config !== null;
}

// Type guard for platform settings
function isPlatformSettings(settings: unknown): settings is AgentPlatformSettingsRequestModel {
  return typeof settings === 'object' && settings !== null;
}
/**
 * Gets the API base URL based on residency configuration
 */
function getApiBaseUrl(residency?: Location): string {
  switch (residency) {
    case 'eu-residency':
      return 'https://api.eu.elevenlabs.io';
    case 'in-residency':
      return 'https://api.in.elevenlabs.io';
    case 'us':
      return 'https://api.us.elevenlabs.io';
    case 'global':
    default:
      return 'https://api.elevenlabs.io';
  }
}

/**
 * Retrieves the ElevenLabs API key from config or environment variables and returns an API client.
 * 
 * @throws {Error} If no API key is found
 * @returns An instance of the ElevenLabs client
 */
export async function getElevenLabsClient(): Promise<ElevenLabsClient> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("No API key found. Use 'convai login' to authenticate or set ELEVENLABS_API_KEY environment variable.");
  }
  
  const config = await loadConfig();
  const baseURL = getApiBaseUrl(config.residency);
  
  return new ElevenLabsClient({ 
    apiKey,
    baseUrl: baseURL
  });
}

/**
 * Creates a new agent using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param name - The name of the agent
 * @param conversationConfigDict - A dictionary for ConversationalConfig
 * @param platformSettingsDict - An optional dictionary for AgentPlatformSettings
 * @param tags - An optional list of tags
 * @returns Promise that resolves to the agent_id of the newly created agent
 */
export async function createAgentApi(
  client: ElevenLabsClient,
  name: string,
  conversationConfigDict: Record<string, unknown>,
  platformSettingsDict?: Record<string, unknown>,
  tags?: string[]
): Promise<string> {
  if (!isConversationalConfig(conversationConfigDict)) {
    throw new Error('Invalid conversation config provided');
  }
  
  // Normalize to camelCase for API
  const convConfig = toCamelCaseKeys(conversationConfigDict) as ConversationalConfig;
  const platformSettings = platformSettingsDict && isPlatformSettings(platformSettingsDict) ? toCamelCaseKeys(platformSettingsDict) as AgentPlatformSettingsRequestModel : undefined;
  
  const response = await client.conversationalAi.agents.create({
    name,
    conversationConfig: convConfig,
    platformSettings,
    tags
  });
  
  return response.agentId;
}

/**
 * Updates an existing agent using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param agentId - The ID of the agent to update
 * @param name - Optional new name for the agent
 * @param conversationConfigDict - Optional new dictionary for ConversationalConfig
 * @param platformSettingsDict - Optional new dictionary for AgentPlatformSettings
 * @param tags - Optional new list of tags
 * @returns Promise that resolves to the agent_id of the updated agent
 */
export async function updateAgentApi(
  client: ElevenLabsClient,
  agentId: string,
  name?: string,
  conversationConfigDict?: Record<string, unknown>,
  platformSettingsDict?: Record<string, unknown>,
  tags?: string[]
): Promise<string> {
  const convConfig = conversationConfigDict && isConversationalConfig(conversationConfigDict) ? toCamelCaseKeys(conversationConfigDict) as ConversationalConfig : undefined;
  const platformSettings = platformSettingsDict && isPlatformSettings(platformSettingsDict) ? toCamelCaseKeys(platformSettingsDict) as AgentPlatformSettingsRequestModel : undefined;
    
  const response = await client.conversationalAi.agents.update(agentId, {
    name,
    conversationConfig: convConfig,
    platformSettings,
    tags
  });
  
  return response.agentId;
}

/**
 * Lists all agents from the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param pageSize - Maximum number of agents to return per page (default: 30, max: 100)
 * @param search - Optional search string to filter agents by name
 * @returns Promise that resolves to a list of agent metadata objects
 */
export async function listAgentsApi(
  client: ElevenLabsClient,
  pageSize: number = 30,
  search?: string
): Promise<unknown[]> {
  const allAgents: unknown[] = [];
  let cursor: string | undefined;
  
  while (true) {
    const requestParams: Record<string, unknown> = {
      pageSize: Math.min(pageSize, 100)
    };
    
    if (cursor) {
      requestParams.cursor = cursor;
    }
    
    if (search) {
      requestParams.search = search;
    }
    
    const response = await client.conversationalAi.agents.list(requestParams);
    
    allAgents.push(...response.agents);
    
    if (!response.hasMore) {
      break;
    }
    
    cursor = response.nextCursor;
  }
  
  return allAgents;
}

/**
 * Gets detailed configuration for a specific agent from the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param agentId - The ID of the agent to retrieve
 * @returns Promise that resolves to an object containing the full agent configuration
 */
export async function getAgentApi(client: ElevenLabsClient, agentId: string): Promise<unknown> {
  const response = await client.conversationalAi.agents.get(agentId);
  // Normalize response to snake_case for downstream writing
  return toSnakeCaseKeys(response);
}

/**
 * Creates a new tool using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param toolConfig - The tool configuration object
 * @returns Promise that resolves to the created tool object
 */
export async function createToolApi(client: ElevenLabsClient, toolConfig: unknown): Promise<unknown> {
  // Mock implementation until SDK supports tools API
  const toolId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return { toolId, ...(toolConfig as Record<string, unknown>) };
}

/**
 * Updates an existing tool using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool to update
 * @param toolConfig - The updated tool configuration object
 * @returns Promise that resolves to the updated tool object
 */
export async function updateToolApi(client: ElevenLabsClient, toolId: string, toolConfig: unknown): Promise<unknown> {
  // Mock implementation until SDK supports tools API
  return { toolId, ...(toolConfig as Record<string, unknown>) };
}

/**
 * Gets a specific tool from the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool to retrieve
 * @returns Promise that resolves to the tool object
 */
export async function getToolApi(client: ElevenLabsClient, toolId: string): Promise<unknown> {
  // Mock implementation until SDK supports tools API
  return { toolId, name: 'example_tool' };
}

/**
 * Lists all tools from the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @returns Promise that resolves to a list of tool objects
 */
export async function listToolsApi(client: ElevenLabsClient): Promise<unknown[]> {
  // Mock implementation until SDK supports tools API
  return [];
}

/**
 * Gets agents that depend on a specific tool.
 * 
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool
 * @returns Promise that resolves to a list of dependent agents
 */
export async function getToolDependentAgentsApi(client: ElevenLabsClient, toolId: string): Promise<unknown[]> {
  // Mock implementation until SDK supports tools API
  return [];
} 