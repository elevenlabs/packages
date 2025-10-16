import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';
import path from 'path';
import fs from 'fs-extra';
import { readConfig, writeConfig, generateUniqueFilename } from '../../utils.js';
import { getElevenLabsClient, listAgentsApi, getAgentApi } from '../../elevenlabs-api.js';

interface PullAgent {
  name: string;
  agentId: string;
  env: string;
  status: 'pending' | 'checking' | 'pulling' | 'completed' | 'error' | 'skipped';
  action?: 'create' | 'update' | 'skip';
  message?: string;
  configPath?: string;
}

interface PullViewProps {
  agent?: string; // Agent ID to pull specifically
  outputDir: string;
  dryRun: boolean;
  update?: boolean;
  all?: boolean;
  environments: string[]; // Array of environments to pull from
  onComplete?: () => void;
}

export const PullView: React.FC<PullViewProps> = ({ 
  agent,
  outputDir,
  dryRun,
  update,
  all,
  environments,
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

        // Load existing config
        const agentsConfig = await readConfig<any>(agentsConfigPath);
        const existingAgentNames = new Set<string>(agentsConfig.agents.map((a: any) => a.name as string));
        
        // Collect all agents from all environments
        const allAgentsToPull: PullAgent[] = [];

        // Loop through each environment
        for (const environment of environments) {
          const client = await getElevenLabsClient(environment);

          // Fetch agents list - either specific agent by ID or all agents
          let agentsList: unknown[];
          if (agent) {
            // Pull specific agent by ID
            const agentDetails = await getAgentApi(client, agent);
            const agentDetailsTyped = agentDetails as { agentId?: string; agent_id?: string; name: string };
            const agentId = agentDetailsTyped.agentId || agentDetailsTyped.agent_id || agent;
            agentsList = [{ 
              agentId: agentId,
              agent_id: agentId,
              name: agentDetailsTyped.name 
            }];
          } else {
            agentsList = await listAgentsApi(client, 30);
          }

          if (agentsList.length === 0) continue;

          // Build ID-based map for existing agents in this environment
          const existingAgentIds = new Map<string, any>(
            agentsConfig.agents
              .filter((a: any) => (a.env || 'prod') === environment)
              .map((agent: any) => [agent.id as string, agent])
          );

          // Prepare agents for display with action determination
          for (const agentMeta of agentsList) {
            const agentMetaTyped = agentMeta as { agentId?: string; agent_id?: string; name: string };
            const agentId = agentMetaTyped.agentId || agentMetaTyped.agent_id;
            
            if (!agentId) continue;

            let agentName = agentMetaTyped.name;
            const existingEntry = existingAgentIds.get(agentId);
            let action: 'create' | 'update' | 'skip';
            let status: 'pending' | 'skipped' = 'pending';

            if (existingEntry) {
              // Agent with this ID already exists locally
              if (update || all) {
                // --update or --all: update existing
                action = 'update';
                status = 'pending';
              } else {
                // Default: skip existing
                action = 'skip';
                status = 'skipped';
              }
            } else {
              // New agent (not present locally)
              if (update) {
                // --update mode: skip new items (only update existing)
                action = 'skip';
                status = 'skipped';
              } else {
                // Default or --all: create new items
                action = 'create';
                status = 'pending';
              }
            }

            allAgentsToPull.push({
              name: agentName,
              agentId,
              env: environment,
              action,
              status,
              message: status === 'skipped' ? 'Skipped' : undefined
            });
          }
        }

        if (allAgentsToPull.length === 0) {
          setError('No agents found in any environment.');
          setComplete(true);
          return;
        }

        setAgents(allAgentsToPull);
        
        // Start processing if there are agents to pull
        if (allAgentsToPull.some(a => a.status === 'pending')) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          processNextAgent(allAgentsToPull, 0, agentsConfig, agentsConfigPath);
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
    agentsConfigPath: string
  ): Promise<void> => {
    if (index >= agentsList.length) {
      // Save files after all agents are processed (if not dry run)
      if (!dryRun) {
        await writeConfig(agentsConfigPath, agentsConfig);
      }
      setComplete(true);
      setTimeout(() => {
        if (onComplete) onComplete();
        else exit();
      }, 2000);
      return;
    }

    const agent = agentsList[index];

    // Skip if already marked as skipped
    if (agent.status === 'skipped') {
      setCurrentIndex(index + 1);
      processNextAgent(agentsList, index + 1, agentsConfig, agentsConfigPath);
      return;
    }

    // Update to checking
    setAgents(prev => prev.map((a, i) => i === index ? { ...a, status: 'checking' as const } : a));
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const client = await getElevenLabsClient(agent.env);
      const agentName = agent.name;
      
      // Find existing entry for this agent ID in this environment
      const existingEntry = agentsConfig.agents.find((a: any) => 
        a.id === agent.agentId && (a.env || 'prod') === agent.env
      );

      if (dryRun) {
        const dryRunMsg = agent.action === 'create' ? '[DRY RUN] Would create' : '[DRY RUN] Would update';
        setAgents(prev => prev.map((a, i) => 
          i === index ? { ...a, status: 'completed' as const, message: dryRunMsg } : a
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

        // Create agent config structure (without agent_id - it goes in index file)
        const agentConfig = {
          name: agentName,
          conversation_config: conversationConfig,
          platform_settings: platformSettings,
          tags
        };

        let configPath: string;
        
        if (agent.action === 'update' && existingEntry && existingEntry.config) {
          // Update existing agent: use existing config path
          configPath = existingEntry.config;
          const configFilePath = path.resolve(configPath);
          await fs.ensureDir(path.dirname(configFilePath));
          await writeConfig(configFilePath, agentConfig);
          
          setAgents(prev => prev.map((a, i) => 
            i === index ? { 
              ...a, 
              status: 'completed' as const, 
              message: 'Updated successfully',
              configPath 
            } : a
          ));
        } else {
          // Create new agent
          configPath = await generateUniqueFilename(outputDir, agentName);
          const configFilePath = path.resolve(configPath);
          await fs.ensureDir(path.dirname(configFilePath));
          await writeConfig(configFilePath, agentConfig);

          // Add to agents config with ID
          agentsConfig.agents.push({
            config: configPath,
            id: agent.agentId,
            env: agent.env
          });

          setAgents(prev => prev.map((a, i) => 
            i === index ? { 
              ...a, 
              status: 'completed' as const, 
              message: 'Created successfully',
              configPath 
            } : a
          ));
        }
      }

      setCurrentIndex(index + 1);
      processNextAgent(agentsList, index + 1, agentsConfig, agentsConfigPath);

    } catch (err) {
      setAgents(prev => prev.map((a, i) => 
        i === index ? { 
          ...a, 
          status: 'error' as const, 
          message: err instanceof Error ? err.message : 'Failed to pull' 
        } : a
      ));
      setCurrentIndex(index + 1);
      processNextAgent(agentsList, index + 1, agentsConfig, agentsConfigPath);
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
              <Box marginBottom={1}>
                <Text color={theme.colors.text.primary} bold>
                  Pulling from {environments.length} environment{environments.length > 1 ? 's' : ''}: 
                </Text>
                <Text color={theme.colors.accent.secondary}> {environments.join(', ')}</Text>
              </Box>
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
                <Box width={20}>
                  <Text color={theme.colors.text.muted} bold>AGENT ID</Text>
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
                    <Box width={10}>
                      <Text color={theme.colors.accent.secondary}>{agent.env}</Text>
                    </Box>
                    <Box width={20}>
                      <Text color={theme.colors.text.muted}>{agent.agentId.slice(0, 18)}...</Text>
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

