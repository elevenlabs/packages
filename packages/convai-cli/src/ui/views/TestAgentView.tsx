import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';
import { 
  getElevenLabsClient, 
  runAgentTestsApi, 
  getTestInvocationApi,
  getAgentApi 
} from '../../elevenlabs-api.js';
import { readAgentConfig } from '../../utils.js';
import { AgentConfig } from '../../templates.js';
import path from 'path';

interface TestRun {
  testRunId: string;
  testId: string;
  agentId: string;
  status: 'pending' | 'passed' | 'failed';
  conditionResult?: {
    success: boolean;
    message?: string;
  };
}

interface TestAgentViewProps {
  agentName: string;
  agentId: string;
  environment?: string;
  configPath?: string;
  testIds?: string[];
  onComplete?: (passed: boolean) => void;
}

export const TestAgentView: React.FC<TestAgentViewProps> = ({ 
  agentName,
  agentId,
  environment = 'prod',
  configPath,
  testIds,
  onComplete 
}) => {
  useApp();
  const [status, setStatus] = useState<'initializing' | 'running' | 'polling' | 'completed' | 'error'>('initializing');
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [testInvocationId, setTestInvocationId] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [complete, setComplete] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  useEffect(() => {
    const runTests = async () => {
      try {
        const client = await getElevenLabsClient();
        
        // Get tests to run
        let testsToRun = testIds;
        
        // If no specific test IDs provided, check for attached tests in config
        if (!testsToRun && configPath) {
          try {
            const configFilePath = path.resolve(configPath);
            const agentConfig = await readAgentConfig<AgentConfig>(configFilePath);
            
            if (agentConfig.platform_settings?.testing?.attached_tests) {
              testsToRun = agentConfig.platform_settings.testing.attached_tests.map(t => t.test_id);
            }
          } catch (error) {
            console.error('Error reading agent config:', error);
          }
        }
        
        // If still no tests, try to get them from the agent API
        if (!testsToRun || testsToRun.length === 0) {
          try {
            const agentDetails = await getAgentApi(client, agentId) as any;
            if (agentDetails.platform_settings?.testing?.attached_tests) {
              testsToRun = agentDetails.platform_settings.testing.attached_tests.map((t: any) => 
                t.test_id || t.testId
              );
            }
          } catch (error) {
            console.error('Error fetching agent details:', error);
          }
        }
        
        if (!testsToRun || testsToRun.length === 0) {
          setStatus('error');
          setErrorMessage('No tests found for this agent');
          setComplete(true);
          setTimeout(() => {
            if (onComplete) {
              onComplete(false);
            } else {
              process.exit(1);
            }
          }, 2000);
          return;
        }
        
        // Run the tests
        setStatus('running');
        const response = await runAgentTestsApi(client, agentId, testsToRun);
        setTestInvocationId(response.testInvocationId);
        
        // Initialize test runs from response if available
        if (response.testRuns && Array.isArray(response.testRuns)) {
          setTestRuns(response.testRuns as TestRun[]);
        }
        
        // Start polling for results
        setStatus('polling');
        pollForResults(client, response.testInvocationId);
        
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error?.message || 'Failed to run tests');
        setComplete(true);
        setTimeout(() => {
          if (onComplete) {
            onComplete(false);
          } else {
            process.exit(1);
          }
        }, 2000);
      }
    };
    
    const pollForResults = async (client: any, invocationId: string) => {
      const maxAttempts = 120; // 120 attempts max (up to ~5 minutes with adaptive polling)
      let attempts = 0;
      let lastCompletedCount = 0;
      let stableIterations = 0;
      
      const calculatePollInterval = (completedCount: number, totalCount: number) => {
        // Adaptive polling interval based on test progress
        const progressRate = totalCount > 0 ? completedCount / totalCount : 0;
        
        // If tests are completing, poll more frequently
        if (completedCount > lastCompletedCount) {
          stableIterations = 0;
          return 1000; // 1 second when tests are actively completing
        }
        
        // If no progress, gradually increase interval
        stableIterations++;
        
        if (progressRate === 0) {
          // Initial phase - tests haven't started completing yet
          return Math.min(2000 + (stableIterations * 500), 5000); // 2s to 5s
        } else if (progressRate < 0.5) {
          // Less than 50% complete
          return Math.min(1500 + (stableIterations * 300), 3000); // 1.5s to 3s
        } else {
          // More than 50% complete - poll frequently
          return Math.min(1000 + (stableIterations * 200), 2000); // 1s to 2s
        }
      };
      
      const poll = async () => {
        try {
          attempts++;
          setPollAttempts(attempts);
          
          const invocation = await getTestInvocationApi(client, invocationId);
          setTestRuns(invocation.testRuns);
          
          // Update progress based on completed tests
          const completedTests = invocation.testRuns.filter(
            run => run.status === 'passed' || run.status === 'failed'
          ).length;
          const totalTests = invocation.testRuns.length;
          const newProgress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;
          setProgress(newProgress);
          
          if (invocation.status === 'completed' || invocation.status === 'failed') {
            setStatus('completed');
            setComplete(true);
            
            const allPassed = invocation.testRuns.every(run => run.status === 'passed');
            const exitCode = allPassed ? 0 : 1;
            
            setTimeout(() => {
              if (onComplete) {
                onComplete(allPassed);
              } else {
                process.exit(exitCode);
              }
            }, 3000);
          } else if (attempts >= maxAttempts) {
            setStatus('error');
            setErrorMessage('Test execution timed out');
            setComplete(true);
            setTimeout(() => {
              if (onComplete) {
                onComplete(false);
              } else {
                process.exit(1);
              }
            }, 2000);
          } else {
            // Calculate next polling interval
            const nextInterval = calculatePollInterval(completedTests, totalTests);
            lastCompletedCount = completedTests;
            
            // Continue polling with adaptive interval
            setTimeout(() => poll(), nextInterval);
          }
        } catch (error: any) {
          setStatus('error');
          setErrorMessage(error?.message || 'Failed to poll test results');
          setComplete(true);
          setTimeout(() => {
            if (onComplete) {
              onComplete(false);
            } else {
              process.exit(1);
            }
          }, 2000);
        }
      };
      
      poll();
    };
    
    runTests();
  }, [agentName, agentId, environment, configPath, testIds]);

  const passedCount = testRuns.filter(run => run.status === 'passed').length;
  const failedCount = testRuns.filter(run => run.status === 'failed').length;
  const pendingCount = testRuns.filter(run => run.status === 'pending').length;
  const totalCount = testRuns.length;

  let statusMessage = '';
  let statusType: 'loading' | 'success' | 'error' | 'warning' | 'idle' = 'loading';
  
  if (status === 'initializing') {
    statusMessage = 'Initializing test run...';
    statusType = 'loading';
  } else if (status === 'running') {
    statusMessage = 'Starting test execution...';
    statusType = 'loading';
  } else if (status === 'polling') {
    statusMessage = `Running tests (attempt ${pollAttempts})...`;
    statusType = 'loading';
  } else if (status === 'completed') {
    if (failedCount === 0) {
      statusMessage = `All ${passedCount} test(s) passed!`;
      statusType = 'success';
    } else {
      statusMessage = `${failedCount} test(s) failed, ${passedCount} passed`;
      statusType = 'error';
    }
  } else if (status === 'error') {
    statusMessage = errorMessage;
    statusType = 'error';
  }

  return (
    <App 
      title="ElevenLabs Agent Test Runner" 
      subtitle={`Testing agent: ${agentName} (${environment})`}
      showOverlay={!complete}
    >
      <Box flexDirection="column">
        {/* Summary */}
        <Box marginBottom={2}>
          <StatusCard
            title="Test Execution"
            status={statusType}
            message={statusMessage}
            details={testInvocationId ? [`Invocation ID: ${testInvocationId}`] : []}
          />
        </Box>

        {/* Progress Bar */}
        {status === 'polling' && (
          <Box marginBottom={2}>
            <ProgressFlow 
              value={progress} 
              label="Test Progress"
              showWave={true}
            />
          </Box>
        )}

        {/* Test Statistics */}
        {totalCount > 0 && (
          <Box marginBottom={2}>
            <StatusCard
              title="Test Statistics"
              status="idle"
              message={`Total: ${totalCount} | Passed: ${passedCount} | Failed: ${failedCount} | Pending: ${pendingCount}`}
            />
          </Box>
        )}

        {/* Individual Test Results */}
        {testRuns.length > 0 && (
          <Box flexDirection="column" marginTop={2}>
            <Box marginBottom={1}>
              <Text color={theme.colors.text.primary} bold>
                Test Results:
              </Text>
            </Box>
            {testRuns.map((run, index) => {
              let testStatus: 'loading' | 'success' | 'error' | 'idle' = 'idle';
              let testMessage = '';
              
              if (run.status === 'pending') {
                testStatus = 'loading';
                testMessage = 'Running...';
              } else if (run.status === 'passed') {
                testStatus = 'success';
                testMessage = 'Passed';
              } else if (run.status === 'failed') {
                testStatus = 'error';
                testMessage = run.conditionResult?.message || 'Failed';
              }
              
              return (
                <Box key={run.testRunId || index} marginBottom={1}>
                  <StatusCard
                    title={`Test ${index + 1}`}
                    status={testStatus}
                    message={testMessage}
                    details={[`Test ID: ${run.testId}`]}
                    borderStyle="single"
                  />
                </Box>
              );
            })}
          </Box>
        )}

        {/* Completion Message */}
        {complete && (
          <Box marginTop={2} flexDirection="column">
            {failedCount === 0 ? (
              <Text color={theme.colors.success} bold>
                ✓ All tests passed successfully!
              </Text>
            ) : (
              <Text color={theme.colors.error} bold>
                ✗ {failedCount} test(s) failed
              </Text>
            )}
            {status !== 'error' && (
              <Box marginTop={1}>
                <Text color={theme.colors.text.secondary}>
                  Exit code: {failedCount === 0 ? '0' : '1'}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </App>
  );
};

export default TestAgentView;