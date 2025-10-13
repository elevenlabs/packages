#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import {
  readConfig,
  writeConfig,
  toCamelCaseKeys,
  generateUniqueFilename
} from './utils.js';
import { 
  getTemplateByName, 
  getTemplateOptions,
  AgentConfig 
} from './templates.js';
import {
  getElevenLabsClient,
  createAgentApi,
  updateAgentApi,
  listAgentsApi,
  getAgentApi,
  deleteAgentApi,
  createToolApi,
  updateToolApi,
  listToolsApi,
  getToolApi,
  createTestApi,
  getTestApi,
  listTestsApi,
  updateTestApi
} from './elevenlabs-api.js';
import { ElevenLabs } from '@elevenlabs/elevenlabs-js';
import { 
  getApiKey, 
  setApiKey, 
  removeApiKey, 
  isLoggedIn,
  getResidency,
  setResidency,
  Location,
  LOCATIONS
} from './config.js';
import {
  readToolsConfig,
  writeToolsConfig,
  writeToolConfig,
  ToolsConfig,
  ToolDefinition,
  type Tool
} from './tools.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const { version } = packageJson;
import { render } from 'ink';
import React from 'react';
import InitView from './ui/views/InitView.js';
import PushView from './ui/views/PushView.js';
import PushToolsView from './ui/views/PushToolsView.js';
import LoginView from './ui/views/LoginView.js';
import AddAgentView from './ui/views/AddAgentView.js';
import StatusView from './ui/views/StatusView.js';
import WhoamiView from './ui/views/WhoamiView.js';
import ListAgentsView from './ui/views/ListAgentsView.js';
import LogoutView from './ui/views/LogoutView.js';
import ResidencyView from './ui/views/ResidencyView.js';
import HelpView from './ui/views/HelpView.js';
import PullToolsView from './ui/views/PullToolsView.js';
import PullView from './ui/views/PullView.js';
import TestView from './ui/views/TestView.js';
import AddTestView from './ui/views/AddTestView.js';
import { spawnSync } from 'child_process';
import { URL } from 'url';

// Load environment variables
dotenv.config();

const program = new Command();

// Default file names
const AGENTS_CONFIG_FILE = "agents.json";
const TOOLS_CONFIG_FILE = "tools.json";
const TESTS_CONFIG_FILE = "tests.json";

interface AgentDefinition {
  name: string;
  config: string;
  id?: string;
}

interface AgentsConfig {
  agents: AgentDefinition[];
}

interface TestDefinition {
  name: string;
  config: string;
  type?: string;
  id?: string;
}

interface TestsConfig {
  tests: TestDefinition[];
}

interface AddOptions {
  configPath?: string;
  template: string;
}

interface PushOptions {
  agent?: string;
  dryRun: boolean;
}

interface StatusOptions {
  agent?: string;
}

interface WatchOptions {
  agent?: string;
  interval: string;
}

interface PullOptions {
  agent?: string; // Agent ID to pull specifically
  outputDir: string;
  dryRun: boolean;
  update?: boolean; // Update existing items only
  all?: boolean; // Pull all (new + existing)
}

interface PullToolsOptions {
  tool?: string; // Tool ID to pull specifically
  outputDir: string;
  dryRun: boolean;
  update?: boolean; // Update existing items only
  all?: boolean; // Pull all (new + existing)
}

// Widget options interface removed - no longer needed

interface TemplateShowOptions {
  agentName: string;
}

program
  .name('agents')
  .description('ElevenLabs Agents Manager CLI')
  .version(version)
  .configureHelp({
    // Override the default help to use our Ink UI
    formatHelp: () => ''
  })
  .helpOption('-h, --help', 'Display help information')
  .on('option:help', async () => {
    // Show Ink-based help view
    const { waitUntilExit } = render(
      React.createElement(HelpView)
    );
    await waitUntilExit();
    process.exit(0);

  });

program
  .command('init')
  .description('Initialize a new agent management project')
  .argument('[path]', 'Path to initialize the project in', '.')
  .option('--no-ui', 'Disable interactive UI')
  .option('--override', 'Override existing files and recreate from scratch', false)
  .action(async (projectPath: string, options: { ui: boolean; override: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for initialization
        const { waitUntilExit } = render(
          React.createElement(InitView, { projectPath, override: options.override })
        );
        await waitUntilExit();
      } else {
        // Fallback to original implementation
        const fullPath = path.resolve(projectPath);
        console.log(`Initializing project in ${fullPath}`);
        if (options.override) {
          console.log('⚠ Override mode: existing files will be overwritten');
        }
        
        // Create directory if it doesn't exist
        await fs.ensureDir(fullPath);
        
        // Create agents.json file
        const agentsConfigPath = path.join(fullPath, AGENTS_CONFIG_FILE);
        if (!options.override && await fs.pathExists(agentsConfigPath)) {
          console.log(`${AGENTS_CONFIG_FILE} already exists (skipped)`);
        } else {
          const initialConfig: AgentsConfig = {
            agents: []
          };
          await writeConfig(agentsConfigPath, initialConfig);
          console.log(`Created ${AGENTS_CONFIG_FILE}`);
        }
        
        // Create tools.json file
        const toolsConfigPath = path.join(fullPath, TOOLS_CONFIG_FILE);
        if (!options.override && await fs.pathExists(toolsConfigPath)) {
          console.log(`${TOOLS_CONFIG_FILE} already exists (skipped)`);
        } else {
          const initialToolsConfig: ToolsConfig = {
            tools: []
          };
          await writeToolsConfig(toolsConfigPath, initialToolsConfig);
          console.log(`Created ${TOOLS_CONFIG_FILE}`);
        }

        // Create tests.json file
        const testsConfigPath = path.join(fullPath, TESTS_CONFIG_FILE);
        if (!options.override && await fs.pathExists(testsConfigPath)) {
          console.log(`${TESTS_CONFIG_FILE} already exists (skipped)`);
        } else {
          const initialTestsConfig: TestsConfig = {
            tests: []
          };
          await writeConfig(testsConfigPath, initialTestsConfig);
          console.log(`Created ${TESTS_CONFIG_FILE}`);
        }
        
        // Create directory structure
        const configDirs = ['agent_configs', 'tool_configs', 'test_configs'];
        for (const dir of configDirs) {
          const dirPath = path.join(fullPath, dir);
          if (options.override && await fs.pathExists(dirPath)) {
            await fs.remove(dirPath);
          }
          await fs.ensureDir(dirPath);
          const existed = await fs.pathExists(dirPath);
          console.log(`Created directory: ${dir}${!options.override && existed ? ' (already existed)' : ''}`);
        }
        
        // Create .env.example file
        const envExamplePath = path.join(fullPath, '.env.example');
        if (!options.override && await fs.pathExists(envExamplePath)) {
          console.log('.env.example already exists (skipped)');
        } else {
          const envExample = `# ElevenLabs API Key
ELEVENLABS_API_KEY=your_api_key_here
`;
          await fs.writeFile(envExamplePath, envExample);
          console.log('Created .env.example');
        }
        
        console.log('\nProject initialized successfully!');
        console.log('Next steps:');
        console.log('1. Set your ElevenLabs API key: agents login');
        console.log('2. Create an agent: agents add "My Agent" --template default');
        console.log('3. Create tools: agents add-webhook-tool "My Webhook" or agents add-client-tool "My Client"');
        console.log('4. Create tests: agents add-test "My Test" --template basic-llm');
        console.log('5. Push to ElevenLabs: agents push && agents push-tools && agents push-tests');
        console.log('6. Run tests: agents test "My Agent"');
      }
    } catch (error) {
      console.error(`Error initializing project: ${error}`);
      process.exit(1);
    }
  });

program
  .command('login')
  .description('Login with your ElevenLabs API key')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for login
        const { waitUntilExit } = render(
          React.createElement(LoginView)
        );
        await waitUntilExit();
      } else {
        // Fallback to text-based login
        const { read } = await import('read');
        
        const apiKey = await read({
          prompt: 'Enter your ElevenLabs API key: ',
          silent: true,
          replace: '*'
        });
        
        if (!apiKey || apiKey.trim() === '') {
          console.error('API key is required');
          process.exit(1);
        }
        
        // Test the API key by making a simple request
        process.env.ELEVENLABS_API_KEY = apiKey.trim();
        const client = await getElevenLabsClient();
        try {
          await listAgentsApi(client, 1);
          console.log('API key verified successfully');
        } catch (error: unknown) {
          const err = error as { statusCode?: number; message?: string; code?: string };
          if (err?.statusCode === 401 || err?.message?.includes('401')) {
            console.error('Invalid API key');
          } else if (err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT' || err?.message?.includes('network')) {
            console.error('Network error: Unable to connect to ElevenLabs API');
          } else {
            console.error('Error verifying API key:', err?.message || error);
          }
          process.exit(1);
        }
        
        await setApiKey(apiKey.trim());
        console.log('Login successful! API key saved securely.');
      }
    } catch (error) {
      console.error(`Error during login: ${error}`);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Logout and remove stored API key')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for logout
        const { waitUntilExit } = render(
          React.createElement(LogoutView)
        );
        await waitUntilExit();
      } else {
        // Fallback to text-based logout
        const loggedIn = await isLoggedIn();
        if (!loggedIn) {
          console.log('You are not logged in');
          return;
        }
        
        await removeApiKey();
        console.log('Logged out successfully. API key removed.');
      }
    } catch (error) {
      console.error(`Error during logout: ${error}`);
      process.exit(1);
    }
  });

