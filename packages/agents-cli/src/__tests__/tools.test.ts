import { 
  WebhookTool, 
  ClientTool
} from '../tools';
import { 
  updateToolInLock, 
  getToolFromLock, 
  calculateConfigHash,
  LockFileData
} from '../utils';

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