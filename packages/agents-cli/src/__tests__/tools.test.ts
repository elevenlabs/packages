import {
  readToolsConfig,
  writeToolsConfig,
  loadToolsLockFile,
  saveToolsLockFile,
  ToolsConfig
} from '../tools';
import {
  updateToolInLock,
  getToolFromLock,
  calculateConfigHash,
  LockFileData,
  LockFileAgent
} from '../utils';
import {
  getElevenLabsClient,
  listToolsApi,
  getToolApi
} from '../elevenlabs-api';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock the elevenlabs-api module
jest.mock('../elevenlabs-api');
const mockGetElevenLabsClient = getElevenLabsClient as jest.MockedFunction<typeof getElevenLabsClient>;
const mockListToolsApi = listToolsApi as jest.MockedFunction<typeof listToolsApi>;
const mockGetToolApi = getToolApi as jest.MockedFunction<typeof getToolApi>;

describe('Tool Lock File Management', () => {
  describe('updateToolInLock', () => {
    it('should update tool in lock data', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };
      
      updateToolInLock(lockData, 'test-tool', 'tool_123', 'hash123');
      
      expect(lockData.tools['test-tool']).toEqual({
        id: 'tool_123',
        hash: 'hash123'
      });
    });

    it('should initialize tools object if not present', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: undefined as unknown as Record<string, LockFileAgent>,
        tests: {}
      };
      
      updateToolInLock(lockData, 'test-tool', 'tool_123', 'hash123');
      
      expect(lockData.tools).toBeDefined();
      expect(lockData.tools['test-tool']).toEqual({
        id: 'tool_123',
        hash: 'hash123'
      });
    });

    it('should overwrite existing tool data', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {
          'test-tool': {
            id: 'old_id',
            hash: 'old_hash'
          }
        },
        tests: {}
      };
      
      updateToolInLock(lockData, 'test-tool', 'new_id', 'new_hash');
      
      expect(lockData.tools['test-tool']).toEqual({
        id: 'new_id',
        hash: 'new_hash'
      });
    });
  });

  describe('getToolFromLock', () => {
    it('should return tool data when it exists', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {
          'test-tool': {
            id: 'tool_123',
            hash: 'hash123'
          }
        },
        tests: {}
      };
      
      const result = getToolFromLock(lockData, 'test-tool');
      
      expect(result).toEqual({
        id: 'tool_123',
        hash: 'hash123'
      });
    });

    it('should return undefined when tool does not exist', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: {},
        tests: {}
      };
      
      const result = getToolFromLock(lockData, 'non-existent-tool');
      
      expect(result).toBeUndefined();
    });

    it('should return undefined when tools object is not present', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: undefined as unknown as Record<string, LockFileAgent>,
        tests: {}
      };
      
      const result = getToolFromLock(lockData, 'test-tool');
      
      expect(result).toBeUndefined();
    });
  });
});

