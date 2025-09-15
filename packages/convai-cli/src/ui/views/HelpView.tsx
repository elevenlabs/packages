import React, { useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import App from '../App.js';
import theme from '../themes/elevenlabs.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));
const { version } = packageJson;

interface Command {
  name: string;
  description: string;
  subcommands?: Command[];
}

const commands: Command[] = [
  {
    name: 'init [path]',
    description: 'Initialize a new agent management project'
  },
  {
    name: 'login',
    description: 'Login with your ElevenLabs API key'
  },
  {
    name: 'logout',
    description: 'Logout and remove stored API key'
  },
  {
    name: 'whoami',
    description: 'Show current login status'
  },
  {
    name: 'residency [location]',
    description: 'Set the API residency location'
  },
  {
    name: 'add',
    description: 'Add agents and tools',
    subcommands: [
      {
        name: 'agent <name>',
        description: 'Add a new agent'
      },
      {
        name: 'webhook-tool <name>',
        description: 'Add a new webhook tool'
      },
      {
        name: 'client-tool <name>',
        description: 'Add a new client tool'
      }
    ]
  },
  {
    name: 'templates',
    description: 'Manage agent templates',
    subcommands: [
      {
        name: 'list',
        description: 'List available agent templates'
      },
      {
        name: 'show <template>',
        description: 'Show template configuration'
      }
    ]
  },
  {
    name: 'sync',
    description: 'Synchronize agents with ElevenLabs API'
  },
  {
    name: 'status',
    description: 'Show the status of agents'
  },
  {
    name: 'watch',
    description: 'Watch for config changes and auto-sync'
  },
  {
    name: 'list-agents',
    description: 'List all configured agents'
  },
  {
    name: 'fetch',
    description: 'Fetch agents from ElevenLabs workspace'
  },
  {
    name: 'widget <name>',
    description: 'Generate HTML widget snippet for an agent'
  }
];

export const HelpView: React.FC = () => {
  const { exit } = useApp();

  useEffect(() => {
    // Auto-exit after a short delay to allow the UI to render
    const timer = setTimeout(() => {
      exit();
    }, 100);

    return () => clearTimeout(timer);
  }, [exit]);

  return (
    <App showOverlay={true}>
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Gradient name="passion">
            <BigText text="convai" font="chrome" />
          </Gradient>
        </Box>
        
        <Box marginBottom={1}>
          <Text color={theme.colors.text.secondary}>
            ElevenLabs Conversational AI Agent Manager CLI v{version}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={theme.colors.accent.primary} bold>
            Usage:
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={theme.colors.text.primary}>convai [command] [options]</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={theme.colors.accent.primary} bold>
            Commands:
          </Text>
        </Box>
        
        {commands.map((cmd, index) => (
          <Box key={index} flexDirection="column" marginBottom={0.5}>
            <Box marginLeft={2}>
              <Box width={24}>
                <Text color={theme.colors.text.primary}>{cmd.name}</Text>
              </Box>
              <Text color={theme.colors.text.secondary}>{cmd.description}</Text>
            </Box>
            
            {cmd.subcommands && cmd.subcommands.map((subcmd, subIndex) => (
              <Box key={subIndex} marginLeft={4}>
                <Box width={22}>
                  <Text color={theme.colors.text.muted}>{subcmd.name}</Text>
                </Box>
                <Text color={theme.colors.text.muted}>{subcmd.description}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text color={theme.colors.accent.primary} bold>
            Quick Start:
          </Text>
        </Box>
        
        <Box flexDirection="column" marginLeft={2}>
          <Text color={theme.colors.text.secondary}>
            1. Initialize a project:    <Text color={theme.colors.success}>convai init</Text>
          </Text>
          <Text color={theme.colors.text.secondary}>
            2. Login with API key:      <Text color={theme.colors.success}>convai login</Text>
          </Text>
          <Text color={theme.colors.text.secondary}>
            3. Create an agent:         <Text color={theme.colors.success}>convai add agent "My Agent"</Text>
          </Text>
          <Text color={theme.colors.text.secondary}>
            4. Sync to ElevenLabs:      <Text color={theme.colors.success}>convai sync</Text>
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.text.muted}>
          For more information on a command, use: convai [command] --help
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.text.muted}>
          Disable UI mode with --no-ui flag for any command
        </Text>
      </Box>
    </App>
  );
};

export default HelpView;