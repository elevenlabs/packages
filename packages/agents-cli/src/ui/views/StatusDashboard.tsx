import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import CommandPanel from '../components/CommandPanel.js';
import theme from '../themes/elevenlabs.js';

interface AgentStatus {
  name: string;
  agentId: string;
  configPath: string;
  configHash: string;
  syncStatus: 'synced' | 'changed' | 'new' | 'error';
  lastSynced?: Date;
}

interface StatusDashboardProps {
  agents: AgentStatus[];
  showDetails?: boolean;
  interactive?: boolean;
  onComplete?: () => void;
}

export const StatusDashboard: React.FC<StatusDashboardProps> = ({
  agents,
  showDetails = false,
  interactive = true,
  onComplete,
}) => {
  const { exit } = useApp();
  const [selectedAgent, setSelectedAgent] = useState(0);
  const [showingDetails, setShowingDetails] = useState(showDetails);
  const [refreshing, setRefreshing] = useState(false);

  const options = [
    { key: 'r', label: 'Refresh', disabled: refreshing },
    { key: 'd', label: showingDetails ? 'Hide Details' : 'Show Details' },
    { key: 's', label: 'Push Changed', disabled: refreshing },
    { key: 'q', label: 'Quit' },
  ];

  useInput((input, key) => {
    if (!interactive) return;

    if (input === 'q') {
      if (onComplete) onComplete();
      else exit();
    } else if (input === 'r' && !refreshing) {
      handleRefresh();
    } else if (input === 'd') {
      setShowingDetails(!showingDetails);
    } else if (input === 's' && !refreshing) {
      handlePushChanged();
    } else if (key.upArrow) {
      setSelectedAgent(Math.max(0, selectedAgent - 1));
    } else if (key.downArrow) {
      setSelectedAgent(Math.min(agents.length - 1, selectedAgent + 1));
    }
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  const handlePushChanged = async () => {
    setRefreshing(true);
    // Simulate push
    await new Promise(resolve => setTimeout(resolve, 3000));
    setRefreshing(false);
  };

  const totalAgents = agents.length;
  const syncedAgents = agents.filter(a => a.syncStatus === 'synced').length;
  const changedAgents = agents.filter(a => a.syncStatus === 'changed').length;
  const newAgents = agents.filter(a => a.syncStatus === 'new').length;
  const errorAgents = agents.filter(a => a.syncStatus === 'error').length;

  return (
    <App 
      title="Agents Status" 
    >
      <Box flexDirection="column">
        {/* Summary Card */}
        <Box marginBottom={2}>
          <StatusCard
            title="System Overview"
            status={
              errorAgents > 0 ? 'error' :
              changedAgents > 0 || newAgents > 0 ? 'warning' :
              'success'
            }
            message={`${totalAgents} total agents`}
            details={[
              `✓ ${syncedAgents} synced`,
              `⚠ ${changedAgents} changed`,
              `+ ${newAgents} new`,
              errorAgents > 0 ? `✗ ${errorAgents} errors` : undefined,
            ].filter(Boolean) as string[]}
          />
        </Box>

        {/* Agents List */}
        <Box flexDirection="column">
          {agents.map((agent, index) => {
            const isSelected = index === selectedAgent && interactive;
            
            let status: 'success' | 'warning' | 'error' | 'idle';
            if (agent.syncStatus === 'synced') status = 'success';
            else if (agent.syncStatus === 'changed') status = 'warning';
            else if (agent.syncStatus === 'new') status = 'idle';
            else status = 'error';

            const details: string[] = [];
            if (showingDetails) {
              details.push(`ID: ${agent.agentId}`);
              details.push(`Config: ${agent.configPath}`);
              if (agent.lastSynced) {
                details.push(`Last push: ${agent.lastSynced.toLocaleString()}`);
              }
              details.push(`Hash: ${agent.configHash.substring(0, 8)}...`);
            }

            return (
              <Box key={index} marginBottom={1}>
                <StatusCard
                  title={isSelected ? `▶ ${agent.name}` : agent.name}
                  status={status}
                  message={
                    agent.syncStatus === 'synced' ? 'Up to date' :
                    agent.syncStatus === 'changed' ? 'Config changed - needs push' :
                    agent.syncStatus === 'new' ? 'New agent - needs push' :
                    'Configuration error'
                  }
                  details={details}
                  borderStyle={isSelected ? 'double' : 'single'}
                />
              </Box>
            );
          })}
        </Box>

        {/* Interactive Controls */}
        {interactive && (
          <Box marginTop={2}>
            <CommandPanel
              title="Actions"
              options={options}
            />
          </Box>
        )}

        {/* Status Messages */}
        {refreshing && (
          <Box marginTop={2}>
            <Text color={theme.colors.info}>
              Refreshing agent status...
            </Text>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default StatusDashboard;