describe('Tool Configuration Hash Generation', () => {
  describe('Webhook Tool Hash', () => {
    it('should generate consistent hashes for identical webhook tools', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webhookTool1: any = {
        name: 'consistent-webhook',
        description: 'Consistent webhook tool',
        apiSchema: {
          url: 'https://api.example.com/webhook',
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
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webhookTool2: any = JSON.parse(JSON.stringify(webhookTool1));

      const hash1 = calculateConfigHash(webhookTool1);
      const hash2 = calculateConfigHash(webhookTool2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(32); // MD5 hash length
    });

    it('should generate different hashes for different webhook tools', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webhookTool1: any = {
        name: 'webhook-1',
        description: 'First webhook tool',
        apiSchema: {
          url: 'https://api.example.com/webhook1',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: {},
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: true,
            properties: []
          },
          requestHeaders: [
            {
              type: 'value',
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webhookTool2: any = {
        ...webhookTool1,
        name: 'webhook-2',
        description: 'Second webhook tool',
        apiSchema: {
          ...webhookTool1.apiSchema,
          url: 'https://api.example.com/webhook2'
        }
      };

      const hash1 = calculateConfigHash(webhookTool1);
      const hash2 = calculateConfigHash(webhookTool2);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
    });

    it('should handle webhook tools with secrets', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webhookTool: any = {
        name: 'secure-webhook',
        description: 'Secure webhook tool',
        apiSchema: {
          url: 'https://secure.api.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: {},
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: true,
            properties: []
          },
          requestHeaders: [
            {
              type: 'value',
              name: 'Content-Type',
              value: 'application/json'
            },
            {
              type: 'secret',
              name: 'Authorization',
              secretId: 'auth_secret_123'
            }
          ],
          authConnection: null
        },
        responseTimeoutSecs: 60,
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      const hash = calculateConfigHash(webhookTool);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(32);
    });
  });

  describe('Client Tool Hash', () => {
    it('should generate consistent hashes for identical client tools', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientTool1: any = {
        name: 'consistent-client',
        description: 'Consistent client tool',
        expectsResponse: false,
        responseTimeoutSecs: 30,
        parameters: {
          id: 'input',
          type: 'string',
          valueType: 'llm_prompt',
          description: 'Input parameter',
          dynamicVariable: '',
          constantValue: '',
          required: true
        },
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientTool2: any = JSON.parse(JSON.stringify(clientTool1));

      const hash1 = calculateConfigHash(clientTool1);
      const hash2 = calculateConfigHash(clientTool2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(32);
    });

    it('should generate different hashes for different client tools', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientTool1: any = {
        name: 'client-1',
        description: 'First client tool',
        expectsResponse: false,
        responseTimeoutSecs: 30,
        parameters: {
          id: 'input',
          type: 'string',
          valueType: 'llm_prompt',
          description: 'Input parameter',
          dynamicVariable: '',
          constantValue: '',
          required: true
        },
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientTool2: any = {
        ...clientTool1,
        name: 'client-2',
        description: 'Second client tool',
        expectsResponse: true
      };

      const hash1 = calculateConfigHash(clientTool1);
      const hash2 = calculateConfigHash(clientTool2);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
    });

    it('should handle client tools with multiple parameters', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientTool: any = {
        name: 'multi-param-client',
        description: 'Client tool with multiple parameters',
        expectsResponse: true,
        responseTimeoutSecs: 45,
        parameters: {
          id: 'params',
          type: 'object',
          valueType: 'llm_prompt',
          description: 'Parameters',
          dynamicVariable: '',
          constantValue: '',
          required: true,
          properties: [
            {
              id: 'name',
              type: 'string',
              valueType: 'llm_prompt',
              description: 'Name parameter',
              dynamicVariable: '',
              constantValue: '',
              required: true
            },
            {
              id: 'age',
              type: 'number',
              valueType: 'llm_prompt',
              description: 'Age parameter',
              dynamicVariable: '',
              constantValue: '',
              required: false
            }
          ]
        },
        dynamicVariables: {
          dynamicVariablePlaceholders: {
            'user_id': 'current_user_id'
          }
        }
      };

      const hash = calculateConfigHash(clientTool);
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(32);
    });
  });
});

describe('Tool Configuration Structure', () => {
  it('should validate webhook tool structure', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webhookTool: any = {
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
            type: 'value',
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

    // Test that the structure is valid
    expect(webhookTool.apiSchema).toBeDefined();
    expect(webhookTool.apiSchema.url).toBeTruthy();
    expect(webhookTool.apiSchema.method).toBe('POST');
    expect(webhookTool.responseTimeoutSecs).toBeGreaterThan(0);
    expect(webhookTool.dynamicVariables).toBeDefined();
  });

  it('should validate client tool structure', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientTool: any = {
      name: 'test-client',
      description: 'test-client client tool',
      expectsResponse: false,
      responseTimeoutSecs: 30,
      parameters: {
        id: 'input',
        type: 'string',
        valueType: 'llm_prompt',
        description: 'Input parameter for the client tool',
        dynamicVariable: '',
        constantValue: '',
        required: true
      },
      dynamicVariables: {
        dynamicVariablePlaceholders: {}
      }
    };

    // Test that the structure is valid
    expect(clientTool.parameters).toBeDefined();
    expect(clientTool.expectsResponse).toBe(false);
    expect(clientTool.responseTimeoutSecs).toBeGreaterThan(0);
    expect(clientTool.dynamicVariables).toBeDefined();
  });
});

describe('Tool Fetching', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-cli-test-'));
    process.chdir(tempDir);

    // Reset mocks
    jest.clearAllMocks();

    // Mock the ElevenLabs client
    mockGetElevenLabsClient.mockResolvedValue({
      conversationalAi: {
        tools: {
          list: jest.fn(),
          get: jest.fn()
        }
      }
    } as unknown as ElevenLabsClient);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('listToolsApi', () => {
    it('should fetch tools from ElevenLabs API', async () => {
      const mockTools = [
        {
          id: 'tool_123',
          toolConfig: {
            name: 'Test Webhook Tool',
            description: 'A test webhook tool',
            apiSchema: {
              url: 'https://example.com/webhook',
              method: 'POST',
              pathParamsSchema: {},
              queryParamsSchema: {},
              requestBodySchema: {
                id: 'body',
                type: 'object',
                valueType: 'llm_prompt',
                description: 'Request body',
                dynamicVariable: '',
                constantValue: '',
                required: true,
                properties: []
              },
              requestHeaders: [],
              authConnection: null
            },
            responseTimeoutSecs: 30,
            dynamicVariables: { dynamicVariablePlaceholders: {} }
          },
          accessInfo: { isCreator: true, creatorName: 'test', creatorEmail: 'test@test.com', role: 'owner' },
          usageStats: { avgLatencySecs: 0.5 }
        },
        {
          id: 'tool_456',
          toolConfig: {
            name: 'Test Client Tool',
            description: 'A test client tool',
            expectsResponse: false,
            responseTimeoutSecs: 30,
            parameters: {
              id: 'input',
              type: 'string',
              valueType: 'llm_prompt',
              description: 'Input parameter',
              dynamicVariable: '',
              constantValue: '',
              required: true
            },
            dynamicVariables: { dynamicVariablePlaceholders: {} }
          },
          accessInfo: { isCreator: true, creatorName: 'test', creatorEmail: 'test@test.com', role: 'owner' },
          usageStats: { avgLatencySecs: 0.3 }
        }
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockListToolsApi.mockResolvedValue(mockTools as any);

      const client = await getElevenLabsClient();
      const tools = await listToolsApi(client);

      expect(tools).toEqual(mockTools);
      expect(mockListToolsApi).toHaveBeenCalledWith(client);
    });

    it('should return empty array when no tools exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockListToolsApi.mockResolvedValue([] as any);

      const client = await getElevenLabsClient();
      const tools = await listToolsApi(client);

      expect(tools).toEqual([]);
      expect(mockListToolsApi).toHaveBeenCalledWith(client);
    });
  });

  describe('getToolApi', () => {
    it('should fetch specific tool details from ElevenLabs API', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockToolDetails: any = {
        name: 'Test Webhook Tool',
        description: 'A test webhook tool',
        apiSchema: {
          url: 'https://api.example.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: {},
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: true,
            properties: []
          },
          requestHeaders: [
            {
              type: 'value',
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetToolApi.mockResolvedValue(mockToolDetails as any);

      const client = await getElevenLabsClient();
      const toolDetails = await getToolApi(client, 'tool_123');

      expect(toolDetails).toEqual(mockToolDetails);
      expect(mockGetToolApi).toHaveBeenCalledWith(client, 'tool_123');
    });
  });

  describe('Tools Config Management', () => {
    it('should create and read tools configuration', async () => {
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: 'test-webhook',
            type: 'webhook',
            config: 'tool_configs/test-webhook.json'
          },
          {
            name: 'test-client',
            type: 'client',
            config: 'tool_configs/test-client.json'
          }
        ]
      };

      const configPath = path.join(tempDir, 'tools.json');
      await writeToolsConfig(configPath, toolsConfig);

      const readConfig = await readToolsConfig(configPath);
      expect(readConfig).toEqual(toolsConfig);
    });

    it('should return empty config when file does not exist', async () => {
      const configPath = path.join(tempDir, 'nonexistent-tools.json');
      const config = await readToolsConfig(configPath);

      expect(config).toEqual({ tools: [] });
    });
  });

  describe('Tools Lock File Management', () => {
    it('should create and read tools lock file', async () => {
      const toolsLockData = {
        tools: {
          'test-webhook': {
            id: 'tool_123',
            hash: 'hash123'
          },
          'test-client': {
            id: 'tool_456',
            hash: 'hash456'
          }
        }
      };

      const lockPath = path.join(tempDir, 'tools-lock.json');
      await saveToolsLockFile(lockPath, toolsLockData);

      const readLockData = await loadToolsLockFile(lockPath);
      expect(readLockData).toEqual(toolsLockData);
    });

    it('should return empty lock data when file does not exist', async () => {
      const lockPath = path.join(tempDir, 'nonexistent-tools-lock.json');
      const lockData = await loadToolsLockFile(lockPath);

      expect(lockData).toEqual({ tools: {} });
    });
  });

  describe('Integration: Fetch Tools Workflow', () => {
    it('should handle complete tool fetching workflow', async () => {
      // Mock API responses
      const mockToolsList = [
        {
          id: 'tool_123',
          toolConfig: {
            name: 'Webhook Tool',
            description: 'A webhook tool',
            apiSchema: {
              url: 'https://api.example.com/webhook',
              method: 'POST',
              pathParamsSchema: {},
              queryParamsSchema: {},
              requestBodySchema: {
                id: 'body',
                type: 'object',
                valueType: 'llm_prompt',
                description: 'Request body',
                dynamicVariable: '',
                constantValue: '',
                required: true,
                properties: []
              },
              requestHeaders: [],
              authConnection: null
            },
            responseTimeoutSecs: 30,
            dynamicVariables: { dynamicVariablePlaceholders: {} }
          },
          accessInfo: { isCreator: true, creatorName: 'test', creatorEmail: 'test@test.com', role: 'owner' },
          usageStats: { avgLatencySecs: 0.5 }
        }
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockToolDetails: any = {
        name: 'Webhook Tool',
        description: 'A webhook tool',
        apiSchema: {
          url: 'https://api.example.com/webhook',
          method: 'POST',
          pathParamsSchema: {},
          queryParamsSchema: {},
          requestBodySchema: {
            id: 'body',
            type: 'object',
            valueType: 'llm_prompt',
            description: 'Request body',
            dynamicVariable: '',
            constantValue: '',
            required: true,
            properties: []
          },
          requestHeaders: [],
          authConnection: null
        },
        responseTimeoutSecs: 30,
        dynamicVariables: {
          dynamicVariablePlaceholders: {}
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockListToolsApi.mockResolvedValue(mockToolsList as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetToolApi.mockResolvedValue(mockToolDetails as any);

      // Simulate fetching tools
      const client = await getElevenLabsClient();
      const toolsList = await listToolsApi(client);

      expect(toolsList).toHaveLength(1);
      expect(toolsList[0].id).toBe('tool_123');

      // Simulate getting tool details
      const toolDetails = await getToolApi(client, 'tool_123');
      expect(toolDetails).toEqual(mockToolDetails);

      // Verify API calls
      expect(mockGetElevenLabsClient).toHaveBeenCalled();
      expect(mockListToolsApi).toHaveBeenCalledWith(client);
      expect(mockGetToolApi).toHaveBeenCalledWith(client, 'tool_123');
    });

    it('should filter tools by search term', async () => {
      const mockToolsList = [
        {
          id: 'tool_123',
          toolConfig: {
            name: 'Webhook Tool',
            description: 'A webhook tool',
            apiSchema: {
              url: 'https://api.example.com/webhook',
              method: 'POST',
              pathParamsSchema: {},
              queryParamsSchema: {},
              requestBodySchema: {
                id: 'body',
                type: 'object',
                valueType: 'llm_prompt',
                description: 'Request body',
                dynamicVariable: '',
                constantValue: '',
                required: true,
                properties: []
              },
              requestHeaders: [],
              authConnection: null
            },
            responseTimeoutSecs: 30,
            dynamicVariables: { dynamicVariablePlaceholders: {} }
          },
          accessInfo: { isCreator: true, creatorName: 'test', creatorEmail: 'test@test.com', role: 'owner' },
          usageStats: { avgLatencySecs: 0.5 }
        },
        {
          id: 'tool_456',
          toolConfig: {
            name: 'Client Tool',
            description: 'A client tool',
            expectsResponse: false,
            responseTimeoutSecs: 30,
            parameters: {
              id: 'input',
              type: 'string',
              valueType: 'llm_prompt',
              description: 'Input parameter',
              dynamicVariable: '',
              constantValue: '',
              required: true
            },
            dynamicVariables: { dynamicVariablePlaceholders: {} }
          },
          accessInfo: { isCreator: true, creatorName: 'test', creatorEmail: 'test@test.com', role: 'owner' },
          usageStats: { avgLatencySecs: 0.5 }
        },
        {
          id: 'tool_789',
          toolConfig: {
            name: 'Another Webhook',
            description: 'Another webhook tool',
            apiSchema: {
              url: 'https://api.example.com/webhook',
              method: 'POST',
              pathParamsSchema: {},
              queryParamsSchema: {},
              requestBodySchema: {
                id: 'body',
                type: 'object',
                valueType: 'llm_prompt',
                description: 'Request body',
                dynamicVariable: '',
                constantValue: '',
                required: true,
                properties: []
              },
              requestHeaders: [],
              authConnection: null
            },
            responseTimeoutSecs: 30,
            dynamicVariables: { dynamicVariablePlaceholders: {} }
          },
          accessInfo: { isCreator: true, creatorName: 'test', creatorEmail: 'test@test.com', role: 'owner' },
          usageStats: { avgLatencySecs: 0.5 }
        }
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockListToolsApi.mockResolvedValue(mockToolsList as any);

      const client = await getElevenLabsClient();
      const allTools = await listToolsApi(client);

      // Simulate filtering by search term 'webhook'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const webhookTools = allTools.filter((tool: any) =>
        tool.toolConfig.name.toLowerCase().includes('webhook')
      );

      expect(webhookTools).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((webhookTools[0] as any).toolConfig.name).toBe('Webhook Tool');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((webhookTools[1] as any).toolConfig.name).toBe('Another Webhook');
    });
  });
});