program
  .command('whoami')
  .description('Show current login status')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for whoami
        const { waitUntilExit } = render(
          React.createElement(WhoamiView)
        );
        await waitUntilExit();
      } else {
        // Fallback to text-based output
        const loggedIn = await isLoggedIn();
        const apiKey = await getApiKey();
        const residency = await getResidency();
        
        if (loggedIn && apiKey) {
          const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
          console.log(`Logged in with API key: ${maskedKey}`);
          
          // Show source of API key
          if (process.env.ELEVENLABS_API_KEY) {
            console.log('Source: Environment variable');
          } else {
            console.log('Source: Config file');
          }
          
          console.log(`Residency: ${residency}`);
        } else {
          console.log('Not logged in');
          console.log('Use "agents login" to authenticate');
        }
      }
    } catch (error) {
      console.error(`Error checking login status: ${error}`);
      process.exit(1);
    }
  });

program
  .command('residency')
  .description('Set the API residency location')
  .argument('[residency]', `Residency location (${LOCATIONS.join(', ')})`)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (residency: string | undefined, options: { ui: boolean }) => {
    try {
      if (options.ui !== false && !residency) {
        // Use Ink UI for interactive residency selection
        const { waitUntilExit } = render(
          React.createElement(ResidencyView)
        );
        await waitUntilExit();
      } else if (residency) {
        // Direct residency setting (with or without UI)
        function isValidLocation(value: string): value is Location {
          return LOCATIONS.includes(value as Location);
        }
        
        if (!isValidLocation(residency)) {
          console.error(`Invalid residency: ${residency}`);
          console.error(`Valid options: ${LOCATIONS.join(', ')}`);
          process.exit(1);
        }
        
        if (options.ui !== false) {
          // Use UI even with direct argument
          const { waitUntilExit } = render(
            React.createElement(ResidencyView, { initialResidency: residency })
          );
          await waitUntilExit();
        } else {
          // Fallback to text-based
          await setResidency(residency);
          console.log(`Residency set to: ${residency}`);
        }
      } else {
        // No residency provided and UI disabled - show current residency
        const currentResidency = await getResidency();
        console.log(`Current residency: ${currentResidency || 'Not set (using default)'}`);
        console.log(`To set residency, use: agents residency <${LOCATIONS.join('|')}>`);
      }
    } catch (error) {
      console.error(`Error setting residency: ${error}`);
      process.exit(1);
    }
  });

program
  .command('add')
  .description('Add a new agent - creates config, uploads to ElevenLabs, and saves ID')
  .argument('<name>', 'Name of the agent to create')
  .option('--config-path <path>', 'Custom config path (optional)')
  .option('--template <template>', 'Template type to use', 'default')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (name: string, options: AddOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false && !options.configPath) {
        // Use Ink UI for agent creation
        const { waitUntilExit } = render(
          React.createElement(AddAgentView, {
            initialName: name,
            template: options.template
          })
        );
        await waitUntilExit();
        return;
      }
      // Check if agents.json exists
      const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
      if (!(await fs.pathExists(agentsConfigPath))) {
        console.error('agents.json not found. Run \'agents init\' first.');
        process.exit(1);
      }
      
      // Load existing config
      const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
      
      // Create agent config using template (in memory first)
      let agentConfig: AgentConfig;
      try {
        agentConfig = getTemplateByName(name, options.template);
      } catch (error) {
        console.error(`${error}`);
        process.exit(1);
      }
      
      // Create agent in ElevenLabs first to get ID
      console.log(`Creating agent '${name}' in ElevenLabs...`);
      
      const client = await getElevenLabsClient();
      
      // Extract config components
      const conversationConfig = agentConfig.conversation_config || {};
      const platformSettings = agentConfig.platform_settings;
      const tags = agentConfig.tags || [];
      
      // Create new agent
      const agentId = await createAgentApi(
        client,
        name,
        conversationConfig,
        platformSettings,
        tags
      );
      
      console.log(`Created agent in ElevenLabs with ID: ${agentId}`);
      
      // Generate config path using agent name (or custom path if provided)
      let configPath = options.configPath;
      if (!configPath) {
        configPath = await generateUniqueFilename('agent_configs', name);
      }
      
      // Create config directory and file
      const configFilePath = path.resolve(configPath);
      await fs.ensureDir(path.dirname(configFilePath));
      
      await writeConfig(configFilePath, agentConfig);
      console.log(`Created config file: ${configPath} (template: ${options.template})`);
      
      // Store agent ID in index file
      const newAgent: AgentDefinition = {
        name,
        config: configPath,
        id: agentId
      };
      agentsConfig.agents.push(newAgent);
      
      // Save updated agents.json
      await writeConfig(agentsConfigPath, agentsConfig);
      console.log(`Added agent '${name}' to agents.json`);
      
      console.log(`Edit ${configPath} to customize your agent, then run 'agents push' to update`);
      
    } catch (error) {
      console.error(`Error creating agent: ${error}`);
      process.exit(1);
    }
  });

program
  .command('add-webhook-tool')
  .description('Add a new webhook tool - creates config and uploads to ElevenLabs')
  .argument('<name>', 'Name of the webhook tool to create')
  .option('--config-path <path>', 'Custom config path (optional)')
  .action(async (name: string, options: { configPath?: string }) => {
    try {
      await addTool(name, 'webhook', options.configPath);
    } catch (error) {
      console.error(`Error creating webhook tool: ${error}`);
      process.exit(1);
    }
  });

program
  .command('add-client-tool')
  .description('Add a new client tool - creates config and uploads to ElevenLabs')
  .argument('<name>', 'Name of the client tool to create')
  .option('--config-path <path>', 'Custom config path (optional)')
  .action(async (name: string, options: { configPath?: string }) => {
    try {
      await addTool(name, 'client', options.configPath);
    } catch (error) {
      console.error(`Error creating client tool: ${error}`);
      process.exit(1);
    }
  });

const templatesCommand = program
  .command('templates')
  .description('Manage agent templates');

templatesCommand
  .command('list')
  .description('List available agent templates')
  .action(() => {
    const templateOptions = getTemplateOptions();
    
    console.log('Available Agent Templates:');
    console.log('='.repeat(40));
    
    for (const [templateName, description] of Object.entries(templateOptions)) {
      console.log(`\n${templateName}`);
      console.log(`   ${description}`);
    }
    
    console.log('\nUse \'agents add <name> --template <template_name>\' to create an agent with a specific template');
  });

templatesCommand
  .command('show')
  .description('Show the configuration for a specific template')
  .argument('<template>', 'Template name to show')
  .option('--agent-name <name>', 'Agent name to use in template', 'example_agent')
  .action((templateName: string, options: TemplateShowOptions) => {
    try {
      const templateConfig = getTemplateByName(options.agentName, templateName);
      console.log(`Template: ${templateName}`);
      console.log('='.repeat(40));
      console.log(JSON.stringify(templateConfig, null, 2));
    } catch (error) {
      console.error(`${error}`);
      process.exit(1);
    }
  });

