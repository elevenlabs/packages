import { ElevenLabs, ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ConversationalConfig, AgentPlatformSettingsRequestModel } from '@elevenlabs/elevenlabs-js/api';
/**
 * Retrieves the ElevenLabs API key from environment variables and returns an API client.
 * 
 * @throws {Error} If the ELEVENLABS_API_KEY environment variable is not set
 * @returns An instance of the ElevenLabs client
 */
export function getElevenLabsClient(): ElevenLabsClient {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable not set.");
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
  conversationConfigDict: Record<string, any>,
  platformSettingsDict?: Record<string, any>,
  tags?: string[]
): Promise<string> {
  const convConfig = conversationConfigDict as ConversationalConfig;
  const platformSettings = platformSettingsDict ? (platformSettingsDict as AgentPlatformSettingsRequestModel) : undefined;
  
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
  conversationConfigDict?: Record<string, any>,
  platformSettingsDict?: Record<string, any>,
  tags?: string[]
): Promise<string> {
  const convConfig = conversationConfigDict ? (conversationConfigDict as ConversationalConfig) : undefined;
  const platformSettings = platformSettingsDict ? (platformSettingsDict as AgentPlatformSettingsRequestModel) : undefined;
    
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
): Promise<any[]> {
  const allAgents: any[] = [];
  let cursor: string | undefined;
  
  while (true) {
    const requestParams: any = {
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
export async function getAgentApi(client: ElevenLabsClient, agentId: string): Promise<any> {
  const response = await client.conversationalAi.agents.get(agentId);
  return response;
} 