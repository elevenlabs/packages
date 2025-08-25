import React from 'react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render } from 'ink-testing-library';
import { TestAgentView } from '../ui/views/TestAgentView.js';
import { TestView } from '../ui/views/TestView.js';
import * as elevenLabsApi from '../elevenlabs-api.js';
import * as utils from '../utils.js';

// Mock the API functions
jest.mock('../elevenlabs-api.js');
jest.mock('../utils.js');

describe('Test Views', () => {
  const mockGetElevenLabsClient = jest.mocked(elevenLabsApi.getElevenLabsClient);
  const mockRunAgentTestsApi = jest.mocked(elevenLabsApi.runAgentTestsApi);
  const mockGetTestInvocationApi = jest.mocked(elevenLabsApi.getTestInvocationApi);
  const mockGetAgentApi = jest.mocked(elevenLabsApi.getAgentApi);
  const mockReadAgentConfig = jest.mocked(utils.readAgentConfig);
  const mockLoadLockFile = jest.mocked(utils.loadLockFile);
  const mockGetAgentFromLock = jest.mocked(utils.getAgentFromLock);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('TestAgentView', () => {
    it('should display initial loading state', () => {
      mockGetElevenLabsClient.mockResolvedValue({} as any);
      
      const { lastFrame } = render(
        <TestAgentView 
          agentName="test-agent"
          agentId="agent_123"
          environment="prod"
        />
      );

      expect(lastFrame()).toContain('Initializing test run');
      expect(lastFrame()).toContain('test-agent');
      expect(lastFrame()).toContain('prod');
    });

    it('should run tests and show progress', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockRunAgentTestsApi.mockResolvedValue({
        testInvocationId: 'inv_123',
        testRuns: [
          { testId: 'test_1', status: 'pending' },
          { testId: 'test_2', status: 'pending' }
        ]
      });

      mockGetTestInvocationApi
        .mockResolvedValueOnce({
          testInvocationId: 'inv_123',
          status: 'pending',
          testRuns: [
            { testRunId: 'run_1', testId: 'test_1', agentId: 'agent_123', status: 'pending' },
            { testRunId: 'run_2', testId: 'test_2', agentId: 'agent_123', status: 'pending' }
          ]
        })
        .mockResolvedValueOnce({
          testInvocationId: 'inv_123',
          status: 'completed',
          testRuns: [
            { testRunId: 'run_1', testId: 'test_1', agentId: 'agent_123', status: 'passed' },
            { testRunId: 'run_2', testId: 'test_2', agentId: 'agent_123', status: 'passed' }
          ]
        });

      const { lastFrame } = render(
        <TestAgentView 
          agentName="test-agent"
          agentId="agent_123"
          testIds={['test_1', 'test_2']}
        />
      );

      // Wait for initial render and API calls
      await jest.runOnlyPendingTimersAsync();
      
      expect(mockRunAgentTestsApi).toHaveBeenCalledWith(
        mockClient,
        'agent_123',
        ['test_1', 'test_2']
      );

      // Advance timers for polling
      await jest.advanceTimersByTimeAsync(2000);
      
      const frame = lastFrame();
      expect(frame).toContain('Test Progress');
    });

    it('should handle test failures', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockRunAgentTestsApi.mockResolvedValue({
        testInvocationId: 'inv_456',
        testRuns: [{ testId: 'test_fail', status: 'pending' }]
      });

      mockGetTestInvocationApi.mockResolvedValue({
        testInvocationId: 'inv_456',
        status: 'failed',
        testRuns: [{
          testRunId: 'run_fail',
          testId: 'test_fail',
          agentId: 'agent_456',
          status: 'failed',
          conditionResult: {
            success: false,
            message: 'Assertion failed'
          }
        }]
      });

      const onComplete = jest.fn();
      
      render(
        <TestAgentView 
          agentName="test-agent"
          agentId="agent_456"
          testIds={['test_fail']}
          onComplete={onComplete}
        />
      );

      await jest.runOnlyPendingTimersAsync();
      await jest.advanceTimersByTimeAsync(5000);

      expect(onComplete).toHaveBeenCalledWith(false);
    });

    it('should load attached tests from config', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockReadAgentConfig.mockResolvedValue({
        platform_settings: {
          testing: {
            attached_tests: [
              { test_id: 'attached_1' },
              { test_id: 'attached_2' }
            ]
          }
        }
      } as any);

      mockRunAgentTestsApi.mockResolvedValue({
        testInvocationId: 'inv_789',
        testRuns: []
      });

      mockGetTestInvocationApi.mockResolvedValue({
        testInvocationId: 'inv_789',
        status: 'completed',
        testRuns: []
      });

      render(
        <TestAgentView 
          agentName="test-agent"
          agentId="agent_789"
          configPath="/path/to/config.json"
        />
      );

      await jest.runOnlyPendingTimersAsync();

      expect(mockRunAgentTestsApi).toHaveBeenCalledWith(
        mockClient,
        'agent_789',
        ['attached_1', 'attached_2']
      );
    });

    it('should handle no tests found error', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockReadAgentConfig.mockResolvedValue({
        platform_settings: {}
      } as any);

      mockGetAgentApi.mockResolvedValue({
        platform_settings: {}
      } as any);

      const onComplete = jest.fn();

      const { lastFrame } = render(
        <TestAgentView 
          agentName="test-agent"
          agentId="agent_no_tests"
          configPath="/path/to/config.json"
          onComplete={onComplete}
        />
      );

      await jest.runOnlyPendingTimersAsync();

      expect(lastFrame()).toContain('No tests found');
      expect(onComplete).toHaveBeenCalledWith(false);
    });
  });

  describe('TestView', () => {
    it('should load and test multiple agents', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockReadAgentConfig.mockResolvedValue({
        agents: [
          {
            name: 'agent-1',
            environments: {
              prod: { config: 'config1.json' }
            }
          },
          {
            name: 'agent-2',
            config: 'config2.json'
          }
        ]
      } as any);

      mockLoadLockFile.mockResolvedValue({
        agents: [
          { name: 'agent-1', environment: 'prod', id: 'id_1' },
          { name: 'agent-2', environment: 'prod', id: 'id_2' }
        ]
      } as any);

      mockGetAgentFromLock
        .mockReturnValueOnce({ id: 'id_1' } as any)
        .mockReturnValueOnce({ id: 'id_2' } as any);

      const { lastFrame } = render(
        <TestView environment="prod" />
      );

      await jest.runOnlyPendingTimersAsync();

      const frame = lastFrame();
      expect(frame).toContain('agent-1');
      expect(frame).toContain('agent-2');
    });

    it('should skip agents without tests', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockReadAgentConfig
        .mockResolvedValueOnce({
          agents: [
            { name: 'agent-with-tests', config: 'with-tests.json' },
            { name: 'agent-without-tests', config: 'without-tests.json' }
          ]
        } as any)
        .mockResolvedValueOnce({
          platform_settings: {
            testing: {
              attached_tests: [{ test_id: 'test_1' }]
            }
          }
        } as any)
        .mockResolvedValueOnce({
          platform_settings: {}
        } as any);

      mockLoadLockFile.mockResolvedValue({
        agents: [
          { name: 'agent-with-tests', environment: 'prod', id: 'id_1' },
          { name: 'agent-without-tests', environment: 'prod', id: 'id_2' }
        ]
      } as any);

      mockGetAgentFromLock
        .mockReturnValueOnce({ id: 'id_1' } as any)
        .mockReturnValueOnce({ id: 'id_2' } as any);

      mockGetAgentApi.mockResolvedValue({
        platform_settings: {}
      } as any);

      const { lastFrame } = render(
        <TestView environment="prod" />
      );

      await jest.runOnlyPendingTimersAsync();

      const frame = lastFrame();
      expect(frame).toContain('No tests configured');
    });

    it('should handle environment filtering', async () => {
      mockReadAgentConfig.mockResolvedValue({
        agents: [
          {
            name: 'multi-env-agent',
            environments: {
              prod: { config: 'prod.json' },
              dev: { config: 'dev.json' }
            }
          }
        ]
      } as any);

      mockLoadLockFile.mockResolvedValue({
        agents: [
          { name: 'multi-env-agent', environment: 'prod', id: 'prod_id' },
          { name: 'multi-env-agent', environment: 'dev', id: 'dev_id' }
        ]
      } as any);

      mockGetAgentFromLock.mockReturnValue({ id: 'dev_id' } as any);

      const { lastFrame } = render(
        <TestView agentName="multi-env-agent" environment="dev" />
      );

      await jest.runOnlyPendingTimersAsync();

      const frame = lastFrame();
      expect(frame).toContain('dev');
    });

    it('should show overall test results', async () => {
      const mockClient = {} as any;
      mockGetElevenLabsClient.mockResolvedValue(mockClient);
      
      mockReadAgentConfig.mockResolvedValue({
        agents: [
          { name: 'agent-pass', config: 'pass.json' },
          { name: 'agent-fail', config: 'fail.json' }
        ]
      } as any);

      mockLoadLockFile.mockResolvedValue({
        agents: [
          { name: 'agent-pass', environment: 'prod', id: 'pass_id' },
          { name: 'agent-fail', environment: 'prod', id: 'fail_id' }
        ]
      } as any);

      mockGetAgentFromLock
        .mockReturnValueOnce({ id: 'pass_id' } as any)
        .mockReturnValueOnce({ id: 'fail_id' } as any);

      // Mock agent configs with tests
      mockReadAgentConfig
        .mockResolvedValueOnce({
          agents: [
            { name: 'agent-pass', config: 'pass.json' },
            { name: 'agent-fail', config: 'fail.json' }
          ]
        } as any)
        .mockResolvedValueOnce({
          platform_settings: {
            testing: {
              attached_tests: [{ test_id: 'test_pass' }]
            }
          }
        } as any)
        .mockResolvedValueOnce({
          platform_settings: {
            testing: {
              attached_tests: [{ test_id: 'test_fail' }]
            }
          }
        } as any);

      mockRunAgentTestsApi
        .mockResolvedValueOnce({
          testInvocationId: 'inv_pass',
          testRuns: []
        })
        .mockResolvedValueOnce({
          testInvocationId: 'inv_fail',
          testRuns: []
        });

      mockGetTestInvocationApi
        .mockResolvedValueOnce({
          testInvocationId: 'inv_pass',
          status: 'completed',
          testRuns: [
            { testRunId: 'run_pass', testId: 'test_pass', agentId: 'pass_id', status: 'passed' }
          ]
        })
        .mockResolvedValueOnce({
          testInvocationId: 'inv_fail',
          status: 'failed',
          testRuns: [
            { testRunId: 'run_fail', testId: 'test_fail', agentId: 'fail_id', status: 'failed' }
          ]
        });

      const onComplete = jest.fn();

      render(
        <TestView environment="prod" onComplete={onComplete} />
      );

      await jest.runOnlyPendingTimersAsync();
      await jest.advanceTimersByTimeAsync(10000);

      // The view should complete with overall failure
      expect(onComplete).toHaveBeenCalled();
    });
  });
});