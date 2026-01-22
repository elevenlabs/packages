import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';
import { getTemplateByName, getTemplateOptions } from '../../templates.js';
import { writeConfig, generateUniqueFilename } from '../../utils.js';
import { createAgentApi } from '../../elevenlabs-api.js';
import { getElevenLabsClient } from '../../elevenlabs-api.js';
import path from 'path';
import fs from 'fs-extra';

interface AddAgentViewProps {
  initialName?: string;
  template?: string;
  environment?: string;
  onComplete?: () => void;
}

type Step = 'name' | 'template' | 'confirm' | 'creating';

export const AddAgentView: React.FC<AddAgentViewProps> = ({ 
  initialName,
  template = 'default',
  environment = 'prod',
  onComplete 
}) => {
  const { exit } = useApp();
  const [currentStep, setCurrentStep] = useState<Step>(initialName ? 'template' : 'name');
  const [agentName, setAgentName] = useState(initialName || '');
  const [selectedTemplate, setSelectedTemplate] = useState(template);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const [createdConfigPath, setCreatedConfigPath] = useState<string | null>(null);

  const templates = Object.entries(getTemplateOptions()).map(([name, description]) => ({
    label: `${name} - ${description}`,
    value: name
  }));

  useInput((_, key) => {
    if (key.escape && !isCreating) {
      exit();
    }
    if (key.return) {
      if (currentStep === 'name' && agentName.trim()) {
        setCurrentStep('template');
      } else if (currentStep === 'confirm') {
        handleCreate();
      }
    }
  });

  const handleCreate = async () => {
    setCurrentStep('creating');
    setIsCreating(true);
    setError(null);

    try {
      // Step 1: Generate config (in memory)
      setStatusMessage('Generating agent configuration...');
      const agentConfig = getTemplateByName(agentName, selectedTemplate);
      
      // Step 2: Upload to ElevenLabs first to get ID
      setStatusMessage(`Creating agent in ElevenLabs (${environment})...`);
      const client = await getElevenLabsClient(environment);
      const conversationConfig = agentConfig.conversation_config || {};
      const platformSettings = agentConfig.platform_settings;
      const tags = agentConfig.tags || [];
      const agentId = await createAgentApi(
        client,
        agentName,
        conversationConfig,
        platformSettings,
        tags
      );
      
      if (agentId) {
        setStatusMessage(`Agent created with ID: ${agentId}`);
        setCreatedAgentId(agentId);
      }
      
      // Step 3: Create directory
      setStatusMessage('Creating agent directory...');
      const configDir = path.resolve(`agent_configs`);
      await fs.ensureDir(configDir);
      
      // Step 4: Write config file using agent name
      setStatusMessage('Writing configuration file...');
      const relativeConfigPath = await generateUniqueFilename('agent_configs', agentName);
      const configPath = path.resolve(relativeConfigPath);
      await writeConfig(configPath, agentConfig);
      setCreatedConfigPath(relativeConfigPath);
      
      // Step 5: Update agents.json
      setStatusMessage('Updating agents.json...');
      const agentsConfigPath = path.resolve('agents.json');
      const agentsConfig = await fs.readJson(agentsConfigPath);
      
      // Add new agent with ID
      agentsConfig.agents.push({
        config: relativeConfigPath,
        id: agentId,
        env: environment
      });
      
      await fs.writeJson(agentsConfigPath, agentsConfig, { spaces: 2 });
      
      setSuccess(true);
      
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (item: { value: string }) => {
    setSelectedTemplate(item.value);
    setCurrentStep('confirm');
  };

  return (
    <App
      title="ElevenLabs Agents"
    >
      <Box flexDirection="column" gap={1}>
        {/* Step 1: Agent Name */}
        {currentStep === 'name' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.colors.text.primary} bold>
              Step 1: Agent Name
            </Text>
            <Box marginBottom={1}>
              <Text color={theme.colors.text.secondary}>
                Enter a name for your agent:
              </Text>
            </Box>
            <TextInput
              value={agentName}
              onChange={setAgentName}
              placeholder="my-assistant"
            />
            <Box marginTop={1}>
              <Text color={theme.colors.text.muted}>
                Press Enter to continue, Escape to cancel
              </Text>
            </Box>
          </Box>
        )}

        {/* Step 2: Template Selection */}
        {currentStep === 'template' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.colors.text.primary} bold>
              Step 2: Select Template
            </Text>
            <Box marginBottom={1}>
              <Text color={theme.colors.text.secondary}>
                Choose a template for your agent:
              </Text>
            </Box>
            <SelectInput
              items={templates}
              onSelect={handleTemplateSelect}
            />
          </Box>
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 'confirm' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.colors.text.primary} bold>
              Review Configuration
            </Text>
            <Box flexDirection="column" marginTop={1}>
              <Text color={theme.colors.text.secondary}>
                • Name: <Text color={theme.colors.accent.primary}>{agentName}</Text>
              </Text>
              <Text color={theme.colors.text.secondary}>
                • Template: <Text color={theme.colors.accent.primary}>{selectedTemplate}</Text>
              </Text>
              <Text color={theme.colors.text.secondary}>
                • Upload to ElevenLabs: <Text color={theme.colors.accent.primary}>Yes</Text>
              </Text>
            </Box>
            <Box marginTop={2}>
              <Text color={theme.colors.success}>
                Press Enter to create agent, Escape to cancel
              </Text>
            </Box>
          </Box>
        )}

        {/* Creating */}
        {currentStep === 'creating' && (
          <Box flexDirection="column" gap={1}>
            {!success ? (
              <StatusCard
                title="Creating Agent"
                status="loading"
                message={statusMessage}
              />
            ) : (
              <Box flexDirection="column" gap={1}>
                <StatusCard
                  title="Agent Created Successfully"
                  status="success"
                  message={`Agent '${agentName}' has been created`}
                />
                <Box marginTop={1}>
                  <Text color={theme.colors.text.secondary}>
                    Configuration saved to: {createdConfigPath || 'agent_configs/'}
                  </Text>
                </Box>
              </Box>
            )}
            
            {error && (
              <Box marginTop={1}>
                <Text color={theme.colors.error}>
                  ✗ Error: {error}
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </App>
  );
};

export default AddAgentView;