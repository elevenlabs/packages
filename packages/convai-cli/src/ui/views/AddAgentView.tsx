import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';
import { getTemplateByName, getTemplateOptions } from '../../templates.js';
import { writeAgentConfig } from '../../utils.js';
import { createAgentApi } from '../../elevenlabs-api.js';
import { getElevenLabsClient } from '../../elevenlabs-api.js';
import path from 'path';
import fs from 'fs-extra';

interface AddAgentViewProps {
  initialName?: string;
  environment?: string;
  template?: string;
  skipUpload?: boolean;
  onComplete?: () => void;
}

type Step = 'name' | 'template' | 'environment' | 'confirm' | 'creating';

export const AddAgentView: React.FC<AddAgentViewProps> = ({ 
  initialName,
  environment = 'prod',
  template = 'default',
  skipUpload = false,
  onComplete 
}) => {
  const { exit } = useApp();
  const [currentStep, setCurrentStep] = useState<Step>(initialName ? 'template' : 'name');
  const [agentName, setAgentName] = useState(initialName || '');
  const [selectedTemplate, setSelectedTemplate] = useState(template);
  const [selectedEnvironment, setSelectedEnvironment] = useState(environment);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const templates = Object.entries(getTemplateOptions()).map(([name, description]) => ({
    label: `${name} - ${description}`,
    value: name
  }));

  const environments = [
    { label: 'Production', value: 'prod' },
    { label: 'Staging', value: 'staging' },
    { label: 'Development', value: 'dev' }
  ];

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
      // Step 1: Generate config
      setStatusMessage('Generating agent configuration...');
      setProgress(20);
      const agentConfig = getTemplateByName(agentName, selectedTemplate);
      
      // Step 2: Create directory
      setStatusMessage('Creating agent directory...');
      setProgress(40);
      const configDir = path.resolve(`agent_configs/${selectedEnvironment}`);
      await fs.ensureDir(configDir);
      
      // Step 3: Write config file
      setStatusMessage('Writing configuration file...');
      setProgress(50);
      const configPath = path.join(configDir, `${agentName}.json`);
      await writeAgentConfig(configPath, agentConfig);
      
      // Step 4: Update agents.json
      setStatusMessage('Updating agents.json...');
      setProgress(60);
      const agentsConfigPath = path.resolve('agents.json');
      const agentsConfig = await fs.readJson(agentsConfigPath);
      
      // Check if agent already exists
      let existingAgent = agentsConfig.agents.find((agent: any) => agent.name === agentName);
      const relativeConfigPath = `agent_configs/${selectedEnvironment}/${agentName}.json`;
      
      if (existingAgent) {
        // Update existing agent with new environment
        if (!existingAgent.environments) {
          existingAgent.environments = {};
        }
        existingAgent.environments[selectedEnvironment] = { config: relativeConfigPath };
      } else {
        // Add new agent
        agentsConfig.agents.push({
          name: agentName,
          environments: {
            [selectedEnvironment]: { config: relativeConfigPath }
          }
        });
      }
      
      await fs.writeJson(agentsConfigPath, agentsConfig, { spaces: 2 });
      
      // Step 5: Upload to ElevenLabs (if not skipped)
      if (!skipUpload) {
        setStatusMessage('Uploading to ElevenLabs...');
        setProgress(80);
        const client = await getElevenLabsClient();
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
        }
      }
      
      setProgress(100);
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
    setCurrentStep('environment');
  };

  const handleEnvironmentSelect = (item: { value: string }) => {
    setSelectedEnvironment(item.value);
    setCurrentStep('confirm');
  };

  return (
    <App 
      title="ElevenLabs Conversational AI"
      subtitle="Create New Agent"
      showOverlay={!success}
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

        {/* Step 3: Environment Selection */}
        {currentStep === 'environment' && (
          <Box flexDirection="column" gap={1}>
            <Text color={theme.colors.text.primary} bold>
              Step 3: Select Environment
            </Text>
            <Box marginBottom={1}>
              <Text color={theme.colors.text.secondary}>
                Choose the target environment:
              </Text>
            </Box>
            <SelectInput
              items={environments}
              onSelect={handleEnvironmentSelect}
            />
          </Box>
        )}

        {/* Step 4: Confirmation */}
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
                • Environment: <Text color={theme.colors.accent.primary}>{selectedEnvironment}</Text>
              </Text>
              <Text color={theme.colors.text.secondary}>
                • Upload to ElevenLabs: <Text color={theme.colors.accent.primary}>{skipUpload ? 'No' : 'Yes'}</Text>
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
              <>
                <StatusCard
                  title="Creating Agent"
                  status="loading"
                  message={statusMessage}
                />
                <ProgressFlow 
                  value={progress} 
                  label="Progress"
                  showWave={true}
                />
              </>
            ) : (
              <Box flexDirection="column" gap={1}>
                <StatusCard
                  title="Agent Created Successfully"
                  status="success"
                  message={`Agent '${agentName}' has been created`}
                />
                <Box marginTop={1}>
                  <Text color={theme.colors.text.secondary}>
                    Configuration saved to: agent_configs/{selectedEnvironment}/{agentName}.json
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