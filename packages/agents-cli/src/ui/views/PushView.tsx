import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';

interface PushAgent {
  name: string;
  environment: string;
  configPath: string;
  status: 'pending' | 'checking' | 'pushing' | 'completed' | 'error' | 'skipped';
  message?: string;
  agentId?: string;
}

interface PushViewProps {
  agents: PushAgent[];
  dryRun?: boolean;
  onComplete?: () => void;
}

export const PushView: React.FC<PushViewProps> = ({ 
  agents, 
  dryRun = false,
  onComplete 
}) => {
  const { exit } = useApp();
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [pushedAgents, setPushedAgents] = useState<PushAgent[]>([]);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const pushNextAgent = async () => {
      if (currentAgentIndex >= agents.length) {
        setComplete(true);
        setTimeout(() => {
          if (onComplete) {
            onComplete();
          } else {
            exit();
          }
        }, 2000);
        return;
      }

      const agent = agents[currentAgentIndex];
      
      // Update agent status to checking
      setPushedAgents(prev => [...prev, { ...agent, status: 'checking' }]);
      
      // Simulate checking for changes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Randomly determine if agent needs push
      const needsPush = Math.random() > 0.5;
      
      if (!needsPush) {
        // Update to skipped
        setPushedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { ...a, status: 'skipped', message: 'No changes detected' }
            : a
          )
        );
      } else if (dryRun) {
        // Update to completed (dry run)
        setPushedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { ...a, status: 'completed', message: '[DRY RUN] Would push' }
            : a
          )
        );
      } else {
        // Update to pushing
        setPushedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { ...a, status: 'pushing' }
            : a
          )
        );
        
        // Simulate push operation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Update to completed
        const agentId = `agent_${Date.now()}`;
        setPushedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { 
                ...a, 
                status: 'completed', 
                message: 'Successfully pushed',
                agentId 
              }
            : a
          )
        );
      }
      
      // Update progress
      const newProgress = Math.round(((currentAgentIndex + 1) / agents.length) * 100);
      setProgress(newProgress);
      
      // Move to next agent
      setCurrentAgentIndex(currentAgentIndex + 1);
    };

    pushNextAgent();
  }, [currentAgentIndex, agents, dryRun]);

  const totalAgents = agents.length;
  const pushedCount = pushedAgents.filter(a => a.status === 'completed').length;
  const skippedCount = pushedAgents.filter(a => a.status === 'skipped').length;
  const errorCount = pushedAgents.filter(a => a.status === 'error').length;

  return (
    <App 
      title="ElevenLabs Agents" 
      showOverlay={!complete}
    >
      <Box flexDirection="column">
        {/* Summary */}
        <Box marginBottom={2}>
          <StatusCard
            title="Push Progress"
            status={complete ? 'success' : 'loading'}
            message={
              complete 
                ? `Completed: ${pushedCount} pushed, ${skippedCount} skipped, ${errorCount} errors`
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

        {/* Agent Status List */}
        <Box flexDirection="column" marginTop={2}>
          <Box marginBottom={1}>
            <Text color={theme.colors.text.primary} bold>
              Agents:
            </Text>
          </Box>
          {pushedAgents.map((agent, index) => {
            let status: 'loading' | 'success' | 'error' | 'idle' | 'warning';
            if (agent.status === 'checking' || agent.status === 'pushing') {
              status = 'loading';
            } else if (agent.status === 'completed') {
              status = 'success';
            } else if (agent.status === 'error') {
              status = 'error';
            } else if (agent.status === 'skipped') {
              status = 'idle';
            } else {
              status = 'idle';
            }

            const title = `${agent.name} (${agent.environment})`;
            const message = agent.status === 'pushing' 
              ? 'Pushing to ElevenLabs...'
              : agent.message;

            return (
              <StatusCard
                key={index}
                title={title}
                status={status}
                message={message}
                details={agent.agentId ? [`ID: ${agent.agentId}`] : []}
                borderStyle="single"
              />
            );
          })}
        </Box>

        {/* Completion Message */}
        {complete && (
          <Box marginTop={2} flexDirection="column">
            <Text color={theme.colors.success} bold>
              ✓ Push completed successfully!
            </Text>
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                {pushedCount} agent(s) pushed
              </Text>
              {skippedCount > 0 && (
                <Text color={theme.colors.text.secondary}>
                  {skippedCount} agent(s) already up to date
                </Text>
              )}
              {errorCount > 0 && (
                <Text color={theme.colors.error}>
                  {errorCount} agent(s) failed to push
                </Text>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default PushView;