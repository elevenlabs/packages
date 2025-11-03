import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import path from 'path';
import fs from 'fs-extra';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';

interface InitViewProps {
  projectPath: string;
  override?: boolean;
  onComplete?: () => void;
}

interface InitStep {
  name: string;
  description: string;
  action: () => Promise<'created' | 'skipped'>;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'error';
  error?: string;
}

export const InitView: React.FC<InitViewProps> = ({ projectPath, override = false, onComplete }) => {
  const { exit } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<InitStep[]>([]);
  const [complete, setComplete] = useState(false);

  const fullPath = path.resolve(projectPath);

  const initializeSteps = (): InitStep[] => [
    {
      name: 'Create project directory',
      description: 'Setting up project structure',
      action: async () => {
        const exists = await fs.pathExists(fullPath);
        await fs.ensureDir(fullPath);
        return exists ? 'skipped' : 'created';
      },
      status: 'pending',
    },
    {
      name: 'Create agents.json',
      description: 'Initializing agent configuration',
      action: async () => {
        const agentsConfigPath = path.join(fullPath, 'agents.json');
        const exists = await fs.pathExists(agentsConfigPath);
        if (override || !exists) {
          await fs.writeJson(agentsConfigPath, { agents: [] }, { spaces: 2 });
          return 'created';
        }
        return 'skipped';
      },
      status: 'pending',
    },
    {
      name: 'Create tools.json',
      description: 'Initializing tools configuration',
      action: async () => {
        const toolsConfigPath = path.join(fullPath, 'tools.json');
        const exists = await fs.pathExists(toolsConfigPath);
        if (override || !exists) {
          await fs.writeJson(toolsConfigPath, { tools: [] }, { spaces: 2 });
          return 'created';
        }
        return 'skipped';
      },
      status: 'pending',
    },
    {
      name: 'Create tests.json',
      description: 'Initializing tests configuration',
      action: async () => {
        const testsConfigPath = path.join(fullPath, 'tests.json');
        const exists = await fs.pathExists(testsConfigPath);
        if (override || !exists) {
          await fs.writeJson(testsConfigPath, { tests: [] }, { spaces: 2 });
          return 'created';
        }
        return 'skipped';
      },
      status: 'pending',
    },
    {
      name: 'Create directory structure',
      description: 'Setting up config directories',
      action: async () => {
        const dirs = [
          'agent_configs',
          'tool_configs',
          'test_configs',
        ];
        if (override) {
          // In override mode, remove and recreate directories
          for (const dir of dirs) {
            const dirPath = path.join(fullPath, dir);
            await fs.remove(dirPath);
            await fs.ensureDir(dirPath);
          }
          return 'created';
        } else {
          // In normal mode, only create if they don't exist
          let anyCreated = false;
          for (const dir of dirs) {
            const dirPath = path.join(fullPath, dir);
            if (!(await fs.pathExists(dirPath))) {
              await fs.ensureDir(dirPath);
              anyCreated = true;
            }
          }
          return anyCreated ? 'created' : 'skipped';
        }
      },
      status: 'pending',
    },
    {
      name: 'Create .env.example',
      description: 'Adding environment template',
      action: async () => {
        const envExamplePath = path.join(fullPath, '.env.example');
        const exists = await fs.pathExists(envExamplePath);
        if (override || !exists) {
          const envContent = `# ElevenLabs API Key\nELEVENLABS_API_KEY=your_api_key_here\n`;
          await fs.writeFile(envExamplePath, envContent);
          return 'created';
        }
        return 'skipped';
      },
      status: 'pending',
    },
  ];

  useEffect(() => {
    setSteps(initializeSteps());
  }, []);

  useEffect(() => {
    const runSteps = async () => {
      if (currentStep >= steps.length || steps.length === 0 || complete) {
        return;
      }

      const step = steps[currentStep];
      
      // Update step status to running
      setSteps(prev => prev.map((s, i) => 
        i === currentStep ? { ...s, status: 'running' } : s
      ));

      try {
        const result = await step.action();
        
        // Update step status based on result (completed or skipped)
        setSteps(prev => prev.map((s, i) => 
          i === currentStep ? { ...s, status: result === 'created' ? 'completed' : 'skipped' } : s
        ));
        
        // Move to next step
        if (currentStep < steps.length - 1) {
          setTimeout(() => setCurrentStep(currentStep + 1), 300);
        } else {
          setComplete(true);
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            } else {
              exit();
            }
          }, 2000);
        }
      } catch (error) {
        // Update step status to error
        setSteps(prev => prev.map((s, i) => 
          i === currentStep ? { 
            ...s, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : s
        ));
      }
    };

    runSteps();
  }, [currentStep, steps.length, complete]);

  return (
    <App
      title="ElevenLabs Agents"
      headerMarginBottom={1}
    >
      <Box flexDirection="column">
        {override && (
          <Box marginBottom={1} paddingX={1}>
            <Text color={theme.colors.warning}>
              ⚠ Override mode: existing files will be overwritten
            </Text>
          </Box>
        )}
        <Box 
          flexDirection="column" 
          borderStyle="round"
          borderColor={complete ? theme.colors.success : theme.colors.text.muted}
          padding={1}
        >
          <Box marginBottom={1}>
            <Text color={theme.colors.text.primary}>
              Initializing project in: <Text bold>{fullPath}</Text>
            </Text>
          </Box>
          
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isSkipped = step.status === 'skipped';
            const isRunning = step.status === 'running';
            const isError = step.status === 'error';
            
            let icon = '○'; // gray circle for pending
            let color = theme.colors.text.muted;
            let statusText = '';
            
            if (isCompleted) {
              icon = '✓';
              color = theme.colors.success;
            } else if (isSkipped) {
              icon = '○';
              color = theme.colors.text.muted;
              statusText = ' (skipped)';
            } else if (isRunning) {
              icon = '●';
              color = theme.colors.accent.primary;
            } else if (isError) {
              icon = '✗';
              color = theme.colors.error;
            }

            return (
              <Box key={index} flexDirection="column">
                <Box>
                  <Text color={color}>
                    {icon} {step.name}{statusText}
                  </Text>
                </Box>
                {step.error && (
                  <Box marginLeft={2}>
                    <Text color={theme.colors.error}>
                      · {step.error}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {complete && (
          <Box marginTop={2} flexDirection="column">
            <Text color={theme.colors.success} bold>
              ✓ Project initialized successfully!
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text color={theme.colors.text.secondary}>Next steps:</Text>
              <Text color={theme.colors.text.secondary}>1. Set your API key: agents login</Text>
              <Text color={theme.colors.text.secondary}>2. Create an agent: agents add "My Agent" --template default</Text>
              <Text color={theme.colors.text.secondary}>3. Push to ElevenLabs: agents push</Text>
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default InitView;