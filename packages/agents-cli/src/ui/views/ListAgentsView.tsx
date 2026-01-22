import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { readConfig } from '../../utils.js';
import path from 'path';
import fs from 'fs-extra';

interface Agent {
  name: string;
  config: string;
  id?: string;
  env: string;
}

interface ListAgentsViewProps {
  onComplete?: () => void;
}

export const ListAgentsView: React.FC<ListAgentsViewProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const agentsConfigPath = path.resolve('agents.json');
        
        if (!(await fs.pathExists(agentsConfigPath))) {
          setError('agents.json not found. Run "agents init" first.');
          setLoading(false);
          return;
        }

        const agentsConfig = await readConfig<{ agents: { config: string; id?: string; env?: string }[] }>(agentsConfigPath);
        
        // Read names from individual config files
        const agentsWithNames = await Promise.all(
          (agentsConfig.agents || []).map(async (agentDef) => {
            let name = 'Unknown Agent';
            if (agentDef.config && await fs.pathExists(agentDef.config)) {
              try {
                const config = await readConfig<any>(agentDef.config);
                name = config.name || 'Unnamed Agent';
              } catch (error) {
                // Keep 'Unknown Agent' if can't read
              }
            }
            return {
              name,
              config: agentDef.config,
              id: agentDef.id,
              env: agentDef.env || 'prod'
            };
          })
        );
        
        setAgents(agentsWithNames);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load agents');
        setLoading(false);
      }
    };

    loadAgents();

    // Auto-exit after 10 seconds
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      } else {
        exit();
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [exit, onComplete]);

  // Map agents to rows
  const agentRows = agents.map(agent => ({
    name: agent.name,
    env: agent.env,
    id: agent.id || 'N/A',
    configPath: agent.config
  }));

  return (
    <App 
      title="ElevenLabs Agents"
    >
      <Box flexDirection="column" gap={1}>
        {loading ? (
          <StatusCard
            title="Loading"
            status="loading"
            message="Loading configured agents..."
          />
        ) : error ? (
          <StatusCard
            title="Error"
            status="error"
            message={error}
          />
        ) : agents.length === 0 ? (
          <>
            <StatusCard
              title="No Agents"
              status="idle"
              message="No agents configured yet"
            />
            <Box marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                Run 'agents add "agent-name"' to create your first agent
              </Text>
            </Box>
          </>
        ) : (
          <>
            {/* Summary */}
            <StatusCard
              title="Agent Summary"
              status="success"
              message={`${agents.length} agent(s) configured`}
            />

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
                <Box width={10}>
                  <Text color={theme.colors.text.muted} bold>ENV</Text>
                </Box>
                <Box>
                  <Text color={theme.colors.text.muted} bold>CONFIG PATH</Text>
                </Box>
              </Box>
              
              {/* Separator */}
              <Box marginY={0}>
                <Text color={theme.colors.text.muted}>{'─'.repeat(80)}</Text>
              </Box>
              
              {/* Table Rows */}
              {agentRows.map((row, index) => (
                <Box key={index}>
                  <Box width={30}>
                    <Text color={theme.colors.text.primary}>{row.name}</Text>
                  </Box>
                  <Box width={10}>
                    <Text color={theme.colors.accent.secondary}>{row.env}</Text>
                  </Box>
                  <Box>
                    <Text color={theme.colors.text.muted}>{row.configPath}</Text>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Commands hint */}
            <Box marginTop={1} flexDirection="column" gap={0}>
              <Text color={theme.colors.text.muted}>
                Commands:
              </Text>
              <Text color={theme.colors.text.muted}>
                • 'agents status' - Check push status
              </Text>
              <Text color={theme.colors.text.muted}>
                • 'agents push' - Deploy to ElevenLabs
              </Text>
              <Text color={theme.colors.text.muted}>
                • 'agents add' - Add new agent
              </Text>
            </Box>
          </>
        )}
        
        <Box marginTop={1}>
          <Text color={theme.colors.text.muted} dimColor>
            Press Ctrl+C to exit (auto-exit in 10s)
          </Text>
        </Box>
      </Box>
    </App>
  );
};

export default ListAgentsView;