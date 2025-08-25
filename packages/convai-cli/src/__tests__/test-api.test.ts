import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  runAgentTestsApi, 
  getTestInvocationApi, 
  getTestDetailsApi 
} from '../elevenlabs-api.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Mock the ElevenLabsClient
jest.mock('@elevenlabs/elevenlabs-js');

describe('Test API Functions', () => {
  let mockClient: jest.Mocked<ElevenLabsClient>;
  let mockRunTests: any;
  let mockGetInvocation: any;
  let mockGetTest: any;

  beforeEach(() => {
    // Setup mock functions
    mockRunTests = jest.fn().mockImplementation(() => Promise.resolve({}));
    mockGetInvocation = jest.fn().mockImplementation(() => Promise.resolve({}));
    mockGetTest = jest.fn().mockImplementation(() => Promise.resolve({}));

    // Create mock client with nested structure
    mockClient = {
      conversationalAi: {
        agents: {
          runTests: mockRunTests
        },
        tests: {
          invocations: {
            get: mockGetInvocation
          },
          get: mockGetTest
        }
      }
    } as unknown as jest.Mocked<ElevenLabsClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runAgentTestsApi', () => {
    it('should run tests for an agent with specific test IDs', async () => {
      const mockResponse = {
        testInvocationId: 'inv_123',
        testRuns: [
          { testId: 'test_1', status: 'pending' },
          { testId: 'test_2', status: 'pending' }
        ]
      };

      mockRunTests.mockResolvedValue(mockResponse);

      const result = await runAgentTestsApi(
        mockClient, 
        'agent_123', 
        ['test_1', 'test_2']
      );

      expect(mockRunTests).toHaveBeenCalledWith('agent_123', {
        tests: [
          { testId: 'test_1' },
          { testId: 'test_2' }
        ]
      });

      expect(result).toEqual({
        testInvocationId: 'inv_123',
        testRuns: mockResponse.testRuns
      });
    });

    it('should run all tests when no specific test IDs provided', async () => {
      const mockResponse = {
        testInvocationId: 'inv_456',
        testRuns: []
      };

      mockRunTests.mockResolvedValue(mockResponse);

      const result = await runAgentTestsApi(mockClient, 'agent_456');

      expect(mockRunTests).toHaveBeenCalledWith('agent_456', {
        tests: []
      });

      expect(result).toEqual({
        testInvocationId: 'inv_456',
        testRuns: []
      });
    });

    it('should handle response with snake_case fields', async () => {
      const mockResponse = {
        test_invocation_id: 'inv_789',
        test_runs: [
          { test_id: 'test_3', status: 'pending' }
        ]
      };

      mockRunTests.mockResolvedValue(mockResponse);

      const result = await runAgentTestsApi(mockClient, 'agent_789', ['test_3']);

      expect(result.testInvocationId).toBe('inv_789');
    });

    it('should handle errors from the SDK', async () => {
      const error = new Error('API Error: Invalid agent ID');
      mockRunTests.mockRejectedValue(error);

      await expect(
        runAgentTestsApi(mockClient, 'invalid_agent', ['test_1'])
      ).rejects.toThrow('API Error: Invalid agent ID');
    });
  });

  describe('getTestInvocationApi', () => {
    it('should get test invocation with all tests passed', async () => {
      const mockResponse = {
        testInvocationId: 'inv_123',
        testRuns: [
          {
            testRunId: 'run_1',
            testId: 'test_1',
            agentId: 'agent_123',
            status: 'passed',
            conditionResult: {
              success: true,
              message: 'All conditions met'
            }
          },
          {
            testRunId: 'run_2',
            testId: 'test_2',
            agentId: 'agent_123',
            status: 'passed'
          }
        ]
      };

      mockGetInvocation.mockResolvedValue(mockResponse);

      const result = await getTestInvocationApi(mockClient, 'inv_123');

      expect(mockGetInvocation).toHaveBeenCalledWith('inv_123');
      expect(result.status).toBe('completed');
      expect(result.testRuns).toHaveLength(2);
      expect(result.testRuns[0].status).toBe('passed');
    });

    it('should get test invocation with failed tests', async () => {
      const mockResponse = {
        testInvocationId: 'inv_456',
        testRuns: [
          {
            testRunId: 'run_3',
            testId: 'test_3',
            agentId: 'agent_456',
            status: 'passed'
          },
          {
            testRunId: 'run_4',
            testId: 'test_4',
            agentId: 'agent_456',
            status: 'failed',
            conditionResult: {
              success: false,
              message: 'Expected response not received'
            }
          }
        ]
      };

      mockGetInvocation.mockResolvedValue(mockResponse);

      const result = await getTestInvocationApi(mockClient, 'inv_456');

      expect(result.status).toBe('failed');
      expect(result.testRuns[1].status).toBe('failed');
      expect(result.testRuns[1].conditionResult?.success).toBe(false);
    });

    it('should get test invocation with pending tests', async () => {
      const mockResponse = {
        testInvocationId: 'inv_789',
        testRuns: [
          {
            testRunId: 'run_5',
            testId: 'test_5',
            agentId: 'agent_789',
            status: 'passed'
          },
          {
            testRunId: 'run_6',
            testId: 'test_6',
            agentId: 'agent_789',
            status: 'pending'
          }
        ]
      };

      mockGetInvocation.mockResolvedValue(mockResponse);

      const result = await getTestInvocationApi(mockClient, 'inv_789');

      expect(result.status).toBe('pending');
      expect(result.testRuns.some(run => run.status === 'pending')).toBe(true);
    });

    it('should handle snake_case field names', async () => {
      const mockResponse = {
        test_invocation_id: 'inv_snake',
        test_runs: [
          {
            test_run_id: 'run_snake',
            test_id: 'test_snake',
            agent_id: 'agent_snake',
            status: 'passed',
            condition_result: {
              success: true,
              message: 'Test passed'
            }
          }
        ]
      };

      mockGetInvocation.mockResolvedValue(mockResponse);

      const result = await getTestInvocationApi(mockClient, 'inv_snake');

      expect(result.testInvocationId).toBe('inv_snake');
      expect(result.testRuns[0].testRunId).toBe('run_snake');
      expect(result.testRuns[0].conditionResult?.success).toBe(true);
    });

    it('should handle errors from the SDK', async () => {
      const error = new Error('Test invocation not found');
      mockGetInvocation.mockRejectedValue(error);

      await expect(
        getTestInvocationApi(mockClient, 'invalid_inv')
      ).rejects.toThrow('Test invocation not found');
    });
  });

  describe('getTestDetailsApi', () => {
    it('should get test details successfully', async () => {
      const mockResponse = {
        id: 'test_123',
        name: 'Customer Service Test',
        successCondition: 'Agent must greet the customer politely',
        chatHistory: [
          { role: 'user', message: 'Hello' },
          { role: 'agent', message: 'Hi! How can I help you today?' }
        ]
      };

      mockGetTest.mockResolvedValue(mockResponse);

      const result = await getTestDetailsApi(mockClient, 'test_123');

      expect(mockGetTest).toHaveBeenCalledWith('test_123');
      expect(result).toEqual({
        id: 'test_123',
        name: 'Customer Service Test',
        successCondition: 'Agent must greet the customer politely',
        chatHistory: mockResponse.chatHistory
      });
    });

    it('should handle missing optional fields', async () => {
      const mockResponse = {
        id: 'test_456',
        name: 'Basic Test'
      };

      mockGetTest.mockResolvedValue(mockResponse);

      const result = await getTestDetailsApi(mockClient, 'test_456');

      expect(result.id).toBe('test_456');
      expect(result.name).toBe('Basic Test');
      expect(result.successCondition).toBeUndefined();
      expect(result.chatHistory).toEqual([]);
    });

    it('should handle snake_case field names', async () => {
      const mockResponse = {
        id: 'test_789',
        name: 'Snake Case Test',
        success_condition: 'Test condition',
        chat_history: [
          { role: 'user', message: 'Test message' }
        ]
      };

      mockGetTest.mockResolvedValue(mockResponse);

      const result = await getTestDetailsApi(mockClient, 'test_789');

      expect(result.successCondition).toBe('Test condition');
      expect(result.chatHistory).toHaveLength(1);
    });

    it('should use testId as fallback for missing id', async () => {
      const mockResponse = {
        name: 'Test without ID'
      };

      mockGetTest.mockResolvedValue(mockResponse);

      const result = await getTestDetailsApi(mockClient, 'test_fallback');

      expect(result.id).toBe('test_fallback');
    });

    it('should use default name for missing name field', async () => {
      const mockResponse = {
        id: 'test_noname'
      };

      mockGetTest.mockResolvedValue(mockResponse);

      const result = await getTestDetailsApi(mockClient, 'test_noname');

      expect(result.name).toBe('Unnamed Test');
    });

    it('should handle errors from the SDK', async () => {
      const error = new Error('Test not found');
      mockGetTest.mockRejectedValue(error);

      await expect(
        getTestDetailsApi(mockClient, 'invalid_test')
      ).rejects.toThrow('Test not found');
    });
  });

  describe('Adaptive Polling Logic', () => {
    it('should calculate correct polling intervals based on progress', () => {
      // This tests the polling interval calculation logic
      const calculatePollInterval = (completedCount: number, totalCount: number, lastCompletedCount: number, stableIterations: number) => {
        const progressRate = totalCount > 0 ? completedCount / totalCount : 0;
        
        if (completedCount > lastCompletedCount) {
          return 1000; // 1 second when tests are actively completing
        }
        
        if (progressRate === 0) {
          return Math.min(2000 + (stableIterations * 500), 5000); // 2s to 5s
        } else if (progressRate < 0.5) {
          return Math.min(1500 + (stableIterations * 300), 3000); // 1.5s to 3s
        } else {
          return Math.min(1000 + (stableIterations * 200), 2000); // 1s to 2s
        }
      };

      // Test active completion
      expect(calculatePollInterval(5, 10, 4, 0)).toBe(1000);
      
      // Test no progress at start
      expect(calculatePollInterval(0, 10, 0, 0)).toBe(2000);
      expect(calculatePollInterval(0, 10, 0, 5)).toBe(4500);
      expect(calculatePollInterval(0, 10, 0, 10)).toBe(5000); // Max cap
      
      // Test mid-progress (< 50%)
      expect(calculatePollInterval(3, 10, 3, 0)).toBe(1500);
      expect(calculatePollInterval(3, 10, 3, 3)).toBe(2400);
      expect(calculatePollInterval(3, 10, 3, 10)).toBe(3000); // Max cap
      
      // Test late stage (> 50%)
      expect(calculatePollInterval(7, 10, 7, 0)).toBe(1000);
      expect(calculatePollInterval(7, 10, 7, 3)).toBe(1600);
      expect(calculatePollInterval(7, 10, 7, 10)).toBe(2000); // Max cap
    });
  });
});