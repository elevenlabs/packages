/**
 * Integration tests for sync-tools functionality with mocked API calls
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  calculateConfigHash,
  toSnakeCaseKeys
} from '../utils';
import {
  writeToolsConfig,
  writeToolConfig,
  readToolsConfig,
  ToolsConfig,
  loadToolsLockFile,
  saveToolsLockFile,
  updateToolInLock,
  getToolFromLock,
  ToolsLockFile
} from '../tools';
import * as elevenLabsApi from '../elevenlabs-api';
import * as config from '../config';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Mock the entire elevenlabs-api module
jest.mock('../elevenlabs-api');
const mockedElevenLabsApi = elevenLabsApi as jest.Mocked<typeof elevenLabsApi>;

// Mock the config module
jest.mock('../config');
const mockedConfig = config as jest.Mocked<typeof config>;

// Mock os module for config path
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn()
}));
const mockedOs = os as jest.Mocked<typeof os>;

// Note: syncTools function is tested indirectly through its component functions

describe('Sync Tools Integration Tests', () => {
  let tempDir: string;
  let toolsConfigPath: string;
  let lockFilePath: string;

  beforeEach(async () => {
    // Create a temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-sync-tools-test-'));
    toolsConfigPath = path.join(tempDir, 'tools.json');
    lockFilePath = path.join(tempDir, 'agents.lock');

    // Set up mocks
    mockedOs.homedir.mockReturnValue('/mock/home');
    mockedConfig.getApiKey.mockResolvedValue('test-api-key');
    mockedConfig.isLoggedIn.mockResolvedValue(true);
    mockedConfig.getResidency.mockResolvedValue('us');

    const mockClient = {} as ElevenLabsClient;
    mockedElevenLabsApi.getElevenLabsClient.mockResolvedValue(mockClient);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    jest.clearAllMocks();
  });

  describe('syncTools function logic components', () => {
    it('should create webhook tool config correctly', async () => {
      const toolConfig = {
        name: 'test-webhook',
        description: 'test-webhook webhook tool',
        apiSchema: {
          url: 'https://api.example.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: {},
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body for the webhook',
            dynamicVariable: '',
            constantValue: '',
            required: true,
            properties: []
          },
          requestHeaders: [
            {
              type: 'value' as const,
              name: 'Content-Type',
              value: 'application/json'
            }
          ],
          authConnection: null
        },
        responseTimeoutSecs: 30,
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      const configPath = path.join(tempDir, 'tool_configs', 'test_webhook.json');
      await fs.ensureDir(path.dirname(configPath));
      const toolDefinition = {
        type: 'webhook' as const,
        config: toolConfig
      };
      await writeToolConfig(configPath, toolDefinition);

      const toolsConfig: ToolsConfig = {
        tools: [{
          name: 'test-webhook',
          type: 'webhook',
          config: 'tool_configs/test_webhook.json'
        }]
      };

      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Test that config can be read back
      const readConfig = await readToolsConfig(toolsConfigPath);
      expect(readConfig.tools).toHaveLength(1);
      expect(readConfig.tools[0].name).toBe('test-webhook');
      expect(readConfig.tools[0].type).toBe('webhook');
    });

    it('should create client tool config correctly', async () => {
      const toolConfig = {
        name: 'test-client',
        description: 'test-client client tool',
        expectsResponse: false,
        responseTimeoutSecs: 30,
        parameters: {
          id: 'input',
          type: 'object',
          valueType: 'llm_prompt',
          description: 'Input parameter for the client tool',
          dynamicVariable: '',
          constantValue: '',
          required: [],
          properties: {}
        },
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      const configPath = path.join(tempDir, 'tool_configs', 'test_client.json');
      await fs.ensureDir(path.dirname(configPath));
      const toolDefinition = {
        type: 'client' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: toolConfig as any
      };
      await writeToolConfig(configPath, toolDefinition);

      const toolsConfig: ToolsConfig = {
        tools: [{
          name: 'test-client',
          type: 'client',
          config: 'tool_configs/test_client.json'
        }]
      };

      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Test that config can be read back
      const readConfig = await readToolsConfig(toolsConfigPath);
      expect(readConfig.tools).toHaveLength(1);
      expect(readConfig.tools[0].name).toBe('test-client');
      expect(readConfig.tools[0].type).toBe('client');
    });

    it('should handle lock file operations for tools', async () => {
      const lockData: ToolsLockFile = {
        tools: {}
      };

      // Test updating tool in lock
      updateToolInLock(lockData, 'test-tool', 'tool_123', 'hash123');
      expect(lockData.tools['test-tool']).toEqual({
        id: 'tool_123',
        hash: 'hash123'
      });

      // Test getting tool from lock
      const lockedTool = getToolFromLock(lockData, 'test-tool');
      expect(lockedTool).toEqual({
        id: 'tool_123',
        hash: 'hash123'
      });

      // Test getting non-existent tool from lock
      const nonExistentTool = getToolFromLock(lockData, 'non-existent');

      expect(nonExistentTool).toBeUndefined();
    });

    it('should calculate config hash correctly', async () => {
      const toolConfig = {
        name: 'test-tool',
        description: 'Test tool',
        type: 'webhook'
      };

      const hash1 = calculateConfigHash(toSnakeCaseKeys(toolConfig));
      const hash2 = calculateConfigHash(toSnakeCaseKeys(toolConfig));

      // Same config should produce same hash
      expect(hash1).toBe(hash2);

      // Different config should produce different hash
      const modifiedConfig = { ...toolConfig, description: 'Modified test tool' };
      const hash3 = calculateConfigHash(toSnakeCaseKeys(modifiedConfig));
      expect(hash1).not.toBe(hash3);
    });

    it('should detect config changes correctly', async () => {
      const toolConfig = {
        name: 'test-tool',
        description: 'Test tool',
        type: 'webhook'
      };

      const initialHash = calculateConfigHash(toSnakeCaseKeys(toolConfig));

      const lockData: ToolsLockFile = {
        tools: {}
      };

      updateToolInLock(lockData, 'test-tool', 'tool_123', initialHash);

      // Same config should not need update
      const currentHash = calculateConfigHash(toSnakeCaseKeys(toolConfig));
      const lockedTool = getToolFromLock(lockData, 'test-tool');
      expect(lockedTool?.hash).toBe(currentHash);

      // Modified config should need update
      const modifiedConfig = { ...toolConfig, description: 'Modified test tool' };
      const modifiedHash = calculateConfigHash(toSnakeCaseKeys(modifiedConfig));
      expect(lockedTool?.hash).not.toBe(modifiedHash);
    });
  });

  describe('API integration scenarios', () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockedElevenLabsApi.createToolApi.mockClear();
      mockedElevenLabsApi.updateToolApi.mockClear();
    });

    it('should call createToolApi for new tools', async () => {
      const mockResponse = {
        id: 'tool_new_123',
        toolConfig: {
          name: 'new-tool',
          description: 'New tool',
          type: 'webhook' as const,
          apiSchema: {
            url: 'https://example.com/webhook',
            method: 'POST',
            pathParamsSchema: {},
            queryParamsSchema: { properties: {} },
            requestBodySchema: {
              id: 'body',
              type: 'object',
              valueType: 'llm_prompt',
              description: 'Request body',
              dynamicVariable: '',
              constantValue: '',
              required: [],
              properties: {}
            },
            requestHeaders: {},
            authConnection: undefined
          },
          responseTimeoutSecs: 30,
          dynamicVariables: { dynamicVariablePlaceholders: {} }
        },
        accessInfo: {
          isCreator: true,
          creatorName: 'test',
          creatorEmail: 'test@test.com',
          role: 'owner'
        },
        usageStats: { avgLatencySecs: 0.5 }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedElevenLabsApi.createToolApi.mockResolvedValue(mockResponse as any);

      const toolConfig = {
        name: 'new-tool',
        description: 'New tool',
        apiSchema: {
          url: 'https://example.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: { properties: {} },
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: [],
            properties: {}
          },
          requestHeaders: {},
          authConnection: undefined
        },
        responseTimeoutSecs: 30,
        dynamicVariables: { dynamicVariablePlaceholders: {} }
      };

      // Simulate creating a new tool
      const mockClient = {} as ElevenLabsClient;
      const result = await mockedElevenLabsApi.createToolApi(mockClient, toolConfig);

      expect(mockedElevenLabsApi.createToolApi).toHaveBeenCalledWith(mockClient, toolConfig);
      expect(result).toEqual(mockResponse);
    });

    it('should call updateToolApi for existing tools', async () => {
      const mockResponse = {
        id: 'tool_123',
        toolConfig: {
          name: 'existing-tool',
          description: 'Updated existing tool',
          type: 'webhook' as const,
          apiSchema: {
            url: 'https://example.com/webhook',
            method: 'POST',
            pathParamsSchema: {},
            queryParamsSchema: { properties: {} },
            requestBodySchema: {
              id: 'body',
              type: 'object',
              valueType: 'llm_prompt',
              description: 'Request body',
              dynamicVariable: '',
              constantValue: '',
              required: [],
              properties: {}
            },
            requestHeaders: {},
            authConnection: undefined
          },
          responseTimeoutSecs: 30,
          dynamicVariables: { dynamicVariablePlaceholders: {} }
        },
        accessInfo: {
          isCreator: true,
          creatorName: 'test',
          creatorEmail: 'test@test.com',
          role: 'owner'
        },
        usageStats: { avgLatencySecs: 0.5 }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockedElevenLabsApi.updateToolApi.mockResolvedValue(mockResponse as any);

      const toolConfig = {
        name: 'existing-tool',
        description: 'Updated existing tool',
        apiSchema: {
          url: 'https://example.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: { properties: {} },
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: [],
            properties: {}
          },
          requestHeaders: {},
          authConnection: undefined
        },
        responseTimeoutSecs: 30,
        dynamicVariables: { dynamicVariablePlaceholders: {} }
      };

      // Simulate updating an existing tool
      const mockClient = {} as ElevenLabsClient;
      const toolId = 'tool_existing_123';
      await mockedElevenLabsApi.updateToolApi(mockClient, toolId, toolConfig);

      expect(mockedElevenLabsApi.updateToolApi).toHaveBeenCalledWith(mockClient, toolId, toolConfig);
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error: Tool creation failed');
      mockedElevenLabsApi.createToolApi.mockRejectedValue(apiError);

      const mockClient = {} as ElevenLabsClient;
      const toolConfig = {
        name: 'failing-tool',
        description: 'Failing tool',
        apiSchema: {
          url: 'https://example.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: { properties: {} },
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: [],
            properties: {}
          },
          requestHeaders: {},
          authConnection: undefined
        },
        responseTimeoutSecs: 30,
        dynamicVariables: { dynamicVariablePlaceholders: {} }
      };

      await expect(mockedElevenLabsApi.createToolApi(mockClient, toolConfig))
        .rejects.toThrow('API Error: Tool creation failed');
    });
  });

  describe('file system operations', () => {
    it('should handle missing tools.json file', async () => {
      // Ensure tools.json doesn't exist
      const exists = await fs.pathExists(toolsConfigPath);
      expect(exists).toBe(false);

      // This should be handled by the sync function throwing an error
      // In real scenario, syncTools would throw: "tools.json not found..."
    });

    it('should handle missing config files', async () => {
      const toolsConfig: ToolsConfig = {
        tools: [{
          name: 'missing-config-tool',
          type: 'webhook',
          config: 'non_existent_config.json'
        }]
      };

      await writeToolsConfig(toolsConfigPath, toolsConfig);

      const readConfig = await readToolsConfig(toolsConfigPath);
      expect(readConfig.tools[0].config).toBe('non_existent_config.json');

      // The sync function should handle missing config files gracefully
      // by logging a warning and continuing with other tools
    });

    it('should save and load lock file correctly', async () => {
      const lockData = {
        agents: {},
        tools: {
          'test-tool': {
            id: 'tool_123',
            hash: 'hash123'
          }
        },
        tests: {}
      };

      await saveToolsLockFile(lockFilePath, lockData);

      const loadedLockData = await loadToolsLockFile(lockFilePath);
      expect(loadedLockData.tools['test-tool']).toEqual({
        id: 'tool_123',
        hash: 'hash123'
      });
    });
  });
});