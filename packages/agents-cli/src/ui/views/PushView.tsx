import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';

interface PushAgent {
  name: string;
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
    >
      <Box flexDirection="column">
        {/* Agent Status List - Compact Table */}
        <Box flexDirection="column">
          <Text color={theme.colors.text.primary} bold>
            Agents:
          </Text>
          
          {/* Table Header */}
          <Box marginTop={1}>
            <Box width={30}>
              <Text color={theme.colors.text.muted} bold>NAME</Text>
            </Box>
            <Box width={20}>
              <Text color={theme.colors.text.muted} bold>STATUS</Text>
            </Box>
            <Box>
              <Text color={theme.colors.text.muted} bold>MESSAGE</Text>
            </Box>
          </Box>
          
          {/* Separator */}
          <Box marginY={0}>
            <Text color={theme.colors.text.muted}>{'─'.repeat(80)}</Text>
          </Box>
          
          {/* Table Rows */}
          {pushedAgents.map((agent, index) => {
            let statusColor: string;
            let statusText: string;
            
            if (agent.status === 'checking') {
              statusColor = theme.colors.text.muted;
              statusText = '⋯ Checking';
            } else if (agent.status === 'pushing') {
              statusColor = theme.colors.accent.primary;
              statusText = '↑ Pushing';
            } else if (agent.status === 'completed') {
              statusColor = theme.colors.success;
              statusText = '✓ Pushed';
            } else if (agent.status === 'error') {
              statusColor = theme.colors.error;
              statusText = '✗ Error';
            } else if (agent.status === 'skipped') {
              statusColor = theme.colors.text.muted;
              statusText = '○ Skipped';
            } else {
              statusColor = theme.colors.text.muted;
              statusText = '○ Pending';
            }

            return (
              <Box key={index}>
                <Box width={30}>
                  <Text color={theme.colors.text.primary}>{agent.name}</Text>
                </Box>
                <Box width={20}>
                  <Text color={statusColor}>{statusText}</Text>
                </Box>
                <Box>
                  <Text color={theme.colors.text.muted}>
                    {agent.message || ''}
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Completion Summary */}
        {complete && (
          <Box marginTop={2} flexDirection="column">
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
        )}
      </Box>
    </App>
  );
};

export default PushView;