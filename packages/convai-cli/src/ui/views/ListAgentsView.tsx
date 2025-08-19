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
  environments: Record<string, { config: string }>;
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
          setError('agents.json not found. Run "convai init" first.');
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
      return total + Object.keys(agent.environments || {}).length;
    }, 0);
  };

  return (
    <App 
      title="ElevenLabs Conversational AI"
      subtitle="Configured Agents"
      showOverlay={false}
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
                Run 'convai add agent "agent-name"' to create your first agent
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

            {/* Agent List */}
            <Box flexDirection="column" gap={1} marginTop={1}>
              <Text color={theme.colors.text.primary} bold>
                Agents:
              </Text>
              
              {agents.map((agent, index) => {
                const environments = Object.entries(agent.environments || {});
                const envCount = environments.length;
                
                return (
                  <Box key={index} flexDirection="column" marginBottom={1}>
                    <StatusCard
                      title={agent.name}
                      status="idle"
                      message={`${envCount} environment(s)`}
                      borderStyle="single"
                    />
                    
                    {environments.map(([env, config], envIndex) => (
                      <Box key={envIndex} marginLeft={2} marginTop={0}>
                        <Text color={theme.colors.text.secondary}>
                          • {env}: <Text color={theme.colors.text.muted}>{config.config}</Text>
                        </Text>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>

            {/* Commands hint */}
            <Box marginTop={1} flexDirection="column" gap={0}>
              <Text color={theme.colors.text.muted}>
                Commands:
              </Text>
              <Text color={theme.colors.text.muted}>
                • 'convai status' - Check sync status
              </Text>
              <Text color={theme.colors.text.muted}>
                • 'convai sync' - Deploy to ElevenLabs
              </Text>
              <Text color={theme.colors.text.muted}>
                • 'convai add agent' - Add new agent
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