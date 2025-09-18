import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  createTestApi,
  getTestApi,
  listTestsApi,
  updateTestApi,
  runTestsOnAgentApi,
  getTestInvocationApi
} from '../elevenlabs-api';

// Mock the ElevenLabs client
const mockClient = {
  conversationalAi: {
    tests: {
      create: jest.fn() as jest.MockedFunction<any>,
      get: jest.fn() as jest.MockedFunction<any>,
      list: jest.fn() as jest.MockedFunction<any>,
      update: jest.fn() as jest.MockedFunction<any>,
      invocations: {
        get: jest.fn() as jest.MockedFunction<any>
      }
    },
    agents: {
      runTests: jest.fn() as jest.MockedFunction<any>
    }
  }
};

describe('Test API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTestApi', () => {
    it('should create a test and return ID', async () => {
      const mockResponse = { id: 'test_123' };
      mockClient.conversationalAi.tests.create.mockResolvedValue(mockResponse);

      const testConfig = {
        name: 'Test Name',
        chat_history: [{ role: 'user', time_in_call_secs: 1, message: 'Hello' }],
        success_condition: 'Agent responds helpfully',
        success_examples: [{ response: 'Hi there!', type: 'success' }],
        failure_examples: [{ response: 'Error', type: 'failure' }]
      };

      const result = await createTestApi(mockClient as any, testConfig);

      expect(mockClient.conversationalAi.tests.create).toHaveBeenCalledWith(testConfig);
      expect(result).toEqual({ id: 'test_123' });
    });

    it('should handle API errors', async () => {
      mockClient.conversationalAi.tests.create.mockRejectedValue(new Error('API Error'));

      const testConfig = { name: 'Test' };

      await expect(createTestApi(mockClient as any, testConfig)).rejects.toThrow('API Error');
    });
  });

  describe('getTestApi', () => {
    it('should get test details and convert to snake_case', async () => {
      const mockResponse = {
        id: 'test_123',
        name: 'Test Name',
        chatHistory: [{ role: 'user', timeInCallSecs: 1 }],
        successCondition: 'Success condition'
      };

      mockClient.conversationalAi.tests.get.mockResolvedValue(mockResponse);

      const result = await getTestApi(mockClient as any, 'test_123');

      expect(mockClient.conversationalAi.tests.get).toHaveBeenCalledWith('test_123');
      expect(result).toEqual({
        id: 'test_123',
        name: 'Test Name',
        chat_history: [{ role: 'user', time_in_call_secs: 1 }],
        success_condition: 'Success condition'
      });
    });

    it('should handle missing test', async () => {
      mockClient.conversationalAi.tests.get.mockRejectedValue(new Error('Test not found'));

      await expect(getTestApi(mockClient as any, 'nonexistent')).rejects.toThrow('Test not found');
    });
  });

  describe('listTestsApi', () => {
    it('should list tests with default page size', async () => {
      const mockResponse = {
        tests: [
          { id: 'test_1', name: 'Test 1' },
          { id: 'test_2', name: 'Test 2' }
        ]
      };

      mockClient.conversationalAi.tests.list.mockResolvedValue(mockResponse);

      const result = await listTestsApi(mockClient as any);

      expect(mockClient.conversationalAi.tests.list).toHaveBeenCalledWith({ pageSize: 30 });
      expect(result).toEqual(mockResponse.tests);
    });

    it('should list tests with custom page size', async () => {
      const mockResponse = { tests: [] };
      mockClient.conversationalAi.tests.list.mockResolvedValue(mockResponse);

      await listTestsApi(mockClient as any, 50);

      expect(mockClient.conversationalAi.tests.list).toHaveBeenCalledWith({ pageSize: 50 });
    });

    it('should handle empty test list', async () => {
      const mockResponse = {};
      mockClient.conversationalAi.tests.list.mockResolvedValue(mockResponse);

      const result = await listTestsApi(mockClient as any);

      expect(result).toEqual([]);
    });
  });

  describe('updateTestApi', () => {
    it('should update test and convert response to snake_case', async () => {
      const mockResponse = {
        id: 'test_123',
        name: 'Updated Test',
        chatHistory: [{ role: 'user', timeInCallSecs: 1 }]
      };

      mockClient.conversationalAi.tests.update.mockResolvedValue(mockResponse);

      const testConfig = {
        name: 'Updated Test',
        chat_history: [{ role: 'user', time_in_call_secs: 1 }]
      };

      const result = await updateTestApi(mockClient as any, 'test_123', testConfig);

      expect(mockClient.conversationalAi.tests.update).toHaveBeenCalledWith('test_123', testConfig);
      expect(result).toEqual({
        id: 'test_123',
        name: 'Updated Test',
        chat_history: [{ role: 'user', time_in_call_secs: 1 }]
      });
    });
  });

  describe('runTestsOnAgentApi', () => {
    it('should run tests on agent and convert response to snake_case', async () => {
      const mockResponse = {
        id: 'invocation_123',
        testRuns: [
          {
            testRunId: 'run_1',
            testId: 'test_1',
            status: 'pending'
          }
        ],
        createdAt: 1234567890
      };

      mockClient.conversationalAi.agents.runTests.mockResolvedValue(mockResponse);

      const testIds = ['test_1', 'test_2'];
      const result = await runTestsOnAgentApi(mockClient as any, 'agent_123', testIds);

      expect(mockClient.conversationalAi.agents.runTests).toHaveBeenCalledWith('agent_123', {
        tests: [
          { test_id: 'test_1' },
          { test_id: 'test_2' }
        ]
      });

      expect(result).toEqual({
        id: 'invocation_123',
        test_runs: [
          {
            test_run_id: 'run_1',
            test_id: 'test_1',
            status: 'pending'
          }
        ],
        created_at: 1234567890
      });
    });

    it('should include agent config override when provided', async () => {
      const mockResponse = { id: 'invocation_123', testRuns: [] };
      mockClient.conversationalAi.agents.runTests.mockResolvedValue(mockResponse);

      const testIds = ['test_1'];
      const agentConfigOverride = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: 'Custom prompt',
              temperature: 0.5
            }
          }
        }
      };

      await runTestsOnAgentApi(mockClient as any, 'agent_123', testIds, agentConfigOverride);

      expect(mockClient.conversationalAi.agents.runTests).toHaveBeenCalledWith('agent_123', {
        tests: [{ test_id: 'test_1' }],
        agent_config_override: agentConfigOverride
      });
    });

    it('should handle empty test IDs array', async () => {
      const mockResponse = { id: 'invocation_123', testRuns: [] };
      mockClient.conversationalAi.agents.runTests.mockResolvedValue(mockResponse);

      await runTestsOnAgentApi(mockClient as any, 'agent_123', []);

      expect(mockClient.conversationalAi.agents.runTests).toHaveBeenCalledWith('agent_123', {
        tests: []
      });
    });
  });

  describe('getTestInvocationApi', () => {
    it('should get test invocation results and convert to snake_case', async () => {
      const mockResponse = {
        id: 'invocation_123',
        testRuns: [
          {
            testRunId: 'run_1',
            testInvocationId: 'invocation_123',
            agentId: 'agent_123',
            status: 'passed',
            testId: 'test_1',
            testName: 'Test 1',
            conditionResult: {
              result: 'success',
              rationale: {
                messages: ['Good response'],
                summary: 'Test passed'
              }
            },
            lastUpdatedAtUnix: 1234567890
          }
        ],
        createdAt: 1234567890
      };

      mockClient.conversationalAi.tests.invocations.get.mockResolvedValue(mockResponse);

      const result = await getTestInvocationApi(mockClient as any, 'invocation_123');

      expect(mockClient.conversationalAi.tests.invocations.get).toHaveBeenCalledWith('invocation_123');
      expect(result).toEqual({
        id: 'invocation_123',
        test_runs: [
          {
            test_run_id: 'run_1',
            test_invocation_id: 'invocation_123',
            agent_id: 'agent_123',
            status: 'passed',
            test_id: 'test_1',
            test_name: 'Test 1',
            condition_result: {
              result: 'success',
              rationale: {
                messages: ['Good response'],
                summary: 'Test passed'
              }
            },
            last_updated_at_unix: 1234567890
          }
        ],
        created_at: 1234567890
      });
    });

    it('should handle API errors', async () => {
      mockClient.conversationalAi.tests.invocations.get.mockRejectedValue(new Error('Invocation not found'));

      await expect(getTestInvocationApi(mockClient as any, 'nonexistent')).rejects.toThrow('Invocation not found');
    });
  });

  describe('Error handling', () => {
    it('should propagate network errors', async () => {
      mockClient.conversationalAi.tests.create.mockRejectedValue(new Error('Network error'));

      await expect(createTestApi(mockClient as any, {})).rejects.toThrow('Network error');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).statusCode = 401;
      mockClient.conversationalAi.tests.list.mockRejectedValue(authError);

      await expect(listTestsApi(mockClient as any)).rejects.toThrow('Unauthorized');
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).statusCode = 429;
      mockClient.conversationalAi.agents.runTests.mockRejectedValue(rateLimitError);

      await expect(runTestsOnAgentApi(mockClient as any, 'agent_123', ['test_1'])).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Data transformation', () => {
    it('should properly transform camelCase to snake_case in responses', async () => {
      const camelCaseResponse = {
        testId: 'test_123',
        testName: 'Test Name',
        chatHistory: [
          {
            role: 'user',
            timeInCallSecs: 1,
            agentMetadata: {
              agentId: 'agent_123',
              workflowNodeId: 'node_456'
            }
          }
        ],
        successCondition: 'Success condition',
        toolCallParameters: {
          referencedTool: {
            toolId: 'tool_789',
            toolType: 'webhook'
          }
        }
      };

      mockClient.conversationalAi.tests.get.mockResolvedValue(camelCaseResponse);

      const result = await getTestApi(mockClient as any, 'test_123');

      expect(result).toEqual({
        test_id: 'test_123',
        test_name: 'Test Name',
        chat_history: [
          {
            role: 'user',
            time_in_call_secs: 1,
            agent_metadata: {
              agent_id: 'agent_123',
              workflow_node_id: 'node_456'
            }
          }
        ],
        success_condition: 'Success condition',
        tool_call_parameters: {
          referenced_tool: {
            tool_id: 'tool_789',
            tool_type: 'webhook'
          }
        }
      });
    });

    it('should handle nested arrays and objects in transformation', async () => {
      const complexResponse = {
        testRuns: [
          {
            agentResponses: [
              {
                toolCalls: [
                  {
                    requestId: 'req_1',
                    toolName: 'weather',
                    paramsAsJson: '{"city": "NY"}'
                  }
                ]
              }
            ]
          }
        ]
      };

      mockClient.conversationalAi.tests.invocations.get.mockResolvedValue(complexResponse);

      const result = await getTestInvocationApi(mockClient as any, 'inv_123');

      expect(result).toEqual({
        test_runs: [
          {
            agent_responses: [
              {
                tool_calls: [
                  {
                    request_id: 'req_1',
                    tool_name: 'weather',
                    params_as_json: '{"city": "NY"}'
                  }
                ]
              }
            ]
          }
        ]
      });
    });
  });
});