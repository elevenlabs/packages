import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';
import { getElevenLabsClient, createAgentApi, updateAgentApi } from '../../elevenlabs-api.js';
import { readConfig, writeConfig } from '../../utils.js';
import fs from 'fs-extra';
import path from 'path';

interface PushAgent {
  name: string;
  configPath: string;
  status: 'pending' | 'checking' | 'pushing' | 'completed' | 'error' | 'skipped';
  message?: string;
  agentId?: string;
  env: string;
}

interface PushViewProps {
  agents: PushAgent[];
  dryRun?: boolean;
  onComplete?: () => void;
  agentsConfigPath?: string;
}

export const PushView: React.FC<PushViewProps> = ({ 
  agents, 
  dryRun = false,
  onComplete,
  agentsConfigPath = 'agents.json'
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
      
      try {
        // Check if config file exists
        const configPath = path.resolve(agent.configPath);
        if (!(await fs.pathExists(configPath))) {
          setPushedAgents(prev => 
            prev.map((a, i) => i === currentAgentIndex 
              ? { ...a, status: 'error', message: 'Config file not found' }
              : a
            )
          );
          setCurrentAgentIndex(currentAgentIndex + 1);
          return;
        }

        // Load agent config
        const agentConfig = await readConfig<any>(configPath);
        // Get agent ID from props (which comes from agents.json)
        const agentId = agent.agentId;

        if (dryRun) {
          // Dry run mode
          setPushedAgents(prev => 
            prev.map((a, i) => i === currentAgentIndex 
              ? { 
                  ...a, 
                  status: 'completed', 
                  message: agentId ? '[DRY RUN] Would update' : '[DRY RUN] Would create'
                }
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

          // Get ElevenLabs client for this agent's environment
          const client = await getElevenLabsClient(agent.env);

          // Extract config components
          const conversationConfig = agentConfig.conversation_config || {};
          const platformSettings = agentConfig.platform_settings;
          const tags = agentConfig.tags || [];
          const agentDisplayName = agentConfig.name || 'Unnamed Agent';

          if (!agentId) {
            // Create new agent
            const newAgentId = await createAgentApi(
              client,
              agentDisplayName,
              conversationConfig,
              platformSettings,
              tags
            );

            // Store agent ID in agents.json index file
            const agentsConfig = await readConfig<any>(path.resolve(agentsConfigPath));
            const agentDef = agentsConfig.agents.find((a: any) => a.config === agent.configPath);
            if (agentDef) {
              agentDef.id = newAgentId;
              await writeConfig(path.resolve(agentsConfigPath), agentsConfig);
            }

            setPushedAgents(prev => 
              prev.map((a, i) => i === currentAgentIndex 
                ? { 
                    ...a, 
                    status: 'completed', 
                    message: 'Successfully pushed',
                    agentId: newAgentId
                  }
                : a
              )
            );
          } else {
            // Update existing agent
            await updateAgentApi(
              client,
              agentId,
              agentDisplayName,
              conversationConfig,
              platformSettings,
              tags
            );

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
        }
      } catch (error) {
        // Handle error
        setPushedAgents(prev => 
          prev.map((a, i) => i === currentAgentIndex 
            ? { 
                ...a, 
                status: 'error', 
                message: error instanceof Error ? error.message : 'Failed to push'
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
  }, [currentAgentIndex, agents, dryRun, onComplete, exit]);

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
            <Box width={10}>
              <Text color={theme.colors.text.muted} bold>ENV</Text>
            </Box>
            <Box width={15}>
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
                <Box width={10}>
                  <Text color={theme.colors.accent.secondary}>{agent.env}</Text>
                </Box>
                <Box width={15}>
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