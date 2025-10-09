import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';
import path from 'path';
import fs from 'fs-extra';
import { readAgentConfig, loadLockFile, saveLockFile, calculateConfigHash, updateAgentInLock, toSnakeCaseKeys } from '../../utils.js';
import { getElevenLabsClient, listAgentsApi, getAgentApi } from '../../elevenlabs-api.js';
import { writeAgentConfig } from '../../utils.js';

interface PullAgent {
  name: string;
  agentId: string;
  status: 'pending' | 'checking' | 'pulling' | 'completed' | 'error' | 'skipped';
  message?: string;
  configPath?: string;
}

interface PullViewProps {
  agent?: string;
  outputDir: string;
  search?: string;
  dryRun: boolean;
  onComplete?: () => void;
}

export const PullView: React.FC<PullViewProps> = ({ 
  agent,
  outputDir,
  search,
  dryRun,
  onComplete 
}) => {
  const { exit } = useApp();
  const [agents, setAgents] = useState<PullAgent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pullAgents = async () => {
      try {
        // Check if agents.json exists
        const agentsConfigPath = path.resolve('agents.json');
        if (!(await fs.pathExists(agentsConfigPath))) {
          throw new Error('agents.json not found. Run "agents init" first.');
        }

        const client = await getElevenLabsClient();
        const searchTerm = agent || search;

        // Fetch agents list
        const agentsList = await listAgentsApi(client, 30, searchTerm);

        if (agentsList.length === 0) {
          setError('No agents found in your ElevenLabs workspace.');
          setComplete(true);
          return;
        }

        // Load existing config
        const agentsConfig = await readAgentConfig<any>(agentsConfigPath);
        const existingAgentNames = new Set<string>(agentsConfig.agents.map((a: any) => a.name as string));

        // Load lock file
        const lockFilePath = path.resolve('agents.lock');
        const lockData = await loadLockFile(lockFilePath);
        const existingAgentIds = new Set<string>();

        Object.values(lockData.agents).forEach((agentData: any) => {
          if (agentData && agentData.id) {
            existingAgentIds.add(agentData.id);
          }
        });

        // Prepare agents for display
        const agentsToPull: PullAgent[] = [];
        for (const agentMeta of agentsList) {
          const agentMetaTyped = agentMeta as { agentId?: string; agent_id?: string; name: string };
          const agentId = agentMetaTyped.agentId || agentMetaTyped.agent_id;
          
          if (!agentId) continue;

          const status = existingAgentIds.has(agentId) ? 'skipped' : 'pending';
          const message = existingAgentIds.has(agentId) ? 'Already exists' : undefined;

          agentsToPull.push({
            name: agentMetaTyped.name,
            agentId,
            status: status as 'skipped' | 'pending',
            message
          });
        }

        setAgents(agentsToPull);
        
        // Start processing if there are agents to pull
        if (agentsToPull.some(a => a.status === 'pending')) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          processNextAgent(agentsToPull, 0, agentsConfig, existingAgentNames, existingAgentIds, lockData, agentsConfigPath, lockFilePath);
        } else {
          setComplete(true);
          setTimeout(() => {
            if (onComplete) onComplete();
            else exit();
          }, 2000);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to pull agents');
        setComplete(true);
      }
    };

    pullAgents();
  }, []);

  const processNextAgent = async (
    agentsList: PullAgent[],
    index: number,
    agentsConfig: any,
    existingNames: Set<string>,
    existingIds: Set<string>,
    lockData: any,
    agentsConfigPath: string,
    lockFilePath: string
  ): Promise<void> => {
    if (index >= agentsList.length) {
      // Save files after all agents are processed (if not dry run)
      if (!dryRun) {
        await writeAgentConfig(agentsConfigPath, agentsConfig);
        await saveLockFile(lockFilePath, lockData);
      }
      setComplete(true);
      setTimeout(() => {
        if (onComplete) onComplete();
        else exit();
      }, 2000);
      return;
    }

    const agent = agentsList[index];

    // Skip if already exists
    if (agent.status === 'skipped') {
      setCurrentIndex(index + 1);
      processNextAgent(agentsList, index + 1, agentsConfig, existingNames, existingIds, lockData, agentsConfigPath, lockFilePath);
      return;
    }

    // Update to checking
    setAgents(prev => prev.map((a, i) => i === index ? { ...a, status: 'checking' as const } : a));
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const client = await getElevenLabsClient();
      let agentName = agent.name;

      // Check for name conflicts
      if (existingNames.has(agentName)) {
        let counter = 1;
        const originalName = agentName;
        while (existingNames.has(agentName)) {
          agentName = `${originalName}_${counter}`;
          counter++;
        }
      }

      if (dryRun) {
        setAgents(prev => prev.map((a, i) => 
          i === index ? { ...a, status: 'completed' as const, message: '[DRY RUN] Would pull' } : a
        ));
      } else {
        // Update to pulling
        setAgents(prev => prev.map((a, i) => i === index ? { ...a, status: 'pulling' as const } : a));

        // Fetch agent details
        const agentDetails = await getAgentApi(client, agent.agentId);
        const agentDetailsTyped = agentDetails as {
          conversationConfig?: Record<string, unknown>;
          conversation_config?: Record<string, unknown>;
          platformSettings?: Record<string, unknown>;
          platform_settings?: Record<string, unknown>;
          tags?: string[];
        };

        const conversationConfig = agentDetailsTyped.conversationConfig || agentDetailsTyped.conversation_config || {};
        const platformSettings = agentDetailsTyped.platformSettings || agentDetailsTyped.platform_settings || {};
        const tags = agentDetailsTyped.tags || [];

        const agentConfig = {
          name: agentName,
          conversation_config: conversationConfig,
          platform_settings: platformSettings,
          tags
        };

        // Generate config file path
        const safeName = agentName.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
        const configPath = `${outputDir}/${safeName}.json`;

        // Create config file
        const configFilePath = path.resolve(configPath);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeAgentConfig(configFilePath, agentConfig);

        // Add to agents config
        agentsConfig.agents.push({
          name: agentName,
          config: configPath
        });
        existingNames.add(agentName);
        existingIds.add(agent.agentId);

        // Update lock file
        const configHash = calculateConfigHash(toSnakeCaseKeys(agentConfig));
        updateAgentInLock(lockData, agentName, agent.agentId, configHash);

        setAgents(prev => prev.map((a, i) => 
          i === index ? { 
            ...a, 
            status: 'completed' as const, 
            message: 'Pulled successfully',
            configPath 
          } : a
        ));
      }

      setCurrentIndex(index + 1);
      processNextAgent(agentsList, index + 1, agentsConfig, existingNames, existingIds, lockData, agentsConfigPath, lockFilePath);

    } catch (err) {
      setAgents(prev => prev.map((a, i) => 
        i === index ? { 
          ...a, 
          status: 'error' as const, 
          message: err instanceof Error ? err.message : 'Failed to pull' 
        } : a
      ));
      setCurrentIndex(index + 1);
      processNextAgent(agentsList, index + 1, agentsConfig, existingNames, existingIds, lockData, agentsConfigPath, lockFilePath);
    }
  };

  const pulledCount = agents.filter(a => a.status === 'completed').length;
  const skippedCount = agents.filter(a => a.status === 'skipped').length;
  const errorCount = agents.filter(a => a.status === 'error').length;

  return (
    <App title="ElevenLabs Agents">
      <Box flexDirection="column">
        {error ? (
          <Box>
            <Text color={theme.colors.error}>✗ {error}</Text>
          </Box>
        ) : (
          <>
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
                <Box width={25}>
                  <Text color={theme.colors.text.muted} bold>AGENT ID</Text>
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
              {agents.map((agent, index) => {
                let statusColor: string;
                let statusText: string;
                
                if (agent.status === 'checking') {
                  statusColor = theme.colors.text.muted;
                  statusText = '⋯ Checking';
                } else if (agent.status === 'pulling') {
                  statusColor = theme.colors.accent.primary;
                  statusText = '↓ Pulling';
                } else if (agent.status === 'completed') {
                  statusColor = theme.colors.success;
                  statusText = '✓ Pulled';
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
                    <Box width={25}>
                      <Text color={theme.colors.text.muted}>{agent.agentId.slice(0, 20)}...</Text>
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
                  {pulledCount} agent(s) pulled
                </Text>
                {skippedCount > 0 && (
                  <Text color={theme.colors.text.secondary}>
                    {skippedCount} agent(s) already exist
                  </Text>
                )}
                {errorCount > 0 && (
                  <Text color={theme.colors.error}>
                    {errorCount} agent(s) failed to pull
                  </Text>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </App>
  );
};

export default PullView;

