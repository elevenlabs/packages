import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';

interface TestRun {
  test_run_id: string;
  test_invocation_id: string;
  agent_id: string;
  status: 'pending' | 'passed' | 'failed';
  test_id: string;
  test_name: string;
  condition_result?: {
    result: 'success' | 'failure';
    rationale?: {
      messages: string[];
      summary: string;
    };
  };
  last_updated_at_unix?: number;
}

interface TestInvocation {
  id: string;
  test_runs: TestRun[];
  created_at: number;
}

interface TestViewProps {
  agentName: string;
  agentId: string;
  testIds: string[];
  onComplete?: () => void;
}

export const TestView: React.FC<TestViewProps> = ({
  agentName,
  agentId,
  testIds,
  onComplete
}) => {
  const { exit } = useApp();
  const [testInvocation, setTestInvocation] = useState<TestInvocation | null>(null);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  // Start test execution
  useEffect(() => {
    const startTests = async () => {
      try {
        const { getElevenLabsClient, runTestsOnAgentApi } = await import('../../elevenlabs-api.js');
        const client = await getElevenLabsClient();

        const result = await runTestsOnAgentApi(client, agentId, testIds) as TestInvocation;
        setTestInvocation(result);
        setTestRuns(result.test_runs || []);
        setPolling(true);
      } catch (err) {
        setError(`Failed to start tests: ${err}`);
      }
    };

    startTests();
  }, [agentId, testIds]);

  // Poll for test results
  useEffect(() => {
    if (!polling || !testInvocation) return;

    const pollInterval = setInterval(async () => {
      try {
        const { getElevenLabsClient, getTestInvocationApi } = await import('../../elevenlabs-api.js');
        const client = await getElevenLabsClient();

        const result = await getTestInvocationApi(client, testInvocation.id) as TestInvocation;
        setTestRuns(result.test_runs || []);

        // Check if all tests are complete
        const allComplete = result.test_runs.every(run =>
          run.status === 'passed' || run.status === 'failed'
        );

        if (allComplete) {
          setPolling(false);
          setComplete(true);

          setTimeout(() => {
            if (onComplete) {
              onComplete();
            } else {
              exit();
            }
          }, 3000);
        }
      } catch (err) {
        setError(`Failed to poll test results: ${err}`);
        setPolling(false);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [polling, testInvocation, onComplete, exit]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'pending':
        return theme.colors.warning;
      default:
        return theme.colors.text.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return '✓';
      case 'failed':
        return '✗';
      case 'pending':
        return '⏳';
      default:
        return '•';
    }
  };

  if (error) {
    return (
      <App>
        <Box flexDirection="column" padding={1}>
          <StatusCard
            title="Test Execution Error"
            status="error"
            details={[
              `Agent: ${agentName}`,
              `Error: ${error}`
            ]}
          />
        </Box>
      </App>
    );
  }

  if (!testInvocation) {
    return (
      <App>
        <Box flexDirection="column" padding={1}>
          <StatusCard
            title="Starting Tests"
            status="loading"
            details={[
              `Agent: ${agentName}`,
              `Tests: ${testIds.length} test(s)`
            ]}
          />
        </Box>
      </App>
    );
  }

  const passedCount = testRuns.filter(run => run.status === 'passed').length;
  const failedCount = testRuns.filter(run => run.status === 'failed').length;
  const pendingCount = testRuns.filter(run => run.status === 'pending').length;

  return (
    <App>
      <Box flexDirection="column" padding={1}>
        <StatusCard
          title={`Running Tests: ${agentName}`}
          status={complete ? (failedCount > 0 ? 'error' : 'success') : 'loading'}
          details={[
            `Agent ID: ${agentId}`,
            `Total Tests: ${testRuns.length}`,
            `Passed: ${passedCount}`,
            `Failed: ${failedCount}`,
            `Pending: ${pendingCount}`
          ]}
        />

        <Box marginTop={1} flexDirection="column">
          <Text color={theme.colors.accent.primary} bold>
            Test Results:
          </Text>

          {testRuns.map((testRun, index) => (
            <Box key={testRun.test_run_id} marginTop={1}>
              <Box width={3}>
                <Text color={getStatusColor(testRun.status)}>
                  {getStatusIcon(testRun.status)}
                </Text>
              </Box>

              <Box flexGrow={1}>
                <Text color={theme.colors.text.primary}>
                  {testRun.test_name || `Test ${index + 1}`}
                </Text>
              </Box>

              <Box>
                <Text color={getStatusColor(testRun.status)} bold>
                  {testRun.status.toUpperCase()}
                </Text>
              </Box>
            </Box>
          ))}
        </Box>

        {polling && (
          <Box marginTop={1}>
            <Text color={theme.colors.text.muted}>
              🔄 Polling for results every 2 seconds...
            </Text>
          </Box>
        )}

        {complete && (
          <Box marginTop={1} flexDirection="column">
            <Text color={failedCount > 0 ? theme.colors.error : theme.colors.success} bold>
              {failedCount > 0
                ? `❌ ${failedCount} test(s) failed, ${passedCount} passed`
                : `✅ All ${passedCount} test(s) passed!`}
            </Text>

            {failedCount > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text color={theme.colors.text.primary}>Failed tests:</Text>
                {testRuns
                  .filter(run => run.status === 'failed')
                  .map(run => (
                    <Box key={run.test_run_id} marginLeft={2} marginTop={1}>
                      <Text color={theme.colors.error}>
                        • {run.test_name || run.test_id}
                      </Text>
                      {run.condition_result?.rationale?.summary && (
                        <Text color={theme.colors.text.muted}>
                          {' - ' + run.condition_result.rationale.summary}
                        </Text>
                      )}
                    </Box>
                  ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </App>
  );
};

export default TestView;