program
  .command('push')
  .description('Push agents to ElevenLabs API when configs change')
  .option('--agent <name>', 'Specific agent name to push (defaults to all agents)')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: PushOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use new Ink UI for push
        const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
        if (!(await fs.pathExists(agentsConfigPath))) {
          throw new Error('agents.json not found. Run \'init\' first.');
        }
        
        const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
        
        // Filter agents if specific agent name provided
        let agentsToProcess = agentsConfig.agents;
        if (options.agent) {
          agentsToProcess = agentsConfig.agents.filter(agent => agent.name === options.agent);
          if (agentsToProcess.length === 0) {
            throw new Error(`Agent '${options.agent}' not found in configuration`);
          }
        }
        
        // Prepare agents for UI
        const pushAgentsData = agentsToProcess.map(agent => ({
          name: agent.name,
          configPath: agent.config,
          status: 'pending' as const,
          agentId: agent.id
        }));
        
        const { waitUntilExit } = render(
          React.createElement(PushView, { 
            agents: pushAgentsData,
            dryRun: options.dryRun
          })
        );
        await waitUntilExit();
      } else {
        // Use existing non-UI push
        await pushAgents(options.agent, options.dryRun);
      }
    } catch (error) {
      console.error(`Error during push: ${error}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show the status of agents')
  .option('--agent <name>', 'Specific agent name to check (defaults to all agents)')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: StatusOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for status display
        const { waitUntilExit } = render(
          React.createElement(StatusView, {
            agentName: options.agent
          })
        );
        await waitUntilExit();
      } else {
        await showStatus(options.agent);
      }
    } catch (error) {
      console.error(`Error showing status: ${error}`);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for config changes and auto-push agents')
  .option('--agent <name>', 'Specific agent name to watch (defaults to all agents)')
  .option('--interval <seconds>', 'Check interval in seconds', '5')
  .action(async (options: WatchOptions) => {
    try {
      await watchForChanges(options.agent, parseInt(options.interval));
    } catch (error) {
      console.error(`Error in watch mode: ${error}`);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all configured agents')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for list-agents
        const { waitUntilExit } = render(
          React.createElement(ListAgentsView)
        );
        await waitUntilExit();
      } else {
        // Fallback to text-based listing
        await listConfiguredAgents();
      }
    } catch (error) {
      console.error(`Error listing agents: ${error}`);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete an agent locally and from ElevenLabs')
  .argument('<agent_id>', 'ID of the agent to delete')
  .action(async (agentId: string) => {
    try {
      await deleteAgent(agentId);
    } catch (error) {
      console.error(`Error deleting agent: ${error}`);
      process.exit(1);
    }
  });

program
  .command('pull')
  .description('Pull all agents from ElevenLabs workspace and add them to local configuration')
  .option('--agent <id>', 'Specific agent ID to pull')
  .option('--output-dir <dir>', 'Directory to store pulled agent configs', 'agent_configs')
  .option('--update', 'Update existing agents only (skip new)', false)
  .option('--all', 'Pull all agents (new + existing)', false)
  .option('--dry-run', 'Show what would be pulled without making changes', false)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: PullOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for pull
        const { waitUntilExit } = render(
          React.createElement(PullView, {
            agent: options.agent,
            outputDir: options.outputDir,
            dryRun: options.dryRun,
            update: options.update,
            all: options.all
          })
        );
        await waitUntilExit();
      } else {
        // Use existing non-UI pull
        await pullAgents(options);
      }
    } catch (error) {
      console.error(`Error pulling agents: ${error}`);
      process.exit(1);
    }
  });

program
  .command('pull-tools')
  .description('Pull all tools from ElevenLabs workspace and add them to local configuration')
  .option('--tool <id>', 'Specific tool ID to pull')
  .option('--output-dir <dir>', 'Directory to store pulled tool configs', 'tool_configs')
  .option('--update', 'Update existing tools only (skip new)', false)
  .option('--all', 'Pull all tools (new + existing)', false)
  .option('--dry-run', 'Show what would be pulled without making changes', false)
  .option('--no-ui', 'Disable interactive UI', false)
  .action(async (options: PullToolsOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for pull-tools
        const { waitUntilExit } = render(
          React.createElement(PullToolsView, {
            tool: options.tool,
            outputDir: options.outputDir,
            dryRun: options.dryRun,
            update: options.update,
            all: options.all
          })
        );
        await waitUntilExit();
      } else {
        // Fallback to text-based pulling
        await pullTools(options);
      }
    } catch (error) {
      console.error(`Error pulling tools: ${error}`);
      process.exit(1);
    }
  });

program
  .command('widget')
  .description('Generate HTML widget snippet for an agent')
  .argument('<name>', 'Name of the agent to generate widget for')
  .action(async (name: string) => {
    try {
      await generateWidget(name);
    } catch (error) {
      console.error(`Error generating widget: ${error}`);
      process.exit(1);
    }
  });

program
  .command('add-test')
  .description('Add a new test - creates config and uploads to ElevenLabs')
  .argument('<name>', 'Name of the test to create')
  .option('--template <template>', 'Test template type to use', 'basic-llm')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (name: string, options: { template: string; ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for test creation
        const { waitUntilExit } = render(
          React.createElement(AddTestView, {
            initialName: name
          })
        );
        await waitUntilExit();
      } else {
        await addTest(name, options.template);
      }
    } catch (error) {
      console.error(`Error creating test: ${error}`);
      process.exit(1);
    }
  });

program
  .command('push-tests')
  .description('Push tests to ElevenLabs API when configs change')
  .option('--test <name>', 'Specific test name to push (defaults to all tests)')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { test?: string; dryRun: boolean; ui: boolean }) => {
    try {
      // For now, always use non-UI mode (UI can be added later if needed)
      await pushTests(options.test, options.dryRun);
    } catch (error) {
      console.error(`Error during test push: ${error}`);
      process.exit(1);
    }
  });

program
  .command('push-tools')
  .description('Push tools to ElevenLabs API when configs change')
  .option('--tool <name>', 'Specific tool name to push (defaults to all tools)')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { tool?: string; dryRun: boolean; ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use new Ink UI for push-tools
        const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
        if (!(await fs.pathExists(toolsConfigPath))) {
          throw new Error('tools.json not found. Run \'agents add-webhook-tool\' or \'agents add-client-tool\' first.');
        }

        const toolsConfig = await readToolsConfig(toolsConfigPath);

        // Filter tools if specific tool name provided
        let toolsToProcess = toolsConfig.tools;
        if (options.tool) {
          toolsToProcess = toolsConfig.tools.filter(tool => tool.name === options.tool);
          if (toolsToProcess.length === 0) {
            throw new Error(`Tool '${options.tool}' not found in configuration`);
          }
        }


        // Prepare tools for UI
        const pushToolsData = toolsToProcess.map(tool => ({
          name: tool.name,
          type: tool.type,
          configPath: tool.config || `tool_configs/${tool.name}.json`,
          status: 'pending' as const,
          toolId: tool.id
        }));

        const { waitUntilExit } = render(
          React.createElement(PushToolsView, {
            tools: pushToolsData,
            dryRun: options.dryRun,
            toolsConfigPath: toolsConfigPath
          })
        );
        await waitUntilExit();
      } else {
        // Use existing non-UI push
        await pushTools(options.tool, options.dryRun);
      }
    } catch (error) {
      console.error(`Error during tool push: ${error}`);
      process.exit(1);
    }
  });

program
  .command('pull-tests')
  .description('Pull all tests from ElevenLabs workspace and add them to local configuration')
  .option('--test <id>', 'Specific test ID to pull')
  .option('--output-dir <dir>', 'Directory to store pulled test configs', 'test_configs')
  .option('--update', 'Update existing tests only (skip new)', false)
  .option('--all', 'Pull all tests (new + existing)', false)
  .option('--dry-run', 'Show what would be pulled without making changes', false)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: { test?: string; outputDir: string; dryRun: boolean; update?: boolean; all?: boolean; ui: boolean }) => {
    try {
      // For now, always use non-UI mode (UI can be added later if needed)
      await pullTests(options);
    } catch (error) {
      console.error(`Error pulling tests: ${error}`);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run tests attached to an agent')
  .argument('<agentName>', 'Name of the agent to test')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (agentName: string, options: { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        await runAgentTestsWithUI(agentName);
      } else {
        await runAgentTests(agentName);
      }
    } catch (error) {
      console.error(`Error running tests: ${error}`);
      process.exit(1);
    }
  });

const componentsCommand = program
  .command('components')
  .description('Import components from the ElevenLabs UI registry (https://ui.elevenlabs.io)');

componentsCommand
  .command('add')
  .description('Add a new component from the ElevenLabs UI registry')
  .argument('[name]', 'Name of the component')
  .action(async (name?: string) => {
    function getCommandPrefix(): string {
      if (process.env.npm_config_user_agent) {
        const userAgent = process.env.npm_config_user_agent;

        if (userAgent.includes('pnpm')) {
          return 'pnpm dlx';
        }
        if (userAgent.includes('yarn')) {
          return 'yarn dlx';
        }
        if (userAgent.includes('bun')) {
          return 'bunx';
        }
      }

      return 'npx -y';
    }

    const commandPrefix = getCommandPrefix();

    const component = name || 'all';

    const targetUrl = new URL(
      `/r/${component}.json`,
      'https://ui.elevenlabs.io'
    ).toString();

    const fullCommand = `${commandPrefix} shadcn@latest add ${targetUrl}`;

    console.log(`Installing ${component} from ElevenLabs UI registry...`);
    console.log(`Running: ${fullCommand}`);

    const result = spawnSync(fullCommand, {
      stdio: 'inherit',
      shell: true,
    });

    if (result.error) {
      console.error('Failed to execute command:', result.error.message);
      process.exit(1);
    } else if (result.status !== 0) {
      console.error(`Command failed with exit code ${result.status}`);
      process.exit(1);
    }
  });

// Helper functions

async function addTool(name: string, type: 'webhook' | 'client', configPath?: string): Promise<void> {
  // Check if tools.json exists, create if not
  const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
  let toolsConfig: ToolsConfig;
  
  try {
    toolsConfig = await readToolsConfig(toolsConfigPath);
  } catch (error) {
    // Initialize tools.json if it doesn't exist
    toolsConfig = { tools: [] };
    await writeToolsConfig(toolsConfigPath, toolsConfig);
    console.log(`Created ${TOOLS_CONFIG_FILE}`);
  }
  
  // Check if tool already exists
  const existingTool = toolsConfig.tools.find(tool => tool.name === name);
  
  if (existingTool && existingTool.id) {
    // Check if the tool already has an ID in the index file
    console.error(`Tool '${name}' already exists with ID: ${existingTool.id}`);
    process.exit(1);
  }
  
  // Create tool config using appropriate template (in memory first)
  let toolConfig;
  if (type === 'webhook') {
    toolConfig = {
      name,
      description: `${name} webhook tool`,
      type: 'webhook' as const,
      api_schema: {
        url: 'https://api.example.com/webhook',
        method: 'POST',
        path_params_schema: [],
        query_params_schema: [],
        request_body_schema: {
          id: 'body',
          type: 'object',
          value_type: 'llm_prompt',
          description: 'Request body for the webhook',
          dynamic_variable: '',
          constant_value: '',
          required: true,
          properties: []
        },
        request_headers: [
          {
            type: 'value' as const,
            name: 'Content-Type',
            value: 'application/json'
          }
        ],
        auth_connection: null
      },
      response_timeout_secs: 30,
      dynamic_variables: {
        dynamic_variable_placeholders: {}
      }
    };
  } else {
    toolConfig = {
      name,
      description: `${name} client tool`,
      type: 'client' as const,
      expects_response: false,
      response_timeout_secs: 30,
      parameters: [
        {
          id: 'input',
          type: 'string',
          value_type: 'llm_prompt',
          description: 'Input parameter for the client tool',
          dynamic_variable: '',
          constant_value: '',
          required: true
        }
      ],
      dynamic_variables: {
        dynamic_variable_placeholders: {}
      }
    };
  }
  
  // Create tool in ElevenLabs first to get ID
  console.log(`Creating ${type} tool '${name}' in ElevenLabs...`);
  
  const client = await getElevenLabsClient();
  
  try {
    const response = await createToolApi(client, toolConfig);
    const toolId = (response as { toolId?: string }).toolId || `tool_${Date.now()}`;
    
    console.log(`Created tool in ElevenLabs with ID: ${toolId}`);
    
    // Generate config path using tool name (or custom path if provided)
    if (!configPath) {
      configPath = await generateUniqueFilename('tool_configs', name);
    }
    
    // Create config directory and file
    const configFilePath = path.resolve(configPath);
    await fs.ensureDir(path.dirname(configFilePath));
    
    await writeToolConfig(configFilePath, toolConfig);
    console.log(`Created config file: ${configPath}`);
    
    // Add to tools.json if not already present
    if (!existingTool) {
      const newTool: ToolDefinition = {
        name,
        type,
        config: configPath,
        id: toolId
      };
      toolsConfig.tools.push(newTool);
      await writeToolsConfig(toolsConfigPath, toolsConfig);
      console.log(`Added tool '${name}' to tools.json`);
    }
    
    console.log(`Edit ${configPath} to customize your tool, then run 'agents push-tools' to update`);
    
  } catch (error) {
    console.error(`Error creating tool in ElevenLabs: ${error}`);
    process.exit(1);
  }
}

async function pushAgents(agentName?: string, dryRun = false): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  
  // Initialize ElevenLabs client
  let client;
  if (!dryRun) {
    client = await getElevenLabsClient();
  }
  
  // Filter agents if specific agent name provided
  let agentsToProcess = agentsConfig.agents;
  if (agentName) {
    agentsToProcess = agentsConfig.agents.filter(agent => agent.name === agentName);
    if (agentsToProcess.length === 0) {
      throw new Error(`Agent '${agentName}' not found in configuration`);
    }
  }
  
  let changesMade = false;
  
  for (const agentDef of agentsToProcess) {
    const agentDefName = agentDef.name;
    const configPath = agentDef.config;
    
    if (!configPath) {
      console.log(`Warning: No config path found for agent '${agentDefName}'`);
      continue;
    }
    
    // Check if config file exists
    if (!(await fs.pathExists(configPath))) {
      console.log(`Warning: Config file not found for ${agentDefName}: ${configPath}`);
      continue;
    }
    
    // Load agent config
    let agentConfig: AgentConfig;
    try {
      agentConfig = await readConfig<AgentConfig>(configPath);
    } catch (error) {
      console.log(`Error reading config for ${agentDefName}: ${error}`);
      continue;
    }
    
    // Get agent ID from index file
    const agentId = agentDef.id;
    
    // Always push (force override)
    console.log(`${agentDefName}: Will push (force override)`);
    
    if (dryRun) {
      console.log(`[DRY RUN] Would update agent: ${agentDefName}`);
      continue;
    }
    
    // Perform API operation
    try {
      // Extract config components
      const conversationConfig = agentConfig.conversation_config || {};
      const platformSettings = agentConfig.platform_settings;
      const tags = agentConfig.tags || [];
      
      const agentDisplayName = agentConfig.name || agentDefName;
      
      if (!agentId) {
        // Create new agent
        const newAgentId = await createAgentApi(
          client!,
          agentDisplayName,
          conversationConfig,
          platformSettings,
          tags
        );
        console.log(`Created agent ${agentDefName} (ID: ${newAgentId})`);
        
        // Store agent ID in index file
        agentDef.id = newAgentId;
        changesMade = true;
      } else {
        // Update existing agent
        await updateAgentApi(
          client!,
          agentId,
          agentDisplayName,
          conversationConfig,
          platformSettings,
          tags
        );
        console.log(`Updated agent ${agentDefName} (ID: ${agentId})`);
      }
      
      changesMade = true;
      
    } catch (error) {
      console.log(`Error processing ${agentDefName}: ${error}`);
    }
  }
  
  // Save updated agents.json if there were changes
  if (changesMade) {
    await writeConfig(agentsConfigPath, agentsConfig);
  }
}

async function showStatus(agentName?: string): Promise<void> {
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  
  if (agentsConfig.agents.length === 0) {
    console.log('No agents configured');
    return;
  }
  
  // Filter agents if specific agent name provided
  let agentsToShow = agentsConfig.agents;
  if (agentName) {
    agentsToShow = agentsConfig.agents.filter(agent => agent.name === agentName);
    if (agentsToShow.length === 0) {
      throw new Error(`Agent '${agentName}' not found in configuration`);
    }
  }
  
  console.log('Agent Status:');
  console.log('='.repeat(50));
  
  for (const agentDef of agentsToShow) {
    const agentNameCurrent = agentDef.name;
    const configPath = agentDef.config;
    
    if (!configPath) {
      continue;
    }
    
    console.log(`\n${agentNameCurrent}`);
    console.log(`   Config: ${configPath}`);
    
    // Get agent ID from index file
    const agentId = agentDef.id || 'Not created yet';
    console.log(`   Agent ID: ${agentId}`);
    
    // Check config file status
    if (await fs.pathExists(configPath)) {
      try {
        await readConfig<AgentConfig>(configPath);
        
        // Simple status based on whether ID exists
        if (agentDef.id) {
          console.log(`   Status: Created (use push to update)`);
        } else {
          console.log(`   Status: Not pushed yet`);
        }
        
      } catch (error) {
        console.log(`   Status: Config error: ${error}`);
      }
    } else {
      console.log('   Status: Config file not found');
    }
  }
}

async function watchForChanges(agentName?: string, interval = 5): Promise<void> {
  console.log(`Watching for config changes (checking every ${interval}s)...`);
  if (agentName) {
    console.log(`Agent: ${agentName}`);
  } else {
    console.log('Agent: All agents');
  }
  console.log('Press Ctrl+C to stop');
  
  // Track file modification times
  const fileTimestamps = new Map<string, number>();
  
  const getFileMtime = async (filePath: string): Promise<number> => {
    try {
      const exists = await fs.pathExists(filePath);
      if (!exists) return 0;
      const stats = await fs.stat(filePath);
      return stats.mtime.getTime();
    } catch {
      return 0;
    }
  };
  
  const checkForChanges = async (): Promise<boolean> => {
    // Load agents configuration
    const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
    if (!(await fs.pathExists(agentsConfigPath))) {
      return false;
    }
    
    try {
      const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
      
      // Filter agents if specific agent name provided
      let agentsToWatch = agentsConfig.agents;
      if (agentName) {
        agentsToWatch = agentsConfig.agents.filter(agent => agent.name === agentName);
      }
      
      // Check agents.json itself
      const agentsMtime = await getFileMtime(agentsConfigPath);
      if (fileTimestamps.get(agentsConfigPath) !== agentsMtime) {
        fileTimestamps.set(agentsConfigPath, agentsMtime);
        console.log(`Detected change in ${AGENTS_CONFIG_FILE}`);
        return true;
      }
      
      // Check individual agent config files
      for (const agentDef of agentsToWatch) {
        const configPath = agentDef.config;
        if (configPath && await fs.pathExists(configPath)) {
          const configMtime = await getFileMtime(configPath);
          if (fileTimestamps.get(configPath) !== configMtime) {
            fileTimestamps.set(configPath, configMtime);
            console.log(`Detected change in ${configPath}`);
            return true;
          }
        }
      }
      
      return false;
    } catch {
      return false;
    }
  };
  
  // Initialize file timestamps
  await checkForChanges();
  
  try {
    while (true) {
      if (await checkForChanges()) {
        console.log('Running push...');
        try {
          await pushAgents(agentName, false);
        } catch (error) {
          console.log(`Error during push: ${error}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'SIGINT') {
      console.log('\nStopping watch mode');
    } else {
      throw error;
    }
  }
}

