// @ts-nocheck
import React, { useEffect } from "react";
import { Box, Text, useApp } from "ink";
import Gradient from "ink-gradient";
import BigText from "ink-big-text";
import App from "../App.js";
import theme from "../themes/elevenlabs.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../../package.json"), "utf-8")
);
const { version } = packageJson;

interface Command {
  name: string;
  description: string;
  subcommands?: Command[];
}

const commands: Command[][] = [
  [
    {
      name: "init [path]",
      description: "Initialize project (use --override to recreate from scratch)",
    },
    {
      name: "login",
      description: "Login with your ElevenLabs API key",
    },
    {
      name: "logout",
      description: "Logout and remove stored API key",
    },
    {
      name: "whoami",
      description: "Show current login status",
    },
    {
      name: "residency [location]",
      description: "Set the API residency location",
    },
  ],
  [
    {
      name: "add <name>",
      description: "Create a new agent and push to remote",
    },
    {
      name: "list",
      description: "List all local agents",
    },
    {
      name: "delete <agent_id>",
      description: "Delete agent locally and from ElevenLabs",
    },
    {
      name: "status",
      description: "Show the status of agents",
    },
    {
      name: "push",
      description: "Push agents to ElevenLabs",
    },
    {
      name: "pull",
      description: "Pull agents from ElevenLabs",
    },
  ],
  [
    {
      name: "add-webhook-tool <name>",
      description: "Add a new webhook tool",
    },
    {
      name: "add-client-tool <name>",
      description: "Add a new client tool",
    },
    {
      name: "push-tools",
      description: "Push tools to ElevenLabs API",
    },
    {
      name: "pull-tools",
      description: "Pull tools from ElevenLabs workspace",
    },
  ],
  [
    {
      name: "add-test <name>",
      description: "Add a new test",
    },
    {
      name: "push-tests",
      description: "Push tests to ElevenLabs API",
    },
    {
      name: "pull-tests",
      description: "Pull tests from ElevenLabs workspace",
    },
    {
      name: "test <agent>",
      description: "Run tests for an agent",
    },
  ],
  [
    {
      name: "templates",
      description: "Manage agent templates",
      subcommands: [
        {
          name: "list",
          description: "List available agent templates",
        },
        {
          name: "show <template>",
          description: "Show template configuration",
        },
      ],
    },
  ],
  [
    {
      name: "watch",
      description: "Watch for config changes and auto-push",
    },
    {
      name: "widget <name>",
      description: "Generate HTML widget snippet for an agent",
    },
    {
      name: "components",
      description:
        "Import components from the ElevenLabs UI registry (https://ui.elevenlabs.io)",
      subcommands: [
        {
          name: "add [name]",
          description: "Add component from registry",
        },
      ],
    },
  ],
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
    <App>
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Gradient name="passion">
            <BigText text="agents" font="chrome" />
          </Gradient>
        </Box>

        <Box marginBottom={1}>
          <Text color={theme.colors.text.secondary}>
            ElevenLabs Agents Manager CLI v{version}
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
          <Text color={theme.colors.text.primary}>
            agents [command] [options]
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text color={theme.colors.accent.primary} bold>
            Commands:
          </Text>
        </Box>

        {commands.map((group, groupIndex) => (
          <Box key={groupIndex} flexDirection="column" marginBottom={1}>
            {group.map((cmd, cmdIndex) => (
              <Box key={cmdIndex} flexDirection="column">
                <Box marginLeft={2}>
                  <Box width={24}>
                    <Text color={theme.colors.text.primary}>{cmd.name}</Text>
                  </Box>
                  <Text color={theme.colors.text.secondary}>{cmd.description}</Text>
                </Box>
                {cmd.subcommands &&
                  cmd.subcommands.map((subcmd, subIndex) => (
                    <Box key={subIndex} marginLeft={4}>
                      <Box width={22}>
                        <Text color={theme.colors.text.muted}>{subcmd.name}</Text>
                      </Box>
                      <Text color={theme.colors.text.muted}>
                        {subcmd.description}
                      </Text>
                    </Box>
                  ))}
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
            1. Initialize a project:{" "}
            <Text color={theme.colors.success}>agents init</Text>
          </Text>
          <Text color={theme.colors.text.secondary}>
            2. Login with API key:{" "}
            <Text color={theme.colors.success}>agents login</Text>
          </Text>
          <Text color={theme.colors.text.secondary}>
            3. Create an agent:{" "}
            <Text color={theme.colors.success}>
              agents add agent "My Agent"
            </Text>
          </Text>
          <Text color={theme.colors.text.secondary}>
            4. Push to ElevenLabs:{" "}
            <Text color={theme.colors.success}>agents push</Text>
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={theme.colors.text.muted}>
          For more information on a command, use: agents [command] --help
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
