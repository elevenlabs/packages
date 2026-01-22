import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import theme from '../themes/elevenlabs.js';

interface AddTestViewProps {
  initialName?: string;
  environment?: string;
  onComplete?: () => void;
}

type StepType = 'name' | 'template' | 'userMessage' | 'successCondition' | 'toolDetails' | 'confirm' | 'creating' | 'complete';

interface TemplateOption {
  label: string;
  value: string;
  description: string;
}

const templateOptions: TemplateOption[] = [
  {
    label: 'Basic LLM Test',
    value: 'basic-llm',
    description: 'Test basic LLM responses to user input'
  },
  {
    label: 'Tool Test',
    value: 'tool',
    description: 'Test tool usage and function calling'
  },
  {
    label: 'Conversation Flow',
    value: 'conversation-flow',
    description: 'Test multi-turn conversation handling'
  },
  {
    label: 'Customer Service',
    value: 'customer-service',
    description: 'Test empathy and problem resolution'
  }
];

export const AddTestView: React.FC<AddTestViewProps> = ({
  initialName = '',
  environment = 'prod',
  onComplete
}) => {
  const { exit } = useApp();
  const [currentStep, setCurrentStep] = useState<StepType>(initialName ? 'template' : 'name');
  const [testName, setTestName] = useState(initialName);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [userMessage, setUserMessage] = useState('Hello');
  const [successCondition, setSuccessCondition] = useState('The agent responds in a helpful and professional manner');
  const [toolName, setToolName] = useState('');
  const [toolId, setToolId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (key.escape) {
      exit();
    }
    
    if (currentStep === 'confirm' && key.return) {
      handleConfirm();
    }
  });

  const handleNameSubmit = (name: string) => {
    if (!name.trim()) {
      setError('Test name is required');
      return;
    }
    setTestName(name.trim());
    setError(null);
    setCurrentStep('template');
  };

  const handleTemplateSelect = (item: { value: string }) => {
    setSelectedTemplate(item.value);

    // Set defaults based on template
    switch (item.value) {
      case 'basic-llm':
        setUserMessage('Hello');
        setSuccessCondition('The agent responds in a helpful and professional manner');
        setCurrentStep('userMessage');
        break;
      case 'tool':
        setUserMessage('Please use the tool to help me');
        setSuccessCondition('The agent successfully calls the tool');
        setCurrentStep('toolDetails');
        break;
      case 'conversation-flow':
        setUserMessage('Hello, I need help with my account');
        setSuccessCondition('The agent provides helpful guidance');
        setCurrentStep('userMessage');
        break;
      case 'customer-service':
        setUserMessage("I'm frustrated with my recent order. It arrived damaged and I want a refund.");
        setSuccessCondition('The agent responds with empathy and offers a solution');
        setCurrentStep('userMessage');
        break;
      default:
        setCurrentStep('userMessage');
    }
  };

  const handleUserMessageSubmit = (message: string) => {
    setUserMessage(message);
    setCurrentStep('successCondition');
  };

  const handleSuccessConditionSubmit = (condition: string) => {
    setSuccessCondition(condition);
    setCurrentStep('confirm');
  };

  const handleToolNameSubmit = (name: string) => {
    if (!name.trim()) {
      setError('Tool name is required for tool tests');
      return;
    }
    setToolName(name.trim());
    setError(null);
    setCurrentStep('confirm'); // Skip tool ID for now
  };

  const handleConfirm = async () => {
    setCurrentStep('creating');
    setError(null);

    try {
      const path = await import('path');
      const fsModule = await import('fs-extra');
      const fs = fsModule.default;
      const {
        writeConfig,
        readConfig,
      } = await import('../../utils.js');
      const { getTestTemplateByName } = await import('../../test-templates.js');

      // Create test config using template (in memory first)
      const testConfig = getTestTemplateByName(testName, selectedTemplate, {
        userMessage,
        successCondition,
        toolName,
        toolId
      });

      // Create test in ElevenLabs first to get ID
      const { getElevenLabsClient, createTestApi } = await import('../../elevenlabs-api.js');
      const client = await getElevenLabsClient(environment);

      const { toCamelCaseKeys, generateUniqueFilename } = await import('../../utils.js');
      const testApiConfig = toCamelCaseKeys(testConfig) as unknown as any;
      const response = await createTestApi(client, testApiConfig);
      const testId = response.id;

      // Generate config file path using test name
      const configPath = await generateUniqueFilename('test_configs', testName);
      const configFilePath = path.resolve(configPath);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(configFilePath));

      // Write test config file
      await writeConfig(configFilePath, testConfig);

      // Create/update tests.json
      const testsConfigPath = path.resolve('tests.json');
      let testsConfig: { tests: Array<{ config: string; type: string; id?: string; env?: string }> };

      try {
        testsConfig = await readConfig(testsConfigPath);
      } catch {
        testsConfig = { tests: [] };
      }

      // Check if test already exists by ID
      const existingTestIndex = testsConfig.tests.findIndex((test: any) => test.id === testId);
      if (existingTestIndex >= 0) {
        testsConfig.tests[existingTestIndex] = {
          config: configPath,
          type: selectedTemplate,
          id: testId,
          env: environment
        };
      } else {
        testsConfig.tests.push({
          config: configPath,
          type: selectedTemplate,
          id: testId,
          env: environment
        });
      }

      await writeConfig(testsConfigPath, testsConfig);

      setCurrentStep('complete');

      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          exit();
        }
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to create test: ${errorMessage}`);
      setCurrentStep('confirm');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Enter test name:</Text>
            <Box marginTop={1}>
              <TextInput
                value={testName}
                onChange={setTestName}
                onSubmit={handleNameSubmit}
                placeholder="e.g., Basic Greeting Test"
              />
            </Box>
            {error && (
              <Box marginTop={1}>
                <Text color={theme.colors.error}>{error}</Text>
              </Box>
            )}
          </Box>
        );

      case 'template':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Select test template:</Text>
            <Box marginTop={1}>
              <SelectInput
                items={templateOptions}
                onSelect={handleTemplateSelect}
              />
            </Box>
          </Box>
        );

      case 'userMessage':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Enter user message to test:</Text>
            <Box marginTop={1}>
              <TextInput
                value={userMessage}
                onChange={setUserMessage}
                onSubmit={handleUserMessageSubmit}
                placeholder="What the user will say to the agent"
              />
            </Box>
          </Box>
        );

      case 'successCondition':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Enter success condition:</Text>
            <Box marginTop={1}>
              <TextInput
                value={successCondition}
                onChange={setSuccessCondition}
                onSubmit={handleSuccessConditionSubmit}
                placeholder="What defines a successful response"
              />
            </Box>
          </Box>
        );

      case 'toolDetails':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Enter tool name:</Text>
            <Box marginTop={1}>
              <TextInput
                value={toolName}
                onChange={setToolName}
                onSubmit={handleToolNameSubmit}
                placeholder="Name of the tool to test"
              />
            </Box>
            {error && (
              <Box marginTop={1}>
                <Text color={theme.colors.error}>{error}</Text>
              </Box>
            )}
          </Box>
        );

      case 'confirm':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Confirm test configuration:</Text>
            <Box marginTop={1} flexDirection="column">
              <Text color={theme.colors.text.primary}>Name: {testName}</Text>
              <Text color={theme.colors.text.primary}>Template: {selectedTemplate}</Text>
              <Text color={theme.colors.text.primary}>User Message: {userMessage}</Text>
              <Text color={theme.colors.text.primary}>Success Condition: {successCondition}</Text>
              {toolName && <Text color={theme.colors.text.primary}>Tool: {toolName}</Text>}
            </Box>
            {error && (
              <Box marginTop={1}>
                <Text color={theme.colors.error}>{error}</Text>
              </Box>
            )}
            <Box marginTop={2}>
              <Text color={theme.colors.text.muted}>Press Enter to create test, or Esc to cancel</Text>
            </Box>
          </Box>
        );

      case 'creating':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.accent.primary} bold>Creating test...</Text>
            <Box marginTop={1}>
              <Text color={theme.colors.text.muted}>⏳ Generating configuration and uploading to ElevenLabs...</Text>
            </Box>
            {error && (
              <Box marginTop={1}>
                <Text color={theme.colors.error}>{error}</Text>
              </Box>
            )}
          </Box>
        );

      case 'complete':
        return (
          <Box flexDirection="column">
            <Text color={theme.colors.success} bold>✅ Test created successfully!</Text>
            <Box marginTop={1}>
              <Text color={theme.colors.text.primary}>Test "{testName}" has been created and uploaded to ElevenLabs.</Text>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <App>
      <Box flexDirection="column" padding={1}>
        <StatusCard
          title="Add Test"
          status={currentStep === 'complete' ? 'success' : currentStep === 'creating' ? 'loading' : 'idle'}
          details={[
            `Step: ${currentStep}`,
            `Name: ${testName || 'Not set'}`,
            `Template: ${selectedTemplate || 'Not selected'}`
          ]}
        />

        <Box marginTop={1}>
          {renderStep()}
        </Box>

        <Box marginTop={2}>
          <Text color={theme.colors.text.muted}>
            💡 Use Esc to cancel at any time
          </Text>
        </Box>
      </Box>
    </App>
  );
};

export default AddTestView;