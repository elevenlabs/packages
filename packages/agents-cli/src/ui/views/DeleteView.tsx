import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { getElevenLabsClient, deleteAgentApi } from '../../elevenlabs-api.js';
import { readAgentConfig, writeAgentConfig } from '../../utils.js';
import fs from 'fs-extra';
import path from 'path';

interface DeleteViewProps {
  agentId: string;
  onComplete?: () => void;
}

interface AgentDefinition {
  name: string;
  config: string;
  id?: string;
}

interface AgentsConfig {
  agents: AgentDefinition[];
}

const AGENTS_CONFIG_FILE = "agents.json";

export const DeleteView: React.FC<DeleteViewProps> = ({ agentId, onComplete }) => {
  const { exit } = useApp();
  const [confirming, setConfirming] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>('');
  const [agentNotFound, setAgentNotFound] = useState(false);

  useInput((input) => {
    if (confirming && agentName) {
      if (input.toLowerCase() === 'y') {
        handleDelete();
      } else if (input.toLowerCase() === 'n') {
        exit();
      }
    }
  });

  useEffect(() => {
    const loadAgentInfo = async () => {
      try {
        // Load agents configuration
        const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
        if (!(await fs.pathExists(agentsConfigPath))) {
          throw new Error('agents.json not found');
        }

        const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
        
        // Find agent by ID
        const agentDef = agentsConfig.agents.find(agent => agent.id === agentId);
        
        if (!agentDef) {
          setAgentNotFound(true);
          setConfirming(false);
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            } else {
              exit();
            }
          }, 2000);
          return;
        }

        setAgentName(agentDef.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setConfirming(false);
      }
    };

    loadAgentInfo();
  }, [agentId, exit, onComplete]);

  const handleDelete = async () => {
    setConfirming(false);
    setProcessing(true);

    try {
      // Load agents configuration
      const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
      const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
      
      // Find agent by ID
      const agentIndex = agentsConfig.agents.findIndex(agent => agent.id === agentId);
      const agentDef = agentsConfig.agents[agentIndex];

      // Delete from ElevenLabs API
      const client = await getElevenLabsClient();
      await deleteAgentApi(client, agentId);

      // Delete config file if it exists
      if (agentDef.config && await fs.pathExists(agentDef.config)) {
        await fs.remove(agentDef.config);
      }
      
      // Remove from agents.json
      agentsConfig.agents.splice(agentIndex, 1);
      await writeAgentConfig(agentsConfigPath, agentsConfig);

      setSuccess(true);
      setProcessing(false);

      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProcessing(false);
    }
  };

  return (
    <App>
      <Box flexDirection="column" gap={1}>
        {agentNotFound ? (
          <StatusCard
            status="error"
            title="Agent Not Found"
            message={`Agent with ID '${agentId}' not found in local configuration`}
          />
        ) : confirming && agentName ? (
          <>
            <StatusCard
              title="Confirm Delete"
              status="warning"
              message="Are you sure you want to delete this agent?"
              details={[
                `Agent: ${agentName}`,
                `ID: ${agentId}`,
                "This will delete the agent both locally and from ElevenLabs"
              ]}
            />
            
            <Box marginTop={1}>
              <Text color={theme.colors.text.primary}>
                Delete agent? (y/n): 
              </Text>
            </Box>
          </>
        ) : processing ? (
          <StatusCard
            status="loading"
            title="Deleting Agent"
            message="Removing agent from ElevenLabs and local configuration..."
          />
        ) : success ? (
          <>
            <StatusCard
              status="success"
              title="Agent Deleted"
              message={`Agent '${agentName}' successfully deleted!`}
              details={[
                "Deleted from ElevenLabs",
                "Removed from local configuration"
              ]}
            />
          </>
        ) : error ? (
          <StatusCard
            status="error"
            title="Delete Failed"
            message={error}
          />
        ) : null}
      </Box>
    </App>
  );
};

export default DeleteView;