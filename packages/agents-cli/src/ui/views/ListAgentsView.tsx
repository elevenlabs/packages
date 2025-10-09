import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { readAgentConfig } from '../../utils.js';
import path from 'path';
import fs from 'fs-extra';

interface Agent {
  name: string;
  environments?: Record<string, { config: string }>;
  config?: string; // Old format
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

        const agentsConfig = await readAgentConfig<{ agents: Agent[] }>(agentsConfigPath);
        setAgents(agentsConfig.agents || []);
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

  const getTotalEnvironments = () => {
    return agents.reduce((total, agent) => {
      if (agent.environments) {
        return total + Object.keys(agent.environments).length;
      } else if (agent.config) {
        return total + 1; // Old format counts as 1 environment
      }
      return total;
    }, 0);
  };

  // Flatten agents into rows (one per environment)
  const agentRows = agents.flatMap(agent => {
    // Handle both old format (config) and new format (environments)
    if (agent.environments) {
      const environments = Object.entries(agent.environments);
      return environments.map(([env, config]) => ({
        name: agent.name,
        environment: env,
        configPath: config.config
      }));
    } else if (agent.config) {
      // Old format: single config without environment specification
      return [{
        name: agent.name,
        environment: 'prod', // Default to prod for old format
        configPath: agent.config
      }];
    } else {
      return [];
    }
  });

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
              details={[
                `Total environments: ${getTotalEnvironments()}`
              ]}
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
                <Box width={15}>
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
                  <Box width={15}>
                    <Text color={theme.colors.text.secondary}>{row.environment}</Text>
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