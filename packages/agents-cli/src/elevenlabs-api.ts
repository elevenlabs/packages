import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import {
  ConversationalConfig,
  AgentPlatformSettingsRequestModel
} from '@elevenlabs/elevenlabs-js/api';
import { getApiKey, loadConfig, Location } from './config.js';
import { toCamelCaseKeys, toSnakeCaseKeys } from './utils.js';

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
export function getApiBaseUrl(residency?: Location): string {
  switch (residency) {
    case 'eu-residency':
      return 'https://api.eu.residency.elevenlabs.io';
    case 'in-residency':
      return 'https://api.in.residency.elevenlabs.io';
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
 * @param environment - The environment to get the API key for (defaults to 'prod')
 * @throws {Error} If no API key is found
 * @returns An instance of the ElevenLabs client
 */
export async function getElevenLabsClient(environment: string = 'prod'): Promise<ElevenLabsClient> {
  const apiKey = await getApiKey(environment);
  if (!apiKey) {
    throw new Error(`No API key found for environment '${environment}'. Use 'agents login --env ${environment}' to authenticate or set ELEVENLABS_API_KEY environment variable.`);
  }
  
  const config = await loadConfig();
  const baseURL = getApiBaseUrl(config.residency);
  
  return new ElevenLabsClient({ 
    apiKey,
    baseUrl: baseURL,
    headers: {
      'X-Source': 'agents-cli'
    }
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
 * Deletes an agent using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param agentId - The ID of the agent to delete
 * @returns Promise that resolves when the agent is deleted
 */
export async function deleteAgentApi(client: ElevenLabsClient, agentId: string): Promise<void> {
  await client.conversationalAi.agents.delete(agentId);
}

/**
 * Deletes a tool using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool to delete
 * @returns Promise that resolves when the tool is deleted
 */
export async function deleteToolApi(client: ElevenLabsClient, toolId: string): Promise<void> {
  await client.conversationalAi.tools.delete(toolId);
}

/**
 * Deletes a test using the ElevenLabs API.
 * 
 * @param client - An initialized ElevenLabs client
 * @param testId - The ID of the test to delete
 * @returns Promise that resolves when the test is deleted
 */
export async function deleteTestApi(client: ElevenLabsClient, testId: string): Promise<void> {
  await client.conversationalAi.tests.delete(testId);
}

/**
 * Creates a new tool using the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param toolConfig - The tool configuration object
 * @returns Promise that resolves to the created tool object
 */
export async function createToolApi(client: ElevenLabsClient, toolConfig: Record<string, unknown>): Promise<ElevenLabs.ToolResponseModel> {
  const normalizedConfig = toCamelCaseKeys(toolConfig);

  return await client.conversationalAi.tools.create({
    toolConfig: normalizedConfig as unknown as ElevenLabs.ToolRequestModelToolConfig
  })
}

/**
 * Updates an existing tool using the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool to update
 * @param toolConfig - The updated tool configuration object
 * @returns Promise that resolves to the updated tool object
 */
export async function updateToolApi(client: ElevenLabsClient, toolId: string, toolConfig: Record<string, unknown>): Promise<ElevenLabs.ToolResponseModel> {
  // Normalize to camelCase for API
  const normalizedConfig = toCamelCaseKeys(toolConfig);

  return await client.conversationalAi.tools.update(toolId, {
    toolConfig: normalizedConfig as unknown as ElevenLabs.ToolRequestModelToolConfig
  })
}

/**
 * Gets a specific tool from the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool to retrieve
 * @returns Promise that resolves to the tool object
 */
export async function getToolApi(client: ElevenLabsClient, toolId: string): Promise<unknown> {
  const response = await client.conversationalAi.tools.get(toolId);
  // Normalize response to snake_case for downstream writing
  return toSnakeCaseKeys(response);
}

/**
 * Lists all tools from the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @returns Promise that resolves to a list of tool objects
 */
export async function listToolsApi(client: ElevenLabsClient): Promise<unknown[]> {
  const response = await client.conversationalAi.tools.list();
  return response.tools.map(tool => toSnakeCaseKeys(tool));
}

/**
 * Gets agents that depend on a specific tool.
 *
 *
 * @param client - An initialized ElevenLabs client
 * @param toolId - The ID of the tool
 * @returns Promise that resolves to a list of dependent agents
 */
export async function getToolDependentAgentsApi(client: ElevenLabsClient, toolId: string): Promise<unknown[]> {
  const response = await client.conversationalAi.tools.getDependentAgents(toolId);
  return response.agents.map(agent => toSnakeCaseKeys(agent));
}

// Test API functions

/**
 * Creates a new test using the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param testConfig - The test configuration object
 * @returns Promise that resolves to the created test with ID
 */
export async function createTestApi(client: ElevenLabsClient, testConfig: ElevenLabs.conversationalAi.CreateUnitTestRequest): Promise<{ id: string }> {
  const response = await client.conversationalAi.tests.create(testConfig);
  return response as { id: string };
}

/**
 * Gets a specific test from the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param testId - The ID of the test to retrieve
 * @returns Promise that resolves to the test object
 */
export async function getTestApi(client: ElevenLabsClient, testId: string): Promise<unknown> {
  const response = await client.conversationalAi.tests.get(testId);
  return toSnakeCaseKeys(response);
}

/**
 * Lists all tests from the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param pageSize - Maximum number of tests to return per page (default: 30)
 * @returns Promise that resolves to a list of test objects
 */
export async function listTestsApi(client: ElevenLabsClient, pageSize: number = 30): Promise<unknown[]> {
  const response = await client.conversationalAi.tests.list({ pageSize });
  return (response).tests || [];
}

/**
 * Updates an existing test using the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param testId - The ID of the test to update
 * @param testConfig - The updated test configuration object
 * @returns Promise that resolves to the updated test object
 */
export async function updateTestApi(client: ElevenLabsClient, testId: string, testConfig: ElevenLabs.conversationalAi.UpdateUnitTestRequest): Promise<unknown> {
  const response = await client.conversationalAi.tests.update(testId, testConfig);
  return toSnakeCaseKeys(response);
}

/**
 * Runs tests on an agent using the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param agentId - The ID of the agent to run tests on
 * @param testIds - Array of test IDs to run
 * @param agentConfigOverride - Optional agent configuration override
 * @returns Promise that resolves to the test invocation with ID
 */
export async function runTestsOnAgentApi(
  client: ElevenLabsClient,
  agentId: string,
  testIds: string[],
  agentConfigOverride?: Record<string, unknown>
): Promise<unknown> {
  const tests = testIds.map(testId => ({ testId }));
  const requestBody: ElevenLabs.conversationalAi.RunAgentTestsRequestModel = { tests };

  if (agentConfigOverride) {
    requestBody.agentConfigOverride = agentConfigOverride as unknown as ElevenLabs.AdhocAgentConfigOverrideForTestRequestModel;
  }

  const response = await client.conversationalAi.agents.runTests(agentId, requestBody);
  return toSnakeCaseKeys(response);
}

/**
 * Gets test invocation results from the ElevenLabs API.
 *
 * @param client - An initialized ElevenLabs client
 * @param testInvocationId - The ID of the test invocation
 * @returns Promise that resolves to the test invocation results
 */
export async function getTestInvocationApi(client: ElevenLabsClient, testInvocationId: string): Promise<unknown> {
  const response = await client.conversationalAi.tests.invocations.get(testInvocationId);
  return toSnakeCaseKeys(response);
} 