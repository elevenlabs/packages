import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { readAgentConfig } from '../../utils.js';
import { loadLockFile } from '../../utils.js';
import path from 'path';
import fs from 'fs-extra';

interface AgentStatus {
  name: string;
  environment: string; // Keep for backward compatibility but unused
  configPath: string;
  configExists: boolean;
  configHash?: string;
  deployedHash?: string;
  agentId?: string;
  status: 'synced' | 'modified' | 'not-deployed' | 'missing';
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

        const agentsConfig = await readAgentConfig<any>(agentsConfigPath);
        const lockFilePath = path.resolve('agents.lock');
        const lockData = await loadLockFile(lockFilePath);

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
          let configHash: string | undefined;
          let deployedHash: string | undefined;
          let agentId: string | undefined;

          if (configExists) {
            // Calculate current config hash
            const config = await readAgentConfig(fullConfigPath);
            const { calculateConfigHash, getAgentFromLock } = await import('../../utils.js');
            configHash = calculateConfigHash(config);

            // Get deployed info from lock file
            const agentLock = getAgentFromLock(lockData, agentDef.name);
            
            if (agentLock && typeof agentLock === 'object') {
              if ('config_hash' in agentLock) {
                deployedHash = (agentLock as any).config_hash;
                agentId = (agentLock as any).id;
              } else if ('hash' in agentLock) {
                deployedHash = (agentLock as any).hash;
                agentId = (agentLock as any).id;
              }

              if (configHash === deployedHash) {
                status = 'synced';
              } else {
                status = 'modified';
              }
            } else {
              status = 'not-deployed';
            }
          }

          statusList.push({
            name: agentDef.name,
            environment: '',
            configPath,
            configExists,
            configHash,
            deployedHash,
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

  const syncedCount = agents.filter(a => a.status === 'synced').length;
  const modifiedCount = agents.filter(a => a.status === 'modified').length;
  const notDeployedCount = agents.filter(a => a.status === 'not-deployed').length;
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
                status={modifiedCount > 0 ? 'warning' : 'success'}
                message={`${agents.length} agent(s) found`}
                details={[
                  `✓ ${syncedCount} synced`,
                  `! ${modifiedCount} modified`,
                  `○ ${notDeployedCount} not deployed`,
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
                  case 'synced':
                    statusColor = theme.colors.success;
                    statusText = '✓ Synced';
                    break;
                  case 'modified':
                    statusColor = theme.colors.warning;
                    statusText = '! Modified';
                    break;
                  case 'not-deployed':
                    statusColor = theme.colors.text.muted;
                    statusText = '○ Not deployed';
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