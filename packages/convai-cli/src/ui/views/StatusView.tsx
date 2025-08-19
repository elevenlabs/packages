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
  environment: string;
  configPath: string;
  configExists: boolean;
  configHash?: string;
  deployedHash?: string;
  agentId?: string;
  status: 'synced' | 'modified' | 'not-deployed' | 'missing';
}

interface StatusViewProps {
  agentName?: string;
  environment?: string;
  onComplete?: () => void;
}

export const StatusView: React.FC<StatusViewProps> = ({ 
  agentName,
  environment,
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
          throw new Error('agents.json not found. Run "convai init" first.');
        }

        const agentsConfig = await readAgentConfig<any>(agentsConfigPath);
        const lockFilePath = path.resolve('convai.lock');
        const lockData = await loadLockFile(lockFilePath);

        const statusList: AgentStatus[] = [];

        // Process each agent
        for (const agentDef of agentsConfig.agents) {
          // Filter by agent name if specified
          if (agentName && agentDef.name !== agentName) {
            continue;
          }

          // Handle both old and new config formats
          const environments = agentDef.environments || { prod: { config: agentDef.config } };
          
          for (const [env, envConfig] of Object.entries(environments)) {
            // Filter by environment if specified
            if (environment && env !== environment) {
              continue;
            }

            const configPath = (envConfig as any).config;
            const fullConfigPath = path.resolve(configPath);
            const configExists = await fs.pathExists(fullConfigPath);
            
            let status: AgentStatus['status'] = 'missing';
            let configHash: string | undefined;
            let deployedHash: string | undefined;
            let agentId: string | undefined;

            if (configExists) {
              // Calculate current config hash
              const config = await readAgentConfig(fullConfigPath);
              const { calculateConfigHash } = await import('../../utils.js');
              configHash = calculateConfigHash(config);

              // Get deployed info from lock file
              const lockKey = `${agentDef.name}_${env}`;
              const agentLock = lockData.agents?.[lockKey];
              
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
              environment: env,
              configPath,
              configExists,
              configHash,
              deployedHash,
              agentId,
              status
            });
          }
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
  }, [agentName, environment, exit, onComplete]);

  const syncedCount = agents.filter(a => a.status === 'synced').length;
  const modifiedCount = agents.filter(a => a.status === 'modified').length;
  const notDeployedCount = agents.filter(a => a.status === 'not-deployed').length;
  const missingCount = agents.filter(a => a.status === 'missing').length;

  return (
    <App 
      title="ElevenLabs Conversational AI"
      subtitle="Agent Status"
      showOverlay={false}
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
                  `⚠ ${modifiedCount} modified`,
                  `○ ${notDeployedCount} not deployed`,
                  `✗ ${missingCount} missing`
                ]}
              />
            </Box>

            {/* Agent List */}
            <Box flexDirection="column" gap={1}>
              <Text color={theme.colors.text.primary} bold>
                Agents:
              </Text>
              
              {agents.map((agent, index) => {
                let status: 'success' | 'warning' | 'error' | 'idle';
                let statusText: string;
                let details: string[] = [];

                switch (agent.status) {
                  case 'synced':
                    status = 'success';
                    statusText = '✓ Synced';
                    break;
                  case 'modified':
                    status = 'warning';
                    statusText = '⚠ Modified locally';
                    details.push('Run "convai sync" to update');
                    break;
                  case 'not-deployed':
                    status = 'idle';
                    statusText = '○ Not deployed';
                    details.push('Run "convai sync" to deploy');
                    break;
                  case 'missing':
                    status = 'error';
                    statusText = '✗ Config file missing';
                    break;
                  default:
                    status = 'idle';
                    statusText = 'Unknown';
                }

                if (agent.agentId) {
                  details.push(`ID: ${agent.agentId}`);
                }
                if (agent.configPath) {
                  details.push(`Config: ${agent.configPath}`);
                }

                return (
                  <StatusCard
                    key={index}
                    title={`${agent.name} (${agent.environment})`}
                    status={status}
                    message={statusText}
                    details={details}
                    borderStyle="single"
                  />
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