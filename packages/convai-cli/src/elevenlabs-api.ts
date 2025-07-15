import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ConversationalConfig, AgentPlatformSettingsRequestModel } from '@elevenlabs/elevenlabs-js/api';
import { getApiKey } from './config';

// Type guard for conversational config
function isConversationalConfig(config: unknown): config is ConversationalConfig {
  return typeof config === 'object' && config !== null;
}

// Type guard for platform settings
function isPlatformSettings(settings: unknown): settings is AgentPlatformSettingsRequestModel {
  return typeof settings === 'object' && settings !== null;
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
  return new ElevenLabsClient({ apiKey });
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
  
  const convConfig = conversationConfigDict;
  const platformSettings = platformSettingsDict && isPlatformSettings(platformSettingsDict) ? platformSettingsDict : undefined;
  
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
  const convConfig = conversationConfigDict && isConversationalConfig(conversationConfigDict) ? conversationConfigDict : undefined;
  const platformSettings = platformSettingsDict && isPlatformSettings(platformSettingsDict) ? platformSettingsDict : undefined;
    
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
  return response;
} 