async function listConfiguredAgents(): Promise<void> {
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  
  if (agentsConfig.agents.length === 0) {
    console.log('No agents configured');
    return;
  }
  
  console.log('Configured Agents:');
  console.log('='.repeat(30));
  
  agentsConfig.agents.forEach((agentDef, i) => {
    console.log(`${i + 1}. ${agentDef.name}`);
    const configPath = agentDef.config || 'No config path';
    console.log(`   Config: ${configPath}`);
    console.log();
  });
}

/**
 * Prompts the user for confirmation. Returns true if user confirms, false otherwise.
 */
async function promptForConfirmation(message: string): Promise<boolean> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise<boolean>((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function pullAgents(options: PullOptions): Promise<void> {
  // Check if agents.json exists
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }
  
  const client = await getElevenLabsClient();
  
  // Load existing config
  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  const existingAgentNames = new Set(agentsConfig.agents.map(agent => agent.name));
  
  let agentsList: unknown[];
  
  if (options.agent) {
    // Pull specific agent by ID
    console.log(`Pulling agent with ID: ${options.agent}...`);
    try {
      const agentDetails = await getAgentApi(client, options.agent);
      const agentDetailsTyped = agentDetails as { agentId?: string; agent_id?: string; name: string };
      const agentId = agentDetailsTyped.agentId || agentDetailsTyped.agent_id || options.agent;
      agentsList = [{ 
        agentId: agentId,
        agent_id: agentId,
        name: agentDetailsTyped.name 
      }];
      console.log(`Found agent: ${agentDetailsTyped.name}`);
    } catch (error) {
      throw new Error(`Failed to fetch agent with ID '${options.agent}': ${error}`);
    }
  } else {
    // Pull all agents from ElevenLabs
    console.log('Pulling all agents from ElevenLabs...');
    agentsList = await listAgentsApi(client, 30);
    
    if (agentsList.length === 0) {
      console.log('No agents found in your ElevenLabs workspace.');
      return;
    }
    
    console.log(`Found ${agentsList.length} agent(s)`);
  }
  
  // Build map of existing agents by ID for quick lookup
  const existingAgentIds = new Map(
    agentsConfig.agents.map(agent => [agent.id, agent])
  );

  // Track operations for summary
  const operations = { create: 0, update: 0, skip: 0 };
  type OperationItem = {
    action: 'create' | 'update' | 'skip';
    agent: { id: string; name: string };
    existingEntry?: AgentDefinition;
  };
  const itemsToProcess: OperationItem[] = [];

  // First pass: determine what will happen
  for (const agentMeta of agentsList) {
    const agentMetaTyped = agentMeta as { agentId?: string; agent_id?: string; name: string };
    const agentId = agentMetaTyped.agentId || agentMetaTyped.agent_id;
    if (!agentId) {
      console.log(`Warning: Skipping agent '${agentMetaTyped.name}' - no agent ID found`);
      continue;
    }
    
    let agentNameRemote = agentMetaTyped.name;
    const existingEntry = existingAgentIds.get(agentId);
    
    if (existingEntry) {
      // Agent with this ID already exists locally
      if (options.update || options.all) {
        // --update or --all: update existing
        itemsToProcess.push({ action: 'update', agent: { id: agentId, name: agentNameRemote }, existingEntry });
        operations.update++;
      } else {
        // Default: skip existing
        itemsToProcess.push({ action: 'skip', agent: { id: agentId, name: agentNameRemote }, existingEntry });
        operations.skip++;
      }
    } else {
      // New agent (not present locally)
      if (options.update) {
        // --update mode: skip new items (only update existing)
        itemsToProcess.push({ action: 'skip', agent: { id: agentId, name: agentNameRemote } });
        operations.skip++;
      } else {
        // Default or --all: create new items
        // Check for name conflicts
        if (existingAgentNames.has(agentNameRemote)) {
          let counter = 1;
          const originalName = agentNameRemote;
          while (existingAgentNames.has(agentNameRemote)) {
            agentNameRemote = `${originalName}_${counter}`;
            counter++;
          }
        }
        itemsToProcess.push({ action: 'create', agent: { id: agentId, name: agentNameRemote } });
        operations.create++;
        existingAgentNames.add(agentNameRemote);
      }
    }
  }

  // Show summary
  console.log(`\nPlan: ${operations.create} create, ${operations.update} update, ${operations.skip} skip`);
  
  if (operations.skip > 0 && !options.update && !options.all) {
    if (operations.create === 0) {
      console.log(`\n💡 Tip: Use --update to update existing agents or --all to pull everything`);
    } else {
      console.log(`\n💡 Tip: Use --all to also update existing agents`);
    }
  }

  // Prompt for confirmation if not --dry-run
  if (!options.dryRun && (operations.create > 0 || operations.update > 0)) {
    const confirmed = await promptForConfirmation('Proceed?');
    if (!confirmed) {
      console.log('Pull cancelled');
      return;
    }
  }

  // Second pass: execute operations
  let itemsProcessed = 0;
  for (const item of itemsToProcess) {
    const { action, agent, existingEntry } = item;
    
    if (action === 'skip') {
      console.log(`⊘ Skipping '${agent.name}' (already exists, use --update to overwrite)`);
      continue;
    }
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would ${action} agent: ${agent.name} (ID: ${agent.id})`);
      continue;
    }
    
    try {
      // Fetch detailed agent configuration
      console.log(`${action === 'update' ? '↻ Updating' : '+ Pulling'} config for '${agent.name}'...`);
      const agentDetails = await getAgentApi(client, agent.id);
      
      // Extract configuration components
      const agentDetailsTyped = agentDetails as {
        conversationConfig: Record<string, unknown>;
        conversation_config: Record<string, unknown>;
        platformSettings: Record<string, unknown>;
        platform_settings: Record<string, unknown>;
        tags: string[];
      };

      const conversationConfig = agentDetailsTyped.conversationConfig || agentDetailsTyped.conversation_config || {};
      const platformSettings = agentDetailsTyped.platformSettings || agentDetailsTyped.platform_settings || {};
      const tags = agentDetailsTyped.tags || [];
      
      // Create agent config structure (without agent_id - it goes in index file)
      const agentConfig: AgentConfig = {
        name: agent.name,
        conversation_config: conversationConfig as AgentConfig['conversation_config'],
        platform_settings: platformSettings,
        tags
      };
      
      if (action === 'update' && existingEntry) {
        // Update existing entry - overwrite the config file
        const configFilePath = path.resolve(existingEntry.config);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeConfig(configFilePath, agentConfig);
        console.log(`  ✓ Updated '${agent.name}' (config: ${existingEntry.config})`);
      } else {
        // Create new entry
        const configPath = await generateUniqueFilename(options.outputDir, agent.name);
        const configFilePath = path.resolve(configPath);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeConfig(configFilePath, agentConfig);
        
        const newAgent: AgentDefinition = {
          name: agent.name,
          config: configPath,
          id: agent.id
        };
        
        agentsConfig.agents.push(newAgent);
        console.log(`  ✓ Added '${agent.name}' (config: ${configPath})`);
      }
      
      itemsProcessed++;
      
    } catch (error) {
      console.log(`  ✗ Error ${action === 'update' ? 'updating' : 'pulling'} agent '${agent.name}': ${error}`);
      continue;
    }
  }
  
  // Save updated agents.json if there were changes
  if (!options.dryRun && itemsProcessed > 0) {
    await writeConfig(agentsConfigPath, agentsConfig);
    console.log(`\nUpdated ${AGENTS_CONFIG_FILE}`);
  }
  
  // Final summary
  if (options.dryRun) {
    console.log(`\n[DRY RUN] Would process ${operations.create + operations.update} agent(s)`);
  } else {
    console.log(`\n✓ Summary: ${operations.create} created, ${operations.update} updated, ${operations.skip} skipped`);
    if (itemsProcessed > 0) {
      console.log(`You can now edit the config files in '${options.outputDir}/' and run 'agents push' to update`);
    }
  }
}

async function pullTools(options: PullToolsOptions): Promise<void> {
  // Check if tools.json exists, create if not
  const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
  let toolsConfig: ToolsConfig;

  if (!(await fs.pathExists(toolsConfigPath))) {
    console.log(`${TOOLS_CONFIG_FILE} not found. Creating initial tools configuration...`);
    toolsConfig = { tools: [] };
    await writeToolsConfig(toolsConfigPath, toolsConfig);
  } else {
    toolsConfig = await readToolsConfig(toolsConfigPath);
  }

  const client = await getElevenLabsClient();

  const existingToolNames = new Set(toolsConfig.tools.map(tool => tool.name));

  let filteredTools: unknown[];

  if (options.tool) {
    // Pull specific tool by ID
    console.log(`Pulling tool with ID: ${options.tool}...`);
    try {
      const toolDetails = await getToolApi(client, options.tool);
      const toolDetailsTyped = toolDetails as { tool_id?: string; toolId?: string; id?: string; tool_config?: { name?: string } & Tool };
      const toolId = toolDetailsTyped.tool_id || toolDetailsTyped.toolId || toolDetailsTyped.id || options.tool;
      const toolName = toolDetailsTyped.tool_config?.name;
      
      if (!toolName) {
        throw new Error(`Tool with ID '${options.tool}' has no name`);
      }
      
      filteredTools = [{
        tool_id: toolId,
        toolId: toolId,
        id: toolId,
        tool_config: toolDetailsTyped.tool_config
      }];
      console.log(`Found tool: ${toolName}`);
    } catch (error) {
      throw new Error(`Failed to fetch tool with ID '${options.tool}': ${error}`);
    }
  } else {
    // Pull all tools from ElevenLabs
    console.log('Pulling all tools from ElevenLabs...');
    const toolsList = await listToolsApi(client);

    if (toolsList.length === 0) {
      console.log('No tools found in your ElevenLabs workspace.');
      return;
    }

    console.log(`Found ${toolsList.length} tool(s)`);
    filteredTools = toolsList;
  }

  // Build map of existing tools by ID for quick lookup
  const existingToolIds = new Map(
    toolsConfig.tools.map(tool => [tool.id, tool])
  );

  // Track operations for summary
  const operations = { create: 0, update: 0, skip: 0 };
  type OperationItem = {
    action: 'create' | 'update' | 'skip';
    tool: { id: string; name: string };
    existingEntry?: ToolDefinition;
  };
  const itemsToProcess: OperationItem[] = [];

  // First pass: determine what will happen
  for (const toolMeta of filteredTools) {
    const toolMetaTyped = toolMeta as { tool_id?: string; toolId?: string; id?: string; tool_config?: { name?: string } };
    const toolId = toolMetaTyped.tool_id || toolMetaTyped.toolId || toolMetaTyped.id;
    const toolName = toolMetaTyped.tool_config?.name;
    if (!toolId) {
      console.log(`Warning: Skipping tool '${toolName || 'unknown'}' - no tool ID found`);
      continue;
    }
    if (!toolName) {
      console.log(`Warning: Skipping tool with ID '${toolId}' - no tool name found`);
      continue;
    }

    let toolNameRemote = toolName;
    const existingEntry = existingToolIds.get(toolId);

    if (existingEntry) {
      // Tool with this ID already exists locally
      if (options.update || options.all) {
        // --update or --all: update existing
        itemsToProcess.push({ action: 'update', tool: { id: toolId, name: toolNameRemote }, existingEntry });
        operations.update++;
      } else {
        // Default: skip existing
        itemsToProcess.push({ action: 'skip', tool: { id: toolId, name: toolNameRemote }, existingEntry });
        operations.skip++;
      }
    } else {
      // New tool (not present locally)
      if (options.update) {
        // --update mode: skip new items (only update existing)
        itemsToProcess.push({ action: 'skip', tool: { id: toolId, name: toolNameRemote } });
        operations.skip++;
      } else {
        // Default or --all: create new items
        // Check for name conflicts
        if (existingToolNames.has(toolNameRemote)) {
          let counter = 1;
          const originalName = toolNameRemote;
          while (existingToolNames.has(toolNameRemote)) {
            toolNameRemote = `${originalName}_${counter}`;
            counter++;
          }
        }
        itemsToProcess.push({ action: 'create', tool: { id: toolId, name: toolNameRemote } });
        operations.create++;
        existingToolNames.add(toolNameRemote);
      }
    }
  }

  // Show summary
  console.log(`\nPlan: ${operations.create} create, ${operations.update} update, ${operations.skip} skip`);
  
  if (operations.skip > 0 && !options.update && !options.all) {
    if (operations.create === 0) {
      console.log(`\n💡 Tip: Use --update to update existing tools or --all to pull everything`);
    } else {
      console.log(`\n💡 Tip: Use --all to also update existing tools`);
    }
  }

  // Prompt for confirmation if not --dry-run
  if (!options.dryRun && (operations.create > 0 || operations.update > 0)) {
    const confirmed = await promptForConfirmation('Proceed?');
    if (!confirmed) {
      console.log('Pull cancelled');
      return;
    }
  }

  // Second pass: execute operations
  let itemsProcessed = 0;
  for (const item of itemsToProcess) {
    const { action, tool, existingEntry } = item;
    
    if (action === 'skip') {
      console.log(`⊘ Skipping '${tool.name}' (already exists, use --update to overwrite)`);
      continue;
    }
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would ${action} tool: ${tool.name} (ID: ${tool.id})`);
      continue;
    }
    
    try {
      // Fetch detailed tool configuration
      console.log(`${action === 'update' ? '↻ Updating' : '+ Pulling'} config for '${tool.name}'...`);
      const toolDetails = await getToolApi(client, tool.id);

      // Extract the tool_config from the response
      const toolDetailsTyped = toolDetails as { tool_config?: Tool & { type?: string } };
      const toolConfig = toolDetailsTyped.tool_config;
      
      if (!toolConfig) {
        console.log(`  ✗ Warning: No tool_config found for '${tool.name}' - skipping`);
        continue;
      }
      
      // Determine tool type from the tool_config
      const toolType = toolConfig.type || 'unknown';
      
      if (action === 'update' && existingEntry && existingEntry.config) {
        // Update existing entry - overwrite the config file
        const configFilePath = path.resolve(existingEntry.config);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeToolConfig(configFilePath, toolConfig as Tool);
        console.log(`  ✓ Updated '${tool.name}' (config: ${existingEntry.config})`);
      } else {
        // Create new entry
        const configPath = await generateUniqueFilename(options.outputDir, tool.name);
        const configFilePath = path.resolve(configPath);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeToolConfig(configFilePath, toolConfig as Tool);
        
        const newTool: ToolDefinition = {
          name: tool.name,
          type: toolType as 'webhook' | 'client',
          config: configPath,
          id: tool.id
        };
        
        toolsConfig.tools.push(newTool);
        console.log(`  ✓ Added '${tool.name}' (config: ${configPath}, type: ${toolType})`);
      }
      
      itemsProcessed++;
      
    } catch (error) {
      console.log(`  ✗ Error ${action === 'update' ? 'updating' : 'pulling'} tool '${tool.name}': ${error}`);
      continue;
    }
  }

  // Save updated tools.json if there were changes
  if (!options.dryRun && itemsProcessed > 0) {
    await writeToolsConfig(toolsConfigPath, toolsConfig);
    console.log(`\nUpdated ${TOOLS_CONFIG_FILE}`);
  }

  // Final summary
  if (options.dryRun) {
    console.log(`\n[DRY RUN] Would process ${operations.create + operations.update} tool(s)`);
  } else {
    console.log(`\n✓ Summary: ${operations.create} created, ${operations.update} updated, ${operations.skip} skipped`);
    if (itemsProcessed > 0) {
      console.log(`You can now edit the config files in '${options.outputDir}/' and use them in your agents`);
    }
  }
}

