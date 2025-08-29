import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import path from 'path';
import fs from 'fs-extra';
import App from '../App.js';
import StatusCard from '../components/StatusCard.js';
import ProgressFlow from '../components/ProgressFlow.js';
import theme from '../themes/elevenlabs.js';

interface InitViewProps {
  projectPath: string;
  onComplete?: () => void;
}

interface InitStep {
  name: string;
  description: string;
  action: () => Promise<void>;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

export const InitView: React.FC<InitViewProps> = ({ projectPath, onComplete }) => {
  const { exit } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<InitStep[]>([]);
  const [complete, setComplete] = useState(false);

  const fullPath = path.resolve(projectPath);

  const initializeSteps = (): InitStep[] => [
    {
      name: 'Create project directory',
      description: 'Setting up project structure',
      action: async () => {
        await fs.ensureDir(fullPath);
      },
      status: 'pending',
    },
    {
      name: 'Create agents.json',
      description: 'Initializing agent configuration',
      action: async () => {
        const agentsConfigPath = path.join(fullPath, 'agents.json');
        if (!(await fs.pathExists(agentsConfigPath))) {
          await fs.writeJson(agentsConfigPath, { agents: [] }, { spaces: 2 });
        }
      },
      status: 'pending',
    },
    {
      name: 'Create tools.json',
      description: 'Initializing tools configuration',
      action: async () => {
        const toolsConfigPath = path.join(fullPath, 'tools.json');
        if (!(await fs.pathExists(toolsConfigPath))) {
          await fs.writeJson(toolsConfigPath, { tools: [] }, { spaces: 2 });
        }
      },
      status: 'pending',
    },
    {
      name: 'Create directory structure',
      description: 'Setting up environment directories',
      action: async () => {
        const dirs = [
          'agent_configs/dev',
          'agent_configs/staging',
          'agent_configs/prod',
          'tool_configs',
        ];
        for (const dir of dirs) {
          await fs.ensureDir(path.join(fullPath, dir));
        }
      },
      status: 'pending',
    },
    {
      name: 'Create lock file',
      description: 'Initializing version lock',
      action: async () => {
        const lockFilePath = path.join(fullPath, 'convai.lock');
        if (!(await fs.pathExists(lockFilePath))) {
          await fs.writeJson(lockFilePath, { agents: {}, tools: {} }, { spaces: 2 });
        }
      },
      status: 'pending',
    },
    {
      name: 'Create .env.example',
      description: 'Adding environment template',
      action: async () => {
        const envExamplePath = path.join(fullPath, '.env.example');
        if (!(await fs.pathExists(envExamplePath))) {
          const envContent = `# ElevenLabs API Key\nELEVENLABS_API_KEY=your_api_key_here\n`;
          await fs.writeFile(envExamplePath, envContent);
        }
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
        await step.action();
        
        // Update step status to completed
        setSteps(prev => prev.map((s, i) => 
          i === currentStep ? { ...s, status: 'completed' } : s
        ));
        
        // Update progress
        const newProgress = Math.round(((currentStep + 1) / steps.length) * 100);
        setProgress(newProgress);
        
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
      title="ElevenLabs Conversational AI"
      subtitle="Initializing project"
      showOverlay={!complete}
    >
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <Text color={theme.colors.text.primary}>
            Initializing project in: <Text bold>{fullPath}</Text>
          </Text>
        </Box>

        <ProgressFlow 
          value={progress} 
          label="Overall Progress"
          showWave={true}
        />

        <Box flexDirection="column" marginTop={2}>
          {steps.map((step, index) => {
            let status: 'loading' | 'success' | 'error' | 'idle';
            if (step.status === 'running') status = 'loading';
            else if (step.status === 'completed') status = 'success';
            else if (step.status === 'error') status = 'error';
            else status = 'idle';

            return (
              <StatusCard
                key={index}
                title={step.name}
                status={status}
                message={step.description}
                details={step.error ? [step.error] : []}
              />
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
              <Text color={theme.colors.text.secondary}>1. Set your API key: convai login</Text>
              <Text color={theme.colors.text.secondary}>2. Create an agent: convai add agent "My Agent" --template default</Text>
              <Text color={theme.colors.text.secondary}>3. Sync to ElevenLabs: convai sync</Text>
            </Box>
          </Box>
        )}
      </Box>
    </App>
  );
};

export default InitView;