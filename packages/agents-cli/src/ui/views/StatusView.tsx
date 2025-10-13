import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { readConfig } from '../../utils.js';
import path from 'path';
import fs from 'fs-extra';

interface AgentStatus {
  name: string;
  configPath: string;
  configExists: boolean;
  agentId?: string;
  status: 'created' | 'not-pushed' | 'missing';
}

interface StatusViewProps {
  agentName?: string;
  onComplete?: () => void;
}

export const StatusView: React.FC<StatusViewProps> = ({ 
  agentName,
  onComplete 
}) => {
  const { exit } = useApp();
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        // Load agents configuration
        const agentsConfigPath = path.resolve('agents.json');
        if (!(await fs.pathExists(agentsConfigPath))) {
          throw new Error('agents.json not found. Run "agents init" first.');
        }

        const agentsConfig = await readConfig<any>(agentsConfigPath);

        const statusList: AgentStatus[] = [];

        // Process each agent
        for (const agentDef of agentsConfig.agents) {
          // Filter by agent name if specified
          if (agentName && agentDef.name !== agentName) {
            continue;
          }

          const configPath = agentDef.config;
          if (!configPath) continue;
          
          const fullConfigPath = path.resolve(configPath);
          const configExists = await fs.pathExists(fullConfigPath);
          
          let status: AgentStatus['status'] = 'missing';
          // Get agent ID from index file
          const agentId: string | undefined = (agentDef as any).id;

          if (configExists) {
            // Simple status based on whether ID exists
            if (agentId) {
              status = 'created';
            } else {
              status = 'not-pushed';
            }
          }

          statusList.push({
            name: agentDef.name,
            configPath,
            configExists,
            agentId,
            status
          });
        }

        setAgents(statusList);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status');
        setLoading(false);
      }
    };

    loadStatus();

    // Auto-exit after showing status
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        exit();
      }
    }, 10000); // Show for 10 seconds

    return () => clearTimeout(timer);
  }, [agentName, exit, onComplete]);

  const createdCount = agents.filter(a => a.status === 'created').length;
  const notPushedCount = agents.filter(a => a.status === 'not-pushed').length;
  const missingCount = agents.filter(a => a.status === 'missing').length;

  return (
    <App 
      title="ElevenLabs Agents"
    >
      <Box flexDirection="column" gap={1}>
        {loading ? (
          <StatusCard
            title="Loading Status"
            status="loading"
            message="Checking agent configurations..."
          />
        ) : error ? (
          <StatusCard
            title="Error"
            status="error"
            message={error}
          />
        ) : agents.length === 0 ? (
          <StatusCard
            title="No Agents Found"
            status="idle"
            message="No agents match the specified criteria"
          />
        ) : (
          <>
            {/* Summary */}
            <Box marginBottom={1}>
              <StatusCard
                title="Status Summary"
                status={notPushedCount > 0 ? 'warning' : 'success'}
                message={`${agents.length} agent(s) found`}
                details={[
                  `✓ ${createdCount} created`,
                  `○ ${notPushedCount} not pushed`,
                  `✗ ${missingCount} missing`
                ]}
              />
            </Box>

            {/* Agent List - Compact Table */}
            <Box flexDirection="column" marginTop={1}>
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
                  <Text color={theme.colors.text.muted} bold>AGENT ID</Text>
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

                switch (agent.status) {
                  case 'created':
                    statusColor = theme.colors.success;
                    statusText = '✓ Created';
                    break;
                  case 'not-pushed':
                    statusColor = theme.colors.text.muted;
                    statusText = '○ Not pushed';
                    break;
                  case 'missing':
                    statusColor = theme.colors.error;
                    statusText = '✗ Missing';
                    break;
                  default:
                    statusColor = theme.colors.text.muted;
                    statusText = 'Unknown';
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
                        {agent.agentId || '-'}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Footer */}
            <Box marginTop={1}>
              <Text color={theme.colors.text.muted}>
                Press Ctrl+C to exit (auto-exit in 10s)
              </Text>
            </Box>
          </>
        )}
      </Box>
    </App>
  );
};

export default StatusView;