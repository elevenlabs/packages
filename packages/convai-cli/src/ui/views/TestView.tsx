import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';
import { readAgentConfig, loadLockFile, getAgentFromLock } from '../../utils.js';
import { AgentConfig } from '../../templates.js';
import { 
  getElevenLabsClient, 
  runAgentTestsApi, 
  getTestInvocationApi,
  getAgentApi 
} from '../../elevenlabs-api.js';
import path from 'path';
import fs from 'fs-extra';

interface AgentDefinition {
  name: string;
  environments?: Record<string, { config: string }>;
  config?: string;
}

interface AgentsConfig {
  agents: AgentDefinition[];
}

interface TestAgent {
  name: string;
  environment: string;
  configPath: string;
  agentId?: string;
  status: 'pending' | 'checking' | 'testing' | 'passed' | 'failed' | 'skipped' | 'error';
  message?: string;
  totalTests?: number;
  passedTests?: number;
  failedTests?: number;
  testInvocationId?: string;
}

interface TestViewProps {
  agentName?: string;
  environment?: string;
  onComplete?: () => void;
}

export const TestView: React.FC<TestViewProps> = ({ 
  agentName, 
  environment = 'prod',
  onComplete 
}) => {
  const { exit } = useApp();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [testAgents, setTestAgents] = useState<TestAgent[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);
  const [overallPassed, setOverallPassed] = useState(true);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        // Load agents configuration
        const agentsConfigPath = path.resolve('agents.json');
        if (!(await fs.pathExists(agentsConfigPath))) {
          throw new Error('agents.json not found');
        }
        
        const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
        
        // Load lock file to get agent IDs
        const lockFilePath = path.resolve('convai.lock');
        const lockData = await loadLockFile(lockFilePath);
        
        // Filter agents
        let agentsToProcess = agentsConfig.agents;
        if (agentName) {
          agentsToProcess = agentsConfig.agents.filter(agent => agent.name === agentName);
          if (agentsToProcess.length === 0) {
            throw new Error(`Agent '${agentName}' not found`);
          }
        }
        
        // Prepare test agents
        const preparedAgents: TestAgent[] = [];
        
        for (const agentDef of agentsToProcess) {
          // Determine environments to test
          let environmentsToTest: string[] = [];
          
          if (environment) {
            environmentsToTest = [environment];
          } else if (agentDef.environments) {
            environmentsToTest = Object.keys(agentDef.environments);
          } else if (agentDef.config) {
            environmentsToTest = ['prod'];
          }
          
          for (const env of environmentsToTest) {
            let configPath: string | undefined;
            
            if (agentDef.environments && env in agentDef.environments) {
              configPath = agentDef.environments[env].config;
            } else if (agentDef.config) {
              configPath = agentDef.config;
            }
            
            if (!configPath) continue;
            
            // Get agent ID from lock file
            const lockedAgent = getAgentFromLock(lockData, agentDef.name, env);
            
            if (!lockedAgent?.id) {
              preparedAgents.push({
                name: agentDef.name,
                environment: env,
                configPath,
                status: 'skipped',
                message: 'Agent not synced'
              });
              continue;
            }
            
            preparedAgents.push({
              name: agentDef.name,
              environment: env,
              configPath,
              agentId: lockedAgent.id,
              status: 'pending'
            });
          }
        }
        
        if (preparedAgents.length === 0) {
          throw new Error('No agents found to test');
        }
        
        setTestAgents(preparedAgents);
        
      } catch (error: any) {
        console.error('Error loading agents:', error);
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            exit();
          }
        }, 2000);
      }
    };
    
    loadAgents();
  }, [agentName, environment]);

  useEffect(() => {
    const testNextAgent = async () => {
      if (currentAgentIndex >= testAgents.length) {
        setComplete(true);
        const exitCode = overallPassed ? 0 : 1;
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            process.exit(exitCode);
          }
        }, 3000);
        return;
      }

      const agent = testAgents[currentAgentIndex];
      
      // Skip if no agent ID
      if (!agent.agentId) {
        setCurrentAgentIndex(currentAgentIndex + 1);
        return;
      }
      
      // Update agent status to checking
      setTestAgents(prev => prev.map((a, i) => 
        i === currentAgentIndex ? { ...a, status: 'checking' } : a
      ));
      
      try {
        const client = await getElevenLabsClient();
        
        // Check for tests
        let testsToRun: string[] = [];
        
        // Check config file for attached tests
        if (agent.configPath && await fs.pathExists(agent.configPath)) {
          try {
            const agentConfig = await readAgentConfig<AgentConfig>(agent.configPath);
            if (agentConfig.platform_settings?.testing?.attached_tests) {
              testsToRun = agentConfig.platform_settings.testing.attached_tests.map(t => t.test_id);
            }
          } catch (error) {
            console.error('Error reading agent config:', error);
          }
        }
        
        // If no tests in config, check agent API
        if (testsToRun.length === 0) {
          try {
            const agentDetails = await getAgentApi(client, agent.agentId) as any;
            if (agentDetails.platform_settings?.testing?.attached_tests) {
              testsToRun = agentDetails.platform_settings.testing.attached_tests.map((t: any) => 
                t.test_id || t.testId
              );
            }
          } catch (error) {
            console.error('Error fetching agent details:', error);
          }
        }
        
        if (testsToRun.length === 0) {
          // No tests to run
          setTestAgents(prev => prev.map((a, i) => 
            i === currentAgentIndex 
              ? { ...a, status: 'skipped', message: 'No tests configured' }
              : a
          ));
          setCurrentAgentIndex(currentAgentIndex + 1);
          return;
        }
        
        // Update to testing status
        setTestAgents(prev => prev.map((a, i) => 
          i === currentAgentIndex 
            ? { ...a, status: 'testing', totalTests: testsToRun.length }
            : a
        ));
        
        // Run tests
        const response = await runAgentTestsApi(client, agent.agentId, testsToRun);
        
        // Poll for results
        await pollTestResults(client, response.testInvocationId, currentAgentIndex);
        
      } catch (error: any) {
        setTestAgents(prev => prev.map((a, i) => 
          i === currentAgentIndex 
            ? { ...a, status: 'error', message: error?.message || 'Failed to run tests' }
            : a
        ));
        setOverallPassed(false);
        setCurrentAgentIndex(currentAgentIndex + 1);
      }
    };
    
    const pollTestResults = async (client: any, testInvocationId: string, agentIndex: number) => {
      const maxAttempts = 120; // Increased for adaptive polling
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
          
          const invocation = await getTestInvocationApi(client, testInvocationId);
          
          // Update test progress
          const passedTests = invocation.testRuns.filter(run => run.status === 'passed').length;
          const failedTests = invocation.testRuns.filter(run => run.status === 'failed').length;
          const completedTests = passedTests + failedTests;
          const totalTests = invocation.testRuns.length;
          
          setTestAgents(prev => prev.map((a, i) => 
            i === agentIndex 
              ? { 
                  ...a, 
                  passedTests,
                  failedTests,
                  testInvocationId
                }
              : a
          ));
          
          if (invocation.status === 'completed' || invocation.status === 'failed') {
            const allPassed = invocation.testRuns.every(run => run.status === 'passed');
            
            setTestAgents(prev => prev.map((a, i) => 
              i === agentIndex 
                ? { 
                    ...a, 
                    status: allPassed ? 'passed' : 'failed',
                    message: allPassed 
                      ? `All ${passedTests} test(s) passed`
                      : `${failedTests} test(s) failed, ${passedTests} passed`
                  }
                : a
            ));
            
            if (!allPassed) {
              setOverallPassed(false);
            }
            
            // Move to next agent
            setCurrentAgentIndex(agentIndex + 1);
            
          } else if (attempts >= maxAttempts) {
            setTestAgents(prev => prev.map((a, i) => 
              i === agentIndex 
                ? { ...a, status: 'error', message: 'Test execution timed out' }
                : a
            ));
            setOverallPassed(false);
            setCurrentAgentIndex(agentIndex + 1);
          } else {
            // Calculate next polling interval
            const nextInterval = calculatePollInterval(completedTests, totalTests);
            lastCompletedCount = completedTests;
            
            // Continue polling with adaptive interval
            setTimeout(() => poll(), nextInterval);
          }
        } catch (error: any) {
          setTestAgents(prev => prev.map((a, i) => 
            i === agentIndex 
              ? { ...a, status: 'error', message: error?.message || 'Failed to poll results' }
              : a
          ));
          setOverallPassed(false);
          setCurrentAgentIndex(agentIndex + 1);
        }
      };
      
      poll();
    };
    
    if (testAgents.length > 0 && currentAgentIndex < testAgents.length) {
      testNextAgent();
    }
  }, [currentAgentIndex, testAgents]);

  // Update overall progress
  useEffect(() => {
    if (testAgents.length > 0) {
      const completedAgents = testAgents.filter(a => 
        a.status !== 'pending' && a.status !== 'checking' && a.status !== 'testing'
      ).length;
      const newProgress = Math.round((completedAgents / testAgents.length) * 100);
      setProgress(newProgress);
    }
  }, [testAgents]);

  const totalAgents = testAgents.length;
  const passedCount = testAgents.filter(a => a.status === 'passed').length;
  const failedCount = testAgents.filter(a => a.status === 'failed').length;
  const skippedCount = testAgents.filter(a => a.status === 'skipped').length;
  const errorCount = testAgents.filter(a => a.status === 'error').length;

  return (
    <App 
      title="ElevenLabs Conversational AI Test Runner" 
      subtitle={agentName ? `Testing ${agentName}` : 'Testing all agents'}
      showOverlay={!complete}
    >
      <Box flexDirection="column">
        {/* Summary */}
        <Box marginBottom={2}>
          <StatusCard
            title="Test Progress"
            status={complete ? (overallPassed ? 'success' : 'error') : 'loading'}
            message={
              complete 
                ? `Completed: ${passedCount} passed, ${failedCount} failed, ${skippedCount} skipped, ${errorCount} errors`
                : `Processing ${currentAgentIndex + 1} of ${totalAgents} agents`
            }
          />
        </Box>

        {/* Progress Bar */}
        <ProgressFlow 
          value={progress} 
          label="Overall Progress"
          showWave={true}
        />

        {/* Agent Test Status List */}
        <Box flexDirection="column" marginTop={2}>
          <Box marginBottom={1}>
            <Text color={theme.colors.text.primary} bold>
              Agents:
            </Text>
          </Box>
          {testAgents.map((agent, index) => {
            let status: 'loading' | 'success' | 'error' | 'idle' | 'warning';
            if (agent.status === 'checking' || agent.status === 'testing') {
              status = 'loading';
            } else if (agent.status === 'passed') {
              status = 'success';
            } else if (agent.status === 'failed' || agent.status === 'error') {
              status = 'error';
            } else if (agent.status === 'skipped') {
              status = 'warning';
            } else {
              status = 'idle';
            }

            const title = `${agent.name} (${agent.environment})`;
            let message = agent.message;
            
            if (agent.status === 'testing') {
              message = `Running ${agent.totalTests || 0} test(s)...`;
              if (agent.passedTests !== undefined || agent.failedTests !== undefined) {
                message += ` (${agent.passedTests || 0} passed, ${agent.failedTests || 0} failed)`;
              }
            } else if (agent.status === 'checking') {
              message = 'Checking for tests...';
            }
            
            const details = [];
            if (agent.agentId) {
              details.push(`Agent ID: ${agent.agentId}`);
            }
            if (agent.testInvocationId) {
              details.push(`Invocation: ${agent.testInvocationId}`);
            }

            return (
              <StatusCard
                key={`${agent.name}-${agent.environment}-${index}`}
                title={title}
                status={status}
                message={message}
                details={details}
                borderStyle="single"
              />
            );
          })}
        </Box>

        {/* Completion Message */}
        {complete && (
          <Box marginTop={2} flexDirection="column">
            {overallPassed ? (
              <Text color={theme.colors.success} bold>
                ✓ All tests passed successfully!
              </Text>
            ) : (
              <Text color={theme.colors.error} bold>
                ✗ Some tests failed or encountered errors
              </Text>
            )}
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                {passedCount} agent(s) passed all tests
              </Text>
              {failedCount > 0 && (
                <Text color={theme.colors.text.secondary}>
                  {failedCount} agent(s) had failing tests
                </Text>
              )}
              {skippedCount > 0 && (
                <Text color={theme.colors.text.secondary}>
                  {skippedCount} agent(s) skipped
                </Text>
              )}
              {errorCount > 0 && (
                <Text color={theme.colors.error}>
                  {errorCount} agent(s) encountered errors
                </Text>
              )}
            </Box>
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                Exit code: {overallPassed ? '0' : '1'}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default TestView;