async function generateWidget(name: string): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }
  
  // Check if agent exists in config
  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  const agentDef = agentsConfig.agents.find(agent => agent.name === name);
  
  if (!agentDef) {
    throw new Error(`Agent '${name}' not found in configuration`);
  }
  
  // Get agent ID from index file (agents.json)
  const agentId = agentDef.id;
  
  if (!agentId) {
    throw new Error(`Agent '${name}' not found or not yet pushed. Run 'agents push --agent ${name}' to create the agent first`);
  }
  
  const residency = await getResidency();
  
  // Generate HTML widget snippet with server-location attribute
  let htmlSnippet = `<elevenlabs-convai agent-id="${agentId}"`;
  
  // Add server-location attribute for isolated regions
  if (residency !== 'global' && residency !== 'us') {
    htmlSnippet += ` server-location="${residency}"`;
  }
  
  htmlSnippet += `></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  
  console.log(`HTML Widget for '${name}' (residency: ${residency}):`);
  console.log('='.repeat(60));
  console.log(htmlSnippet);
  console.log('='.repeat(60));
  console.log(`Agent ID: ${agentId}`);
}

// Test helper functions

async function addTest(name: string, templateType: string = "basic-llm"): Promise<void> {
  const { getTestTemplateByName } = await import('./test-templates.js');

  // Check if tests.json exists
  const testsConfigPath = path.resolve(TESTS_CONFIG_FILE);
  let testsConfig: TestsConfig;

  try {
    testsConfig = await readConfig<TestsConfig>(testsConfigPath);
  } catch (error) {
    // Initialize tests.json if it doesn't exist
    testsConfig = { tests: [] };
    await writeConfig(testsConfigPath, testsConfig);
    console.log(`Created ${TESTS_CONFIG_FILE}`);
  }

  // Check if test already exists
  const existingTest = testsConfig.tests.find(test => test.name === name);

  if (existingTest && existingTest.id) {
    // Check if the test already has an ID in the index file
    console.error(`Test '${name}' already exists with ID: ${existingTest.id}`);
    process.exit(1);
  }

  // Create test config using template (in memory first)
  const testConfig = getTestTemplateByName(name, templateType);

  // Create test in ElevenLabs first to get ID
  console.log(`Creating test '${name}' in ElevenLabs...`);

  const client = await getElevenLabsClient();

  try {
    const testApiConfig = toCamelCaseKeys(testConfig) as unknown as ElevenLabs.conversationalAi.CreateUnitTestRequest;
    const response = await createTestApi(client, testApiConfig);
    const testId = response.id;

    console.log(`Created test in ElevenLabs with ID: ${testId}`);

    // Generate config path using test name
    const configPath = await generateUniqueFilename('test_configs', name);

    // Create config directory and file
    const configFilePath = path.resolve(configPath);
    await fs.ensureDir(path.dirname(configFilePath));

    await writeConfig(configFilePath, testConfig);
    console.log(`Created config file: ${configPath} (template: ${templateType})`);

    // Add to tests.json if not already present
    if (!existingTest) {
      const newTest: TestDefinition = {
        name,
        config: configPath,
        type: templateType,
        id: testId
      };
      testsConfig.tests.push(newTest);
      await writeConfig(testsConfigPath, testsConfig);
      console.log(`Added test '${name}' to tests.json`);
    }

    console.log(`Edit ${configPath} to customize your test, then run 'agents push-tests' to update`);

  } catch (error) {
    console.error(`Error creating test in ElevenLabs: ${error}`);
    process.exit(1);
  }
}

async function pushTests(testName?: string, dryRun = false): Promise<void> {
  // Load tests configuration
  const testsConfigPath = path.resolve(TESTS_CONFIG_FILE);
  if (!(await fs.pathExists(testsConfigPath))) {
    throw new Error('tests.json not found. Run \'agents add-test\' first.');
  }

  const testsConfig = await readConfig<TestsConfig>(testsConfigPath);

  // Initialize ElevenLabs client
  let client;
  if (!dryRun) {
    client = await getElevenLabsClient();
  }

  // Filter tests if specific test name provided
  let testsToProcess = testsConfig.tests;
  if (testName) {
    testsToProcess = testsConfig.tests.filter(test => test.name === testName);
    if (testsToProcess.length === 0) {
      throw new Error(`Test '${testName}' not found in configuration`);
    }
  }

  let changesMade = false;

  for (const testDef of testsToProcess) {
    const testDefName = testDef.name;
    const configPath = testDef.config;

    // Check if config file exists
    if (!(await fs.pathExists(configPath))) {
      console.log(`Warning: Config file not found for ${testDefName}: ${configPath}`);
      continue;
    }

    // Load test config
    let testConfig;
    try {
      testConfig = await readConfig(configPath);
    } catch (error) {
      console.log(`Error reading config for ${testDefName}: ${error}`);
      continue;
    }

    // Get test ID from index file
    const testId = testDef.id;

    // Always push (force override)
    console.log(`${testDefName}: Will push (force override)`);

    if (dryRun) {
      console.log(`[DRY RUN] Would update test: ${testDefName}`);
      continue;
    }

    // Perform API operation
    try {
      const testApiConfig = toCamelCaseKeys(testConfig) as unknown as ElevenLabs.conversationalAi.CreateUnitTestRequest;

      if (!testId) {
        // Create new test
        const response = await createTestApi(client!, testApiConfig);
        const newTestId = response.id;
        console.log(`Created test ${testDefName} (ID: ${newTestId})`);
        
        // Store test ID in index file
        testDef.id = newTestId;
        changesMade = true;
      } else {
        // Update existing test
        await updateTestApi(client!, testId, testApiConfig as ElevenLabs.conversationalAi.UpdateUnitTestRequest);
        console.log(`Updated test ${testDefName} (ID: ${testId})`);
      }

      changesMade = true;

    } catch (error) {
      console.log(`Error processing ${testDefName}: ${error}`);
    }
  }
  
  // Save updated tests.json if there were changes
  if (changesMade) {
    await writeConfig(testsConfigPath, testsConfig);
  }
}

async function pushTools(toolName?: string, dryRun = false): Promise<void> {
  // Load tools configuration
  const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
  if (!(await fs.pathExists(toolsConfigPath))) {
    throw new Error('tools.json not found. Run \'agents add-webhook-tool\' or \'agents add-client-tool\' first.');
  }

  const toolsConfig = await readToolsConfig(toolsConfigPath);

  // Initialize ElevenLabs client
  let client;
  if (!dryRun) {
    client = await getElevenLabsClient();
  }

  // Filter tools if specific tool name provided
  let toolsToProcess = toolsConfig.tools;
  if (toolName) {
    toolsToProcess = toolsConfig.tools.filter(tool => tool.name === toolName);
    if (toolsToProcess.length === 0) {
      throw new Error(`Tool '${toolName}' not found in configuration`);
    }
  }

  let changesMade = false;

  for (const toolDef of toolsToProcess) {
    const toolDefName = toolDef.name;
    const configPath = toolDef.config;

    if (!configPath) {
      console.log(`Warning: No config path specified for ${toolDefName}`);
      continue;
    }

    // Check if config file exists
    if (!(await fs.pathExists(configPath))) {
      console.log(`Warning: Config file not found for ${toolDefName}: ${configPath}`);
      continue;
    }

    // Load tool config
    let toolConfig;
    try {
      toolConfig = await readConfig(configPath);
    } catch (error) {
      console.log(`Error reading config for ${toolDefName}: ${error}`);
      continue;
    }

    // Get tool ID from index file
    const toolId = toolDef.id;

    // Always push (force override)
    console.log(`${toolDefName}: Will push (force override)`);

    if (dryRun) {
      console.log(`[DRY RUN] Would update tool: ${toolDefName}`);
      continue;
    }

    // Perform API operation
    try {
      if (!toolId) {
        // Create new tool
        const response = await createToolApi(client!, toolConfig);
        const newToolId = (response as { toolId?: string }).toolId || `tool_${Date.now()}`;
        console.log(`Created tool ${toolDefName} (ID: ${newToolId})`);
        
        // Store tool ID in index file
        toolDef.id = newToolId;
        changesMade = true;
      } else {
        // Update existing tool
        await updateToolApi(client!, toolId, toolConfig);
        console.log(`Updated tool ${toolDefName} (ID: ${toolId})`);
      }

      changesMade = true;

    } catch (error) {
      console.log(`Error processing ${toolDefName}: ${error}`);
    }
  }
  
  // Save updated tools.json if there were changes
  if (changesMade) {
    await writeToolsConfig(toolsConfigPath, toolsConfig);
  }
}

async function pullTests(options: { test?: string; outputDir: string; dryRun: boolean; update?: boolean; all?: boolean }): Promise<void> {
  // Check if tests.json exists
  const testsConfigPath = path.resolve(TESTS_CONFIG_FILE);
  let testsConfig: TestsConfig;

  try {
    testsConfig = await readConfig<TestsConfig>(testsConfigPath);
  } catch (error) {
    testsConfig = { tests: [] };
    await writeConfig(testsConfigPath, testsConfig);
    console.log(`Created ${TESTS_CONFIG_FILE}`);
  }

  const client = await getElevenLabsClient();

  // Load existing config
  const existingTestNames = new Set(testsConfig.tests.map(test => test.name));

  let testsList: unknown[];

  if (options.test) {
    // Pull specific test by ID
    console.log(`Pulling test with ID: ${options.test}...`);
    try {
      const testDetails = await getTestApi(client, options.test);
      const testDetailsTyped = testDetails as { id?: string; name: string };
      const testId = testDetailsTyped.id || options.test;
      testsList = [{
        id: testId,
        name: testDetailsTyped.name
      }];
      console.log(`Found test: ${testDetailsTyped.name}`);
    } catch (error) {
      throw new Error(`Failed to fetch test with ID '${options.test}': ${error}`);
    }
  } else {
    // Fetch all tests from ElevenLabs
    console.log('Fetching all tests from ElevenLabs...');
    testsList = await listTestsApi(client, 30);

    if (testsList.length === 0) {
      console.log('No tests found in your ElevenLabs workspace.');
      return;
    }

    console.log(`Found ${testsList.length} test(s)`);
  }

  // Build map of existing tests by ID for quick lookup
  const existingTestIds = new Map(
    testsConfig.tests.map(test => [test.id, test])
  );

  // Track operations for summary
  const operations = { create: 0, update: 0, skip: 0 };
  type OperationItem = {
    action: 'create' | 'update' | 'skip';
    test: { id: string; name: string };
    existingEntry?: TestDefinition;
  };
  const itemsToProcess: OperationItem[] = [];

  // First pass: determine what will happen
  for (const testMeta of testsList) {
    const testMetaTyped = testMeta as { id?: string; name: string };
    const testId = testMetaTyped.id;
    if (!testId) {
      console.log(`Warning: Skipping test '${testMetaTyped.name}' - no test ID found`);
      continue;
    }

    let testNameRemote = testMetaTyped.name;
    const existingEntry = existingTestIds.get(testId);

    if (existingEntry) {
      // Test with this ID already exists locally
      if (options.update || options.all) {
        // --update or --all: update existing
        itemsToProcess.push({ action: 'update', test: { id: testId, name: testNameRemote }, existingEntry });
        operations.update++;
      } else {
        // Default: skip existing
        itemsToProcess.push({ action: 'skip', test: { id: testId, name: testNameRemote }, existingEntry });
        operations.skip++;
      }
    } else {
      // New test (not present locally)
      if (options.update) {
        // --update mode: skip new items (only update existing)
        itemsToProcess.push({ action: 'skip', test: { id: testId, name: testNameRemote } });
        operations.skip++;
      } else {
        // Default or --all: create new items
        // Check for name conflicts
        if (existingTestNames.has(testNameRemote)) {
          let counter = 1;
          const originalName = testNameRemote;
          while (existingTestNames.has(testNameRemote)) {
            testNameRemote = `${originalName}_${counter}`;
            counter++;
          }
        }
        itemsToProcess.push({ action: 'create', test: { id: testId, name: testNameRemote } });
        operations.create++;
        existingTestNames.add(testNameRemote);
      }
    }
  }

  // Show summary
  console.log(`\nPlan: ${operations.create} create, ${operations.update} update, ${operations.skip} skip`);
  
  if (operations.skip > 0 && !options.update && !options.all) {
    if (operations.create === 0) {
      console.log(`\n💡 Tip: Use --update to update existing tests or --all to pull everything`);
    } else {
      console.log(`\n💡 Tip: Use --all to also update existing tests`);
    }
  }

  // Prompt for confirmation if not --dry-run
  if (!options.dryRun && (operations.create > 0 || operations.update > 0)) {
    const confirmed = await promptForConfirmation('Proceed?');
    if (!confirmed) {
      console.log('Pull cancelled');
      return;
    }
  }

  // Second pass: execute operations
  let itemsProcessed = 0;
  for (const item of itemsToProcess) {
    const { action, test, existingEntry } = item;
    
    if (action === 'skip') {
      console.log(`⊘ Skipping '${test.name}' (already exists, use --update to overwrite)`);
      continue;
    }
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would ${action} test: ${test.name} (ID: ${test.id})`);
      continue;
    }
    
    try {
      // Fetch detailed test configuration
      console.log(`${action === 'update' ? '↻ Updating' : '+ Pulling'} config for '${test.name}'...`);
      const testDetails = await getTestApi(client, test.id);
      
      if (action === 'update' && existingEntry) {
        // Update existing entry - overwrite the config file
        const configFilePath = path.resolve(existingEntry.config);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeConfig(configFilePath, testDetails);
        console.log(`  ✓ Updated '${test.name}' (config: ${existingEntry.config})`);
      } else {
        // Create new entry
        const configPath = await generateUniqueFilename(options.outputDir, test.name);
        const configFilePath = path.resolve(configPath);
        await fs.ensureDir(path.dirname(configFilePath));
        await writeConfig(configFilePath, testDetails);
        
        const newTest: TestDefinition = {
          name: test.name,
          config: configPath,
          id: test.id
        };
        
        testsConfig.tests.push(newTest);
        console.log(`  ✓ Added '${test.name}' (config: ${configPath})`);
      }
      
      itemsProcessed++;
      
    } catch (error) {
      console.log(`  ✗ Error ${action === 'update' ? 'updating' : 'pulling'} test '${test.name}': ${error}`);
      continue;
    }
  }

  // Save updated tests.json if there were changes
  if (!options.dryRun && itemsProcessed > 0) {
    await writeConfig(testsConfigPath, testsConfig);
    console.log(`\nUpdated ${TESTS_CONFIG_FILE}`);
  }

  // Final summary
  if (options.dryRun) {
    console.log(`\n[DRY RUN] Would process ${operations.create + operations.update} test(s)`);
  } else {
    console.log(`\n✓ Summary: ${operations.create} created, ${operations.update} updated, ${operations.skip} skipped`);
    if (itemsProcessed > 0) {
      console.log(`You can now edit the config files in '${options.outputDir}/' and run 'agents push-tests' to update`);
    }
  }
}

