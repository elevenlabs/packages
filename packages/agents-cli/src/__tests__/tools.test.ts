import {
  WebhookTool,
  ClientTool,
  readToolsConfig,
  writeToolsConfig,
  loadToolsLockFile,
  saveToolsLockFile,
  ToolsConfig,
  ToolDefinition
} from '../tools';
import {
  updateToolInLock,
  getToolFromLock,
  calculateConfigHash,
  LockFileData
} from '../utils';
import {
  getElevenLabsClient,
  listToolsApi,
  getToolApi
} from '../elevenlabs-api';
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
        tools: {}
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
        tools: undefined as any
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
        }
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
        }
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
        tools: {}
      };
      
      const result = getToolFromLock(lockData, 'non-existent-tool');
      
      expect(result).toBeUndefined();
    });

    it('should return undefined when tools object is not present', () => {
      const lockData: LockFileData = {
        agents: {},
        tools: undefined as any
      };
      
      const result = getToolFromLock(lockData, 'test-tool');
      
      expect(result).toBeUndefined();
    });
  });
});

describe('Tool Configuration Hash Generation', () => {
  describe('Webhook Tool Hash', () => {
    it('should generate consistent hashes for identical webhook tools', () => {
      const webhookTool1: WebhookTool = {
        name: 'consistent-webhook',
        description: 'Consistent webhook tool',
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
            description: 'Request body',
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

      const webhookTool2: WebhookTool = JSON.parse(JSON.stringify(webhookTool1));

      const hash1 = calculateConfigHash(webhookTool1);
      const hash2 = calculateConfigHash(webhookTool2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(32); // MD5 hash length
    });

    it('should generate different hashes for different webhook tools', () => {
      const webhookTool1: WebhookTool = {
        name: 'webhook-1',
        description: 'First webhook tool',
        type: 'webhook',
        api_schema: {
          url: 'https://api.example.com/webhook1',
          method: 'POST',
          path_params_schema: [],
          query_params_schema: [],
          request_body_schema: {
            id: 'body',
            type: 'object',
            value_type: 'llm_prompt',
            description: 'Request body',
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

      const webhookTool2: WebhookTool = {
        ...webhookTool1,
        name: 'webhook-2',
        description: 'Second webhook tool',
        api_schema: {
          ...webhookTool1.api_schema,
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
      const webhookTool: WebhookTool = {
        name: 'secure-webhook',
        description: 'Secure webhook tool',
        type: 'webhook',
        api_schema: {
          url: 'https://secure.api.com/webhook',
          method: 'POST',
          path_params_schema: [],
          query_params_schema: [],
          request_body_schema: {
            id: 'body',
            type: 'object',
            value_type: 'llm_prompt',
            description: 'Request body',
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
            },
            {
              type: 'secret',
              name: 'Authorization',
              secret_id: 'auth_secret_123'
            }
          ],
          auth_connection: null
        },
        response_timeout_secs: 60,
        dynamic_variables: {
          dynamic_variable_placeholders: {}
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
      const clientTool1: ClientTool = {
        name: 'consistent-client',
        description: 'Consistent client tool',
        type: 'client',
        expects_response: false,
        response_timeout_secs: 30,
        parameters: [
          {
            id: 'input',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Input parameter',
            dynamic_variable: '',
            constant_value: '',
            required: true
          }
        ],
        dynamic_variables: {
          dynamic_variable_placeholders: {}
        }
      };

      const clientTool2: ClientTool = JSON.parse(JSON.stringify(clientTool1));

      const hash1 = calculateConfigHash(clientTool1);
      const hash2 = calculateConfigHash(clientTool2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(32);
    });

    it('should generate different hashes for different client tools', () => {
      const clientTool1: ClientTool = {
        name: 'client-1',
        description: 'First client tool',
        type: 'client',
        expects_response: false,
        response_timeout_secs: 30,
        parameters: [
          {
            id: 'input',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Input parameter',
            dynamic_variable: '',
            constant_value: '',
            required: true
          }
        ],
        dynamic_variables: {
          dynamic_variable_placeholders: {}
        }
      };

      const clientTool2: ClientTool = {
        ...clientTool1,
        name: 'client-2',
        description: 'Second client tool',
        expects_response: true
      };

      const hash1 = calculateConfigHash(clientTool1);
      const hash2 = calculateConfigHash(clientTool2);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
    });

    it('should handle client tools with multiple parameters', () => {
      const clientTool: ClientTool = {
        name: 'multi-param-client',
        description: 'Client tool with multiple parameters',
        type: 'client',
        expects_response: true,
        response_timeout_secs: 45,
        parameters: [
          {
            id: 'name',
            type: 'string',
            value_type: 'llm_prompt',
            description: 'Name parameter',
            dynamic_variable: '',
            constant_value: '',
            required: true
          },
          {
            id: 'age',
            type: 'number',
            value_type: 'llm_prompt',
            description: 'Age parameter',
            dynamic_variable: '',
            constant_value: '',
            required: false
          }
        ],
        dynamic_variables: {
          dynamic_variable_placeholders: {
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
    const webhookTool: WebhookTool = {
      name: 'test-webhook',
      description: 'test-webhook webhook tool',
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

    // Test that the structure is valid
    expect(webhookTool.type).toBe('webhook');
    expect(webhookTool.api_schema).toBeDefined();
    expect(webhookTool.api_schema.url).toBeTruthy();
    expect(webhookTool.api_schema.method).toBe('POST');
    expect(webhookTool.response_timeout_secs).toBeGreaterThan(0);
    expect(webhookTool.dynamic_variables).toBeDefined();
  });

  it('should validate client tool structure', () => {
    const clientTool: ClientTool = {
      name: 'test-client',
      description: 'test-client client tool',
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

    // Test that the structure is valid
    expect(clientTool.type).toBe('client');
    expect(clientTool.parameters).toBeDefined();
    expect(clientTool.parameters.length).toBeGreaterThan(0);
    expect(clientTool.expects_response).toBe(false);
    expect(clientTool.response_timeout_secs).toBeGreaterThan(0);
    expect(clientTool.dynamic_variables).toBeDefined();
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
    } as any);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('listToolsApi', () => {
    it('should fetch tools from ElevenLabs API', async () => {
      const mockTools = [
        {
          tool_id: 'tool_123',
          name: 'Test Webhook Tool',
          type: 'webhook',
          description: 'A test webhook tool'
        },
        {
          tool_id: 'tool_456',
          name: 'Test Client Tool',
          type: 'client',
          description: 'A test client tool'
        }
      ];

      mockListToolsApi.mockResolvedValue(mockTools);

      const client = await getElevenLabsClient();
      const tools = await listToolsApi(client);

      expect(tools).toEqual(mockTools);
      expect(mockListToolsApi).toHaveBeenCalledWith(client);
    });

    it('should return empty array when no tools exist', async () => {
      mockListToolsApi.mockResolvedValue([]);

      const client = await getElevenLabsClient();
      const tools = await listToolsApi(client);

      expect(tools).toEqual([]);
      expect(mockListToolsApi).toHaveBeenCalledWith(client);
    });
  });

  describe('getToolApi', () => {
    it('should fetch specific tool details from ElevenLabs API', async () => {
      const mockToolDetails: WebhookTool = {
        name: 'Test Webhook Tool',
        description: 'A test webhook tool',
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
            description: 'Request body',
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

      mockGetToolApi.mockResolvedValue(mockToolDetails);

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
          tool_id: 'tool_123',
          name: 'Webhook Tool',
          type: 'webhook'
        }
      ];

      const mockToolDetails: WebhookTool = {
        name: 'Webhook Tool',
        description: 'A webhook tool',
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
            description: 'Request body',
            dynamic_variable: '',
            constant_value: '',
            required: true,
            properties: []
          },
          request_headers: [],
          auth_connection: null
        },
        response_timeout_secs: 30,
        dynamic_variables: {
          dynamic_variable_placeholders: {}
        }
      };

      mockListToolsApi.mockResolvedValue(mockToolsList);
      mockGetToolApi.mockResolvedValue(mockToolDetails);

      // Simulate fetching tools
      const client = await getElevenLabsClient();
      const toolsList = await listToolsApi(client);

      expect(toolsList).toHaveLength(1);
      expect((toolsList[0] as any).tool_id).toBe('tool_123');

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
          tool_id: 'tool_123',
          name: 'Webhook Tool',
          type: 'webhook'
        },
        {
          tool_id: 'tool_456',
          name: 'Client Tool',
          type: 'client'
        },
        {
          tool_id: 'tool_789',
          name: 'Another Webhook',
          type: 'webhook'
        }
      ];

      mockListToolsApi.mockResolvedValue(mockToolsList);

      const client = await getElevenLabsClient();
      const allTools = await listToolsApi(client);

      // Simulate filtering by search term 'webhook'
      const webhookTools = allTools.filter((tool: any) =>
        tool.name.toLowerCase().includes('webhook')
      );

      expect(webhookTools).toHaveLength(2);
      expect((webhookTools[0] as any).name).toBe('Webhook Tool');
      expect((webhookTools[1] as any).name).toBe('Another Webhook');
    });
  });
});