async function runAgentTestsWithUI(agentName: string): Promise<void> {
  // Load agents configuration and get agent details
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }

  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  const agentDef = agentsConfig.agents.find(agent => agent.name === agentName);

  if (!agentDef) {
    throw new Error(`Agent '${agentName}' not found in configuration`);
  }

  // Get agent ID from index file (agents.json)
  const agentId = agentDef.id;
  
  if (!agentId) {
    throw new Error(`Agent '${agentName}' not found or not yet pushed. Run 'agents push --agent ${agentName}' to create the agent first`);
  }

  // Get agent config to find attached tests
  const configPath = agentDef.config;

  if (!configPath || !(await fs.pathExists(configPath))) {
    throw new Error(`Config file not found for agent '${agentName}': ${configPath}`);
  }

  const agentConfig = await readConfig<AgentConfig>(configPath);
  const attachedTests = agentConfig.platform_settings?.testing?.attached_tests || [];

  if (attachedTests.length === 0) {
    throw new Error(`No tests attached to agent '${agentName}'. Add tests to the agent's testing configuration.`);
  }

  const testIds = attachedTests.map(test => test.test_id);

  // Use TestView UI
  const { waitUntilExit } = render(
    React.createElement(TestView, {
      agentName,
      agentId,
      testIds
    })
  );
  await waitUntilExit();
}

async function runAgentTests(agentName: string): Promise<void> {
  // Load agents configuration and get agent details
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }

  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  const agentDef = agentsConfig.agents.find(agent => agent.name === agentName);

  if (!agentDef) {
    throw new Error(`Agent '${agentName}' not found in configuration`);
  }

  // Get agent ID from index file (agents.json)
  const agentId = agentDef.id;
  
  if (!agentId) {
    throw new Error(`Agent '${agentName}' not found or not yet pushed. Run 'agents push --agent ${agentName}' to create the agent first`);
  }

  // Get agent config to find attached tests
  const configPath = agentDef.config;

  if (!configPath || !(await fs.pathExists(configPath))) {
    throw new Error(`Config file not found for agent '${agentName}': ${configPath}`);
  }

  const agentConfig = await readConfig<AgentConfig>(configPath);
  const attachedTests = agentConfig.platform_settings?.testing?.attached_tests || [];

  if (attachedTests.length === 0) {
    throw new Error(`No tests attached to agent '${agentName}'. Add tests to the agent's testing configuration.`);
  }

  const testIds = attachedTests.map(test => test.test_id);

  console.log(`Running ${testIds.length} test(s) for agent '${agentName}'...`);
  console.log('');

  // Run tests without UI
  const client = await getElevenLabsClient();
  
  try {
    // Import the API functions we need
    const { runTestsOnAgentApi, getTestInvocationApi } = await import('./elevenlabs-api.js');
    
    // Start the test run
    const invocationResponse = await runTestsOnAgentApi(client, agentId, testIds) as { id: string };
    const invocationId = invocationResponse.id;
    
    console.log(`Test invocation started (ID: ${invocationId})`);
    console.log('Waiting for tests to complete...');
    console.log('');
    
    // Poll for test completion
    let allComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5 second intervals
    
    while (!allComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
      
      const invocationStatus = await getTestInvocationApi(client, invocationId) as { test_runs?: Array<{ status: string; test_name?: string; test_id?: string }> };
      const testRuns = invocationStatus.test_runs || [];
      
      allComplete = testRuns.every((run: { status: string }) => 
        run.status === 'passed' || run.status === 'failed'
      );
      
      if (allComplete) {
        console.log('Test Results:');
        console.log('='.repeat(50));
        
        let passedCount = 0;
        let failedCount = 0;
        
        for (const testRun of testRuns) {
          const status = testRun.status === 'passed' ? '✓' : '✗';
          const testName = testRun.test_name || testRun.test_id || 'Unknown';
          console.log(`${status} ${testName}: ${testRun.status}`);
          
          if (testRun.status === 'passed') {
            passedCount++;
          } else {
            failedCount++;
          }
        }
        
        console.log('='.repeat(50));
        console.log(`Total: ${testRuns.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
        
        if (failedCount > 0) {
          process.exit(1);
        }
      }
    }
    
    if (!allComplete) {
      console.error('Tests did not complete within the timeout period.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`Error running tests: ${error}`);
    process.exit(1);
  }
}

async function deleteAgent(agentId: string): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }

  const agentsConfig = await readConfig<AgentsConfig>(agentsConfigPath);
  
  // Find the agent by ID
  const agentIndex = agentsConfig.agents.findIndex(agent => agent.id === agentId);
  
  if (agentIndex === -1) {
    throw new Error(`Agent with ID '${agentId}' not found in local configuration`);
  }
  
  const agentDef = agentsConfig.agents[agentIndex];
  const agentName = agentDef.name;
  const configPath = agentDef.config;
  
  console.log(`Deleting agent '${agentName}' (ID: ${agentId})...`);
  
  // Delete from ElevenLabs (globally)
  console.log('Deleting from ElevenLabs...');
  const client = await getElevenLabsClient();
  
  try {
    await deleteAgentApi(client, agentId);
    console.log('✓ Successfully deleted from ElevenLabs');
  } catch (error) {
    console.error(`Warning: Failed to delete from ElevenLabs: ${error}`);
    console.log('Continuing with local deletion...');
  }
  
  // Remove from local agents.json
  agentsConfig.agents.splice(agentIndex, 1);
  await writeConfig(agentsConfigPath, agentsConfig);
  console.log(`✓ Removed '${agentName}' from ${AGENTS_CONFIG_FILE}`);
  
  // Remove config file
  if (configPath && await fs.pathExists(configPath)) {
    await fs.remove(configPath);
    console.log(`✓ Deleted config file: ${configPath}`);
  }
  
  console.log(`\n✓ Successfully deleted agent '${agentName}'`);
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\nExiting...');
  process.exit(0);
});

// Show help if no arguments provided or if --help is used
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  (async () => {
    const { waitUntilExit } = render(
      React.createElement(HelpView)
    );
    await waitUntilExit();
    process.exit(0);
  })();
} else {
  // Special handling for 'add' command without name argument
  if (args[0] === 'add' && (args.length === 1 || args[1].startsWith('-'))) {
    console.error('Error: Missing required argument');
    console.error('Usage: agents add <name> [options]');
    console.error('');
    console.error('Example:');
    console.error('  agents add "My Agent"');
    console.error('  agents add "My Agent" --template advanced');
    console.error('');
    console.error('For other commands, see:');
    console.error('  agents add-webhook-tool <name>');
    console.error('  agents add-client-tool <name>');
    process.exit(1);
  }

  // Special handling for 'templates' command without subcommand
  if (args[0] === 'templates' && (args.length === 1 || args[1].startsWith('-'))) {
    console.error('Error: Missing required subcommand');
    console.error('Usage: agents templates <list|show>');
    console.error('');
    console.error('Available subcommands:');
    console.error('  list                List available agent templates');
    console.error('  show <template>     Show configuration for a specific template');
    console.error('');
    console.error('Examples:');
    console.error('  agents templates list');
    console.error('  agents templates show default');
    process.exit(1);
  }

  // Special handling for 'components' command without subcommand
  if (args[0] === 'components' && (args.length === 1 || args[1].startsWith('-'))) {
    console.error('Error: Missing required subcommand');
    console.error('Usage: agents components <add>');
    console.error('');
    console.error('Available subcommands:');
    console.error('  add [name]     Add a component from ElevenLabs UI registry');
    console.error('');
    console.error('Examples:');
    console.error('  agents components add');
    console.error('  agents components add button');
    process.exit(1);
  }

  program.parse();
}
