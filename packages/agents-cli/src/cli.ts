#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import {
  calculateConfigHash,
  readAgentConfig,
  writeAgentConfig,
  loadLockFile,
  saveLockFile,
  getAgentFromLock,
  updateAgentInLock,
  updateTestInLock,
  getTestFromLock,
  toCamelCaseKeys,
  toSnakeCaseKeys
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
  type Tool,
  loadToolsLockFile,
  saveToolsLockFile,
  updateToolInLock,
  getToolFromLock
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
const LOCK_FILE = "agents.lock";

interface AgentDefinition {
  name: string;
  environments?: Record<string, { config: string }>;
  config?: string;
}

interface AgentsConfig {
  agents: AgentDefinition[];
}

interface TestDefinition {
  name: string;
  config: string;
  type?: string;
}

interface TestsConfig {
  tests: TestDefinition[];
}

interface AddOptions {
  configPath?: string;
  template: string;
  skipUpload: boolean;
  env: string;
}

interface PushOptions {
  agent?: string;
  dryRun: boolean;
  env?: string;
}

interface StatusOptions {
  agent?: string;
  env?: string;
}

interface WatchOptions {
  agent?: string;
  env: string;
  interval: string;
}

interface PullOptions {
  agent?: string;
  outputDir: string;
  search?: string;
  dryRun: boolean;
  env: string;
}

interface PullToolsOptions {
  tool?: string;
  outputDir: string;
  search?: string;
  dryRun: boolean;
}

interface WidgetOptions {
  env: string;
}

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
  .action(async (projectPath: string, options: { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for initialization
        const { waitUntilExit } = render(
          React.createElement(InitView, { projectPath })
        );
        await waitUntilExit();
      } else {
        // Fallback to original implementation
        const fullPath = path.resolve(projectPath);
        console.log(`Initializing project in ${fullPath}`);
        
        // Create directory if it doesn't exist
        await fs.ensureDir(fullPath);
        
        // Create agents.json file
        const agentsConfigPath = path.join(fullPath, AGENTS_CONFIG_FILE);
        if (await fs.pathExists(agentsConfigPath)) {
          console.log(`${AGENTS_CONFIG_FILE} already exists, skipping creation`);
        } else {
          const initialConfig: AgentsConfig = {
            agents: []
          };
          await writeAgentConfig(agentsConfigPath, initialConfig);
          console.log(`Created ${AGENTS_CONFIG_FILE}`);
        }
        
        // Create tools.json file
        const toolsConfigPath = path.join(fullPath, TOOLS_CONFIG_FILE);
        if (await fs.pathExists(toolsConfigPath)) {
          console.log(`${TOOLS_CONFIG_FILE} already exists, skipping creation`);
        } else {
          const initialToolsConfig: ToolsConfig = {
            tools: []
          };
          await writeToolsConfig(toolsConfigPath, initialToolsConfig);
          console.log(`Created ${TOOLS_CONFIG_FILE}`);
        }

        // Create tests.json file
        const testsConfigPath = path.join(fullPath, TESTS_CONFIG_FILE);
        if (await fs.pathExists(testsConfigPath)) {
          console.log(`${TESTS_CONFIG_FILE} already exists, skipping creation`);
        } else {
          const initialTestsConfig: TestsConfig = {
            tests: []
          };
          await writeAgentConfig(testsConfigPath, initialTestsConfig);
          console.log(`Created ${TESTS_CONFIG_FILE}`);
        }
        
        // Create agent_configs directory structure
        const configDirs = ['agent_configs/dev', 'agent_configs/staging', 'agent_configs/prod', 'tool_configs', 'test_configs'];
        for (const dir of configDirs) {
          const dirPath = path.join(fullPath, dir);
          await fs.ensureDir(dirPath);
          console.log(`Created directory: ${dir}`);
        }
        
        // Create initial lock file
        const lockFilePath = path.join(fullPath, LOCK_FILE);
        if (await fs.pathExists(lockFilePath)) {
          console.log(`${LOCK_FILE} already exists, skipping creation`);
        } else {
          const initialLockData = {
            agents: {},
            tools: {},
            tests: {}
          };
          await saveLockFile(lockFilePath, initialLockData);
          console.log(`Created ${LOCK_FILE}`);
        }
        
        // Create .env.example file
        const envExamplePath = path.join(fullPath, '.env.example');
        if (!(await fs.pathExists(envExamplePath))) {
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
  .option('--skip-upload', 'Create config file only, don\'t upload to ElevenLabs', false)
  .option('--env <environment>', 'Environment to create agent for', 'prod')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (name: string, options: AddOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false && !options.configPath) {
        // Use Ink UI for agent creation
        const { waitUntilExit } = render(
          React.createElement(AddAgentView, {
            initialName: name,
            environment: options.env,
            template: options.template,
            skipUpload: options.skipUpload
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
      const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
      
      // Load lock file to check environment-specific agents
      const lockFilePath = path.resolve(LOCK_FILE);
      const lockData = await loadLockFile(lockFilePath);
      
      // Check if agent already exists for this specific environment
      const lockedAgent = getAgentFromLock(lockData, name, options.env);
      if (lockedAgent?.id) {
        console.error(`Agent '${name}' already exists for environment '${options.env}'`);
        process.exit(1);
      }
      
      // Check if agent name exists in agents.json
      let existingAgent = agentsConfig.agents.find(agent => agent.name === name);
      
      // Generate environment-specific config path if not provided
      let configPath = options.configPath;
      if (!configPath) {
        const safeName = name.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
        configPath = `agent_configs/${options.env}/${safeName}.json`;
      }
      
      // Create config directory and file
      const configFilePath = path.resolve(configPath);
      await fs.ensureDir(path.dirname(configFilePath));
      
      // Create agent config using template
      let agentConfig: AgentConfig;
      try {
        agentConfig = getTemplateByName(name, options.template);
      } catch (error) {
        console.error(`${error}`);
        process.exit(1);
      }
      
      await writeAgentConfig(configFilePath, agentConfig);
      console.log(`Created config file: ${configPath} (template: ${options.template})`);
      
      if (existingAgent) {
        console.log(`Agent '${name}' exists, adding new environment '${options.env}'`);
      } else {
        console.log(`Creating new agent '${name}' for environment '${options.env}'`);
      }
      
      if (options.skipUpload) {
        if (!existingAgent) {
          const newAgent: AgentDefinition = {
            name,
            environments: {
              [options.env]: { config: configPath }
            }
          };
          agentsConfig.agents.push(newAgent);
          console.log(`Added agent '${name}' to agents.json (local only)`);
        } else {
          if (!existingAgent.environments) {
            const oldConfig = existingAgent.config || '';
            existingAgent.environments = { default: { config: oldConfig } };
            delete existingAgent.config;
          }
          existingAgent.environments[options.env] = { config: configPath };
          console.log(`Added environment '${options.env}' to existing agent '${name}' (local only)`);
        }
        
        await writeAgentConfig(agentsConfigPath, agentsConfig);
        console.log(`Edit ${configPath} to customize your agent, then run 'agents push --env ${options.env}' to upload`);
        return;
      }
      
      // Create agent in ElevenLabs
      console.log(`Creating agent '${name}' in ElevenLabs (environment: ${options.env})...`);
      
      const client = await getElevenLabsClient();
      
      // Extract config components
      const conversationConfig = agentConfig.conversation_config || {};
      const platformSettings = agentConfig.platform_settings;
      let tags = agentConfig.tags || [];
      
      // Add environment tag if specified and not already present
      if (options.env && !tags.includes(options.env)) {
        tags = [...tags, options.env];
      }
      
      // Create new agent
      const agentId = await createAgentApi(
        client,
        name,
        conversationConfig,
        platformSettings,
        tags
      );
      
      console.log(`Created agent in ElevenLabs with ID: ${agentId}`);
      
      if (!existingAgent) {
        const newAgent: AgentDefinition = {
          name,
          environments: {
            [options.env]: { config: configPath }
          }
        };
        agentsConfig.agents.push(newAgent);
        console.log(`Added agent '${name}' to agents.json`);
      } else {
        if (!existingAgent.environments) {
          const oldConfig = existingAgent.config || '';
          existingAgent.environments = { default: { config: oldConfig } };
          delete existingAgent.config;
        }
        existingAgent.environments[options.env] = { config: configPath };
        console.log(`Added environment '${options.env}' to existing agent '${name}'`);
      }
      
      // Save updated agents.json
      await writeAgentConfig(agentsConfigPath, agentsConfig);
      
      // Update lock file with environment-specific agent ID
      const configHash = calculateConfigHash(toSnakeCaseKeys(agentConfig));
      updateAgentInLock(lockData, name, options.env, agentId, configHash);
      await saveLockFile(lockFilePath, lockData);
      
      console.log(`Edit ${configPath} to customize your agent, then run 'agents push --env ${options.env}' to update`);
      
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
  .option('--skip-upload', 'Create config file only, don\'t upload to ElevenLabs', false)
  .action(async (name: string, options: { configPath?: string; skipUpload: boolean }) => {
    try {
      await addTool(name, 'webhook', options.configPath, options.skipUpload);
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
  .option('--skip-upload', 'Create config file only, don\'t upload to ElevenLabs', false)
  .action(async (name: string, options: { configPath?: string; skipUpload: boolean }) => {
    try {
      await addTool(name, 'client', options.configPath, options.skipUpload);
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
  .option('--env <environment>', 'Target specific environment (defaults to all environments)')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: PushOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use new Ink UI for push
        const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
        if (!(await fs.pathExists(agentsConfigPath))) {
          throw new Error('agents.json not found. Run \'init\' first.');
        }
        
        const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
        
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
          environment: options.env || 'all',
          configPath: agent.config || `agent_configs/${agent.name}.json`,
          status: 'pending' as const
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
        await pushAgents(options.agent, options.dryRun, options.env);
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
  .option('--env <environment>', 'Environment to check status for (defaults to all environments)')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: StatusOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for status display
        const { waitUntilExit } = render(
          React.createElement(StatusView, {
            agentName: options.agent,
            environment: options.env
          })
        );
        await waitUntilExit();
      } else {
        await showStatus(options.agent, options.env);
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
  .option('--env <environment>', 'Environment to watch', 'prod')
  .option('--interval <seconds>', 'Check interval in seconds', '5')
  .action(async (options: WatchOptions) => {
    try {
      await watchForChanges(options.agent, options.env, parseInt(options.interval));
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
  .command('pull')
  .description('Pull all agents from ElevenLabs workspace and add them to local configuration')
  .option('--agent <name>', 'Specific agent name pattern to search for')
  .option('--output-dir <dir>', 'Directory to store pulled agent configs', 'agent_configs')
  .option('--search <term>', 'Search agents by name')
  .option('--dry-run', 'Show what would be pulled without making changes', false)
  .option('--env <environment>', 'Environment to associate pulled agents with', 'prod')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (options: PullOptions & { ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for pull
        const { waitUntilExit } = render(
          React.createElement(PullView, {
            agent: options.agent,
            outputDir: options.outputDir,
            search: options.search,
            dryRun: options.dryRun,
            environment: options.env
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
  .option('--tool <name>', 'Specific tool name pattern to search for')
  .option('--output-dir <dir>', 'Directory to store pulled tool configs', 'tool_configs')
  .option('--search <term>', 'Search tools by name')
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
            search: options.search,
            dryRun: options.dryRun
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
  .option('--env <environment>', 'Environment to get agent ID from', 'prod')
  .action(async (name: string, options: WidgetOptions) => {
    try {
      await generateWidget(name, options.env);
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
  .option('--skip-upload', 'Create config file only, don\'t upload to ElevenLabs', false)
  .option('--no-ui', 'Disable interactive UI')
  .action(async (name: string, options: { template: string; skipUpload: boolean; ui: boolean }) => {
    try {
      if (options.ui !== false) {
        // Use Ink UI for test creation
        const { waitUntilExit } = render(
          React.createElement(AddTestView, {
            initialName: name,
            skipUpload: options.skipUpload
          })
        );
        await waitUntilExit();
      } else {
        await addTest(name, options.template, options.skipUpload);
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
  .action(async (options: { test?: string; dryRun: boolean }) => {
    try {
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
          status: 'pending' as const
        }));

        const { waitUntilExit } = render(
          React.createElement(PushToolsView, {
            tools: pushToolsData,
            dryRun: options.dryRun
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
  .option('--output-dir <dir>', 'Directory to store pulled test configs', 'test_configs')
  .option('--dry-run', 'Show what would be pulled without making changes', false)
  .action(async (options: { outputDir: string; dryRun: boolean }) => {
    try {
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
  .option('--env <environment>', 'Environment to test in', 'prod')
  .option('--no-ui', 'Disable interactive UI')
  .action(async (agentName: string, options: { env: string; ui: boolean }) => {
    try {
      if (options.ui !== false) {
        await runAgentTestsWithUI(agentName, options.env);
      } else {
        await runAgentTests(agentName, options.env);
      }
    } catch (error) {
      console.error(`Error running tests: ${error}`);
      process.exit(1);
    }
  });

// Helper functions

async function addTool(name: string, type: 'webhook' | 'client', configPath?: string, skipUpload = false): Promise<void> {
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
  
  // Load lock file
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  
  // Check if tool already exists
  const existingTool = toolsConfig.tools.find(tool => tool.name === name);
  const lockedTool = getToolFromLock(lockData, name);
  
  if (existingTool && lockedTool?.id) {
    console.error(`Tool '${name}' already exists`);
    process.exit(1);
  }
  
  // Generate config path if not provided
  if (!configPath) {
    const safeName = name.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
    configPath = `tool_configs/${safeName}.json`;
  }
  
  // Create config directory and file
  const configFilePath = path.resolve(configPath);
  await fs.ensureDir(path.dirname(configFilePath));
  
  // Create tool config using appropriate template
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
  
  await writeToolConfig(configFilePath, toolConfig);
  console.log(`Created config file: ${configPath}`);
  
  // Add to tools.json if not already present
  if (!existingTool) {
    const newTool: ToolDefinition = {
      name,
      type,
      config: configPath
    };
    toolsConfig.tools.push(newTool);
    await writeToolsConfig(toolsConfigPath, toolsConfig);
    console.log(`Added tool '${name}' to tools.json`);
  }
  
  if (skipUpload) {
    console.log(`Edit ${configPath} to customize your tool, then run 'agents push-tools' to upload`);
    return;
  }
  
  // Create tool in ElevenLabs
  console.log(`Creating ${type} tool '${name}' in ElevenLabs...`);
  
  const client = await getElevenLabsClient();
  
  try {
    const response = await createToolApi(client, toolConfig);
    const toolId = (response as { toolId?: string }).toolId || `tool_${Date.now()}`;
    
    console.log(`Created tool in ElevenLabs with ID: ${toolId}`);
    
    // Update lock file
    const configHash = calculateConfigHash(toSnakeCaseKeys(toolConfig));
    updateToolInLock(lockData, name, toolId, configHash);
    await saveLockFile(lockFilePath, lockData);
    
    console.log(`Edit ${configPath} to customize your tool, then run 'agents push-tools' to update`);
    
  } catch (error) {
    console.error(`Error creating tool in ElevenLabs: ${error}`);
    process.exit(1);
  }
}

async function pushAgents(agentName?: string, dryRun = false, environment?: string): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  
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
  
  // Determine environments to push
  let environmentsToSync: string[] = [];
  if (environment) {
    environmentsToSync = [environment];
  } else {
    const envSet = new Set<string>();
    for (const agentDef of agentsToProcess) {
      if (agentDef.environments) {
        Object.keys(agentDef.environments).forEach(env => envSet.add(env));
      } else {
        envSet.add('prod'); // Old format compatibility
      }
    }
    environmentsToSync = Array.from(envSet);
    
    if (environmentsToSync.length === 0) {
      console.log('No environments found to push');
      return;
    }
    
    console.log(`Pushing all environments: ${environmentsToSync.join(', ')}`);
  }
  
  let changesMade = false;
  
  for (const currentEnv of environmentsToSync) {
    console.log(`\nProcessing environment: ${currentEnv}`);
    
    for (const agentDef of agentsToProcess) {
      const agentDefName = agentDef.name;
      
      // Handle both old and new config structure
      let configPath: string | undefined;
      if (agentDef.environments) {
        if (currentEnv in agentDef.environments) {
          configPath = agentDef.environments[currentEnv].config;
        } else {
          console.log(`Warning: Agent '${agentDefName}' not configured for environment '${currentEnv}'`);
          continue;
        }
      } else {
        configPath = agentDef.config;
        if (!configPath) {
          console.log(`Warning: No config path found for agent '${agentDefName}'`);
          continue;
        }
      }
      
      // Check if config file exists
      if (!(await fs.pathExists(configPath))) {
        console.log(`Warning: Config file not found for ${agentDefName}: ${configPath}`);
        continue;
      }
      
      // Load agent config
      let agentConfig: AgentConfig;
      try {
        agentConfig = await readAgentConfig<AgentConfig>(configPath);
      } catch (error) {
        console.log(`Error reading config for ${agentDefName}: ${error}`);
        continue;
      }
      
      // Calculate config hash
      const configHash = calculateConfigHash(toSnakeCaseKeys(agentConfig));
      
      // Get environment-specific agent data from lock file
      const lockedAgent = getAgentFromLock(lockData, agentDefName, currentEnv);
      
      let needsUpdate = true;
      
      if (lockedAgent) {
        if (lockedAgent.hash === configHash) {
          needsUpdate = false;
          console.log(`${agentDefName}: No changes (environment: ${currentEnv})`);
        } else {
          console.log(`${agentDefName}: Config changed, will update (environment: ${currentEnv})`);
        }
      } else {
        console.log(`${agentDefName}: New environment detected, will create/update (environment: ${currentEnv})`);
      }
      
      if (!needsUpdate) {
        continue;
      }
      
      if (dryRun) {
        console.log(`[DRY RUN] Would update agent: ${agentDefName} (environment: ${currentEnv})`);
        continue;
      }
      
      // Perform API operation
      try {
        const agentId = lockedAgent?.id;
        
        // Extract config components
        const conversationConfig = agentConfig.conversation_config || {};
        const platformSettings = agentConfig.platform_settings;
        let tags = agentConfig.tags || [];
        
        // Add environment tag if specified and not already present
        if (currentEnv && !tags.includes(currentEnv)) {
          tags = [...tags, currentEnv];
        }
        
        const agentDisplayName = agentConfig.name || agentDefName;
        
        if (!agentId) {
          // Create new agent for this environment
          const newAgentId = await createAgentApi(
            client!,
            agentDisplayName,
            conversationConfig,
            platformSettings,
            tags
          );
          console.log(`Created agent ${agentDefName} for environment '${currentEnv}' (ID: ${newAgentId})`);
          updateAgentInLock(lockData, agentDefName, currentEnv, newAgentId, configHash);
        } else {
          // Update existing environment-specific agent
          await updateAgentApi(
            client!,
            agentId,
            agentDisplayName,
            conversationConfig,
            platformSettings,
            tags
          );
          console.log(`Updated agent ${agentDefName} for environment '${currentEnv}' (ID: ${agentId})`);
          updateAgentInLock(lockData, agentDefName, currentEnv, agentId, configHash);
        }
        
        changesMade = true;
        
      } catch (error) {
        console.log(`Error processing ${agentDefName}: ${error}`);
      }
    }
  }
  
  // Save lock file if changes were made
  if (changesMade && !dryRun) {
    await saveLockFile(lockFilePath, lockData);
    console.log('Updated lock file');
  }
}

async function showStatus(agentName?: string, environment?: string): Promise<void> {
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
  const lockData = await loadLockFile(path.resolve(LOCK_FILE));
  
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
  
  // Determine environments to show
  let environmentsToShow: string[] = [];
  if (environment) {
    environmentsToShow = [environment];
    console.log(`Agent Status (Environment: ${environment}):`);
  } else {
    const envSet = new Set<string>();
    for (const agentDef of agentsToShow) {
      if (agentDef.environments) {
        Object.keys(agentDef.environments).forEach(env => envSet.add(env));
      } else {
        envSet.add('prod'); // Old format compatibility
      }
    }
    environmentsToShow = Array.from(envSet);
    console.log('Agent Status (All Environments):');
  }
  
  console.log('='.repeat(50));
  
  for (const agentDef of agentsToShow) {
    const agentNameCurrent = agentDef.name;
    
    for (const currentEnv of environmentsToShow) {
      // Handle both old and new config structure
      let configPath: string | undefined;
      if (agentDef.environments) {
        if (currentEnv in agentDef.environments) {
          configPath = agentDef.environments[currentEnv].config;
        } else {
          continue; // Skip if agent not configured for this environment
        }
      } else {
        configPath = agentDef.config;
        if (!configPath) {
          continue;
        }
      }
      
      // Get environment-specific agent ID from lock file
      const lockedAgent = getAgentFromLock(lockData, agentNameCurrent, currentEnv);
      const agentId = lockedAgent?.id || 'Not created for this environment';
      
      console.log(`\n${agentNameCurrent}`);
      console.log(`   Environment: ${currentEnv}`);
      console.log(`   Agent ID: ${agentId}`);
      console.log(`   Config: ${configPath}`);
      
      // Check config file status
      if (await fs.pathExists(configPath)) {
        try {
          const agentConfig = await readAgentConfig(configPath);
          const configHash = calculateConfigHash(toSnakeCaseKeys(agentConfig));
          console.log(`   Config Hash: ${configHash.substring(0, 8)}...`);
          
          // Check lock status for specified environment
          if (lockedAgent) {
            if (lockedAgent.hash === configHash) {
              console.log(`   Status: Synced (${currentEnv})`);
            } else {
              console.log(`   Status: Config changed (needs push for ${currentEnv})`);
            }
          } else {
            console.log(`   Status: New (needs push for ${currentEnv})`);
          }
          
        } catch (error) {
          console.log(`   Status: Config error: ${error}`);
        }
      } else {
        console.log('   Status: Config file not found');
      }
    }
  }
}

async function watchForChanges(agentName?: string, environment = 'prod', interval = 5): Promise<void> {
  console.log(`Watching for config changes (checking every ${interval}s)...`);
  if (agentName) {
    console.log(`Agent: ${agentName}`);
  } else {
    console.log('Agent: All agents');
  }
  console.log(`Environment: ${environment}`);
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
      const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
      
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
        const configPaths: string[] = [];
        if (agentDef.environments) {
          if (environment in agentDef.environments) {
            configPaths.push(agentDef.environments[environment].config);
          }
        } else {
          if (agentDef.config) {
            configPaths.push(agentDef.config);
          }
        }
        
        for (const configPath of configPaths) {
          if (await fs.pathExists(configPath)) {
            const configMtime = await getFileMtime(configPath);
            if (fileTimestamps.get(configPath) !== configMtime) {
              fileTimestamps.set(configPath, configMtime);
              console.log(`Detected change in ${configPath}`);
              return true;
            }
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
          await pushAgents(agentName, false, environment);
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
  
  const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
  
  if (agentsConfig.agents.length === 0) {
    console.log('No agents configured');
    return;
  }
  
  console.log('Configured Agents:');
  console.log('='.repeat(30));
  
  agentsConfig.agents.forEach((agentDef, i) => {
    console.log(`${i + 1}. ${agentDef.name}`);
    
    if (agentDef.environments) {
      console.log('   Environments:');
      Object.entries(agentDef.environments).forEach(([envName, envConfig]) => {
        console.log(`     ${envName}: ${envConfig.config}`);
      });
    } else {
      const configPath = agentDef.config || 'No config path';
      console.log(`   Config: ${configPath}`);
    }
    
    console.log();
  });
}

async function pullAgents(options: PullOptions): Promise<void> {
  // Check if agents.json exists
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }
  
  const client = await getElevenLabsClient();
  
  // Use agent option as search term if provided, otherwise use search parameter
  const searchTerm = options.agent || options.search;
  
  // Pull all agents from ElevenLabs
  console.log('Pulling agents from ElevenLabs...');
  const agentsList = await listAgentsApi(client, 30, searchTerm);
  
  if (agentsList.length === 0) {
    console.log('No agents found in your ElevenLabs workspace.');
    return;
  }
  
  console.log(`Found ${agentsList.length} agent(s)`);
  
  // Load existing config
  const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
  const existingAgentNames = new Set(agentsConfig.agents.map(agent => agent.name));
  
  // Load lock file to check for existing agent IDs per environment
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  const existingAgentIds = new Set<string>();
  
  // Collect all existing agent IDs across all environments
  Object.values(lockData.agents).forEach(environments => {
    Object.values(environments).forEach(envData => {
      if (envData.id) {
        existingAgentIds.add(envData.id);
      }
    });
  });
  
  let newAgentsAdded = 0;
  
  for (const agentMeta of agentsList) {
    const agentMetaTyped = agentMeta as { agentId?: string; agent_id?: string; name: string };
    const agentId = agentMetaTyped.agentId || agentMetaTyped.agent_id;
    if (!agentId) {
      console.log(`Warning: Skipping agent '${agentMetaTyped.name}' - no agent ID found`);
      continue;
    }
    let agentNameRemote = agentMetaTyped.name;
    
    // Skip if agent already exists by ID (in any environment)
    if (existingAgentIds.has(agentId)) {
      console.log(`Skipping '${agentNameRemote}' - already exists (ID: ${agentId})`);
      continue;
    }
    
    // Check for name conflicts
    if (existingAgentNames.has(agentNameRemote)) {
      let counter = 1;
      const originalName = agentNameRemote;
      while (existingAgentNames.has(agentNameRemote)) {
        agentNameRemote = `${originalName}_${counter}`;
        counter++;
      }
      console.log(`Warning: Name conflict: renamed '${originalName}' to '${agentNameRemote}'`);
    }
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would pull agent: ${agentNameRemote} (ID: ${agentId}) for environment: ${options.env}`);
      continue;
    }
    
    try {
      // Fetch detailed agent configuration
      console.log(`Pulling config for '${agentNameRemote}'...`);
      const agentDetails = await getAgentApi(client, agentId);
      
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
      
      // Create agent config structure
      const agentConfig: AgentConfig = {
        name: agentNameRemote,
        conversation_config: conversationConfig as AgentConfig['conversation_config'],
        platform_settings: platformSettings,
        tags
      };
      
      // Generate config file path
      const safeName = agentNameRemote.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
      const configPath = `${options.outputDir}/${safeName}.json`;
      
      // Create config file
      const configFilePath = path.resolve(configPath);
      await fs.ensureDir(path.dirname(configFilePath));
      await writeAgentConfig(configFilePath, agentConfig);
      
      // Create new agent entry for agents.json
      const newAgent: AgentDefinition = {
        name: agentNameRemote,
        config: configPath
      };
      
      // Add to agents config
      agentsConfig.agents.push(newAgent);
      existingAgentNames.add(agentNameRemote);
      existingAgentIds.add(agentId);
      
      // Update lock file with environment-specific agent ID
      const configHash = calculateConfigHash(toSnakeCaseKeys(agentConfig));
      updateAgentInLock(lockData, agentNameRemote, options.env, agentId, configHash);
      
      console.log(`Added '${agentNameRemote}' (config: ${configPath}) for environment: ${options.env}`);
      newAgentsAdded++;
      
    } catch (error) {
      console.log(`Error pulling agent '${agentNameRemote}': ${error}`);
      continue;
    }
  }
  
  if (!options.dryRun && newAgentsAdded > 0) {
    // Save updated agents.json
    await writeAgentConfig(agentsConfigPath, agentsConfig);
    
    // Save updated lock file
    await saveLockFile(lockFilePath, lockData);
    
    console.log(`Updated ${AGENTS_CONFIG_FILE} and ${LOCK_FILE}`);
  }
  
  if (options.dryRun) {
    const newAgentsCount = agentsList.filter((a: unknown) => {
      const agent = a as { agentId?: string; agent_id?: string };
      const id = agent.agentId || agent.agent_id;
      return id && !existingAgentIds.has(id);
    }).length;
    console.log(`[DRY RUN] Would add ${newAgentsCount} new agent(s) for environment: ${options.env}`);
  } else {
    console.log(`Successfully added ${newAgentsAdded} new agent(s) for environment: ${options.env}`);
    if (newAgentsAdded > 0) {
      console.log(`You can now edit the config files in '${options.outputDir}/' and run 'agents push --env ${options.env}' to update`);
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

  // Use tool option as search term if provided, otherwise use search parameter
  const searchTerm = options.tool || options.search;

  // Pull all tools from ElevenLabs
  console.log('Pulling tools from ElevenLabs...');
  const toolsList = await listToolsApi(client);

  if (toolsList.length === 0) {
    console.log('No tools found in your ElevenLabs workspace.');
    return;
  }

  console.log(`Found ${toolsList.length} tool(s)`);

  // Filter tools by search term if provided
  let filteredTools = toolsList;
  if (searchTerm) {
    filteredTools = toolsList.filter((tool: unknown) => {
      const toolTyped = tool as { name?: string };
      return toolTyped.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
    console.log(`Filtered to ${filteredTools.length} tool(s) matching "${searchTerm}"`);
  }

  const existingToolNames = new Set(toolsConfig.tools.map(tool => tool.name));

  // Load tools lock file to check for existing tool IDs
  const lockFilePath = path.resolve('tools-lock.json');
  const toolsLockData = await loadToolsLockFile(lockFilePath);
  const existingToolIds = new Set<string>();

  // Collect all existing tool IDs
  Object.values(toolsLockData.tools).forEach(toolData => {
    if (toolData.id) {
      existingToolIds.add(toolData.id);
    }
  });

  let newToolsAdded = 0;

  for (const toolMeta of filteredTools) {
    const toolMetaTyped = toolMeta as { tool_id?: string; toolId?: string; id?: string; name: string };
    const toolId = toolMetaTyped.tool_id || toolMetaTyped.toolId || toolMetaTyped.id;
    if (!toolId) {
      console.log(`Warning: Skipping tool '${toolMetaTyped.name}' - no tool ID found`);
      continue;
    }
    let toolNameRemote = toolMetaTyped.name;

    // Skip if tool already exists by ID
    if (existingToolIds.has(toolId)) {
      console.log(`Skipping '${toolNameRemote}' - already exists (ID: ${toolId})`);
      continue;
    }

    // Check for name conflicts
    if (existingToolNames.has(toolNameRemote)) {
      let counter = 1;
      const originalName = toolNameRemote;
      while (existingToolNames.has(toolNameRemote)) {
        toolNameRemote = `${originalName}_${counter}`;
        counter++;
      }
      console.log(`Warning: Name conflict: renamed '${originalName}' to '${toolNameRemote}'`);
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Would pull tool: ${toolNameRemote} (ID: ${toolId})`);
      continue;
    }

    try {
      // Fetch detailed tool configuration
      console.log(`Pulling config for '${toolNameRemote}'...`);
      const toolDetails = await getToolApi(client, toolId);

      // Generate config file path
      const safeName = toolNameRemote.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
      const configPath = `${options.outputDir}/${safeName}.json`;

      // Create config file
      const configFilePath = path.resolve(configPath);
      await fs.ensureDir(path.dirname(configFilePath));
      await writeToolConfig(configFilePath, toolDetails as Tool);

      // Determine tool type from the details
      const toolDetailsTyped = toolDetails as { type?: string };
      const toolType = toolDetailsTyped.type || 'unknown';

      // Create new tool entry for tools.json
      const newTool: ToolDefinition = {
        name: toolNameRemote,
        type: toolType as 'webhook' | 'client',
        config: configPath
      };

      // Add to tools config
      toolsConfig.tools.push(newTool);
      existingToolNames.add(toolNameRemote);
      existingToolIds.add(toolId);

      // Update tools lock file with tool ID
      const configHash = calculateConfigHash(toolDetails);
      updateToolInLock(toolsLockData, toolNameRemote, toolId, configHash);

      console.log(`Added '${toolNameRemote}' (config: ${configPath}, type: ${toolType})`);
      newToolsAdded++;

    } catch (error) {
      console.log(`Error pulling tool '${toolNameRemote}': ${error}`);
      continue;
    }
  }

  if (!options.dryRun && newToolsAdded > 0) {
    // Save updated tools.json
    await writeToolsConfig(toolsConfigPath, toolsConfig);

    // Save updated tools lock file
    await saveToolsLockFile(lockFilePath, toolsLockData);

    console.log(`Updated ${TOOLS_CONFIG_FILE} and tools-lock.json`);
  }

  if (options.dryRun) {
    const newToolsCount = filteredTools.filter((t: unknown) => {
      const tool = t as { tool_id?: string; toolId?: string; id?: string };
      const id = tool.tool_id || tool.toolId || tool.id;
      return id && !existingToolIds.has(id);
    }).length;
    console.log(`[DRY RUN] Would add ${newToolsCount} new tool(s)`);
  } else {
    console.log(`Successfully added ${newToolsAdded} new tool(s)`);
    if (newToolsAdded > 0) {
      console.log(`You can now edit the config files in '${options.outputDir}/' and use them in your agents`);
    }
  }
}

async function generateWidget(name: string, environment: string): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }
  
  // Load lock file to get agent ID
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  
  // Check if agent exists in config
  const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
  const agentExists = agentsConfig.agents.some(agent => agent.name === name);
  
  if (!agentExists) {
    throw new Error(`Agent '${name}' not found in configuration`);
  }
  
  // Get environment-specific agent data from lock file
  const lockedAgent = getAgentFromLock(lockData, name, environment);
  
  if (!lockedAgent?.id) {
    throw new Error(`Agent '${name}' not found for environment '${environment}' or not yet pushed. Run 'agents push --agent ${name} --env ${environment}' to create the agent first`);
  }
  
  const agentId = lockedAgent.id;
  
  const residency = await getResidency();
  
  // Generate HTML widget snippet with server-location attribute
  let htmlSnippet = `<elevenlabs-convai agent-id="${agentId}"`;
  
  // Add server-location attribute for isolated regions
  if (residency !== 'global' && residency !== 'us') {
    htmlSnippet += ` server-location="${residency}"`;
  }
  
  htmlSnippet += `></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  
  console.log(`HTML Widget for '${name}' (environment: ${environment}, residency: ${residency}):`);
  console.log('='.repeat(60));
  console.log(htmlSnippet);
  console.log('='.repeat(60));
  console.log(`Agent ID: ${agentId}`);
}

// Test helper functions

async function addTest(name: string, templateType: string = "basic-llm", skipUpload = false): Promise<void> {
  const { getTestTemplateByName } = await import('./test-templates.js');

  // Check if tests.json exists
  const testsConfigPath = path.resolve(TESTS_CONFIG_FILE);
  let testsConfig: TestsConfig;

  try {
    testsConfig = await readAgentConfig<TestsConfig>(testsConfigPath);
  } catch (error) {
    // Initialize tests.json if it doesn't exist
    testsConfig = { tests: [] };
    await writeAgentConfig(testsConfigPath, testsConfig);
    console.log(`Created ${TESTS_CONFIG_FILE}`);
  }

  // Load lock file
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);

  // Check if test already exists
  const existingTest = testsConfig.tests.find(test => test.name === name);
  const lockedTest = getTestFromLock(lockData, name);

  if (existingTest && lockedTest?.id) {
    console.error(`Test '${name}' already exists`);
    process.exit(1);
  }

  // Generate config path
  const safeName = name.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
  const configPath = `test_configs/${safeName}.json`;

  // Create config directory and file
  const configFilePath = path.resolve(configPath);
  await fs.ensureDir(path.dirname(configFilePath));

  // Create test config using template
  const testConfig = getTestTemplateByName(name, templateType);
  await writeAgentConfig(configFilePath, testConfig);
  console.log(`Created config file: ${configPath} (template: ${templateType})`);

  // Add to tests.json if not already present
  if (!existingTest) {
    const newTest: TestDefinition = {
      name,
      config: configPath,
      type: templateType
    };
    testsConfig.tests.push(newTest);
    await writeAgentConfig(testsConfigPath, testsConfig);
    console.log(`Added test '${name}' to tests.json`);
  }

  if (skipUpload) {
    console.log(`Edit ${configPath} to customize your test, then run 'agents push-tests' to upload`);
    return;
  }

  // Create test in ElevenLabs
  console.log(`Creating test '${name}' in ElevenLabs...`);

  const client = await getElevenLabsClient();

  try {
    const testApiConfig = toCamelCaseKeys(testConfig) as unknown as ElevenLabs.conversationalAi.CreateUnitTestRequest;
    const response = await createTestApi(client, testApiConfig);
    const testId = response.id;

    console.log(`Created test in ElevenLabs with ID: ${testId}`);

    // Update lock file
    const configHash = calculateConfigHash(testApiConfig);
    updateTestInLock(lockData, name, testId, configHash);
    await saveLockFile(lockFilePath, lockData);

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

  const testsConfig = await readAgentConfig<TestsConfig>(testsConfigPath);
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);

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
      testConfig = await readAgentConfig(configPath);
    } catch (error) {
      console.log(`Error reading config for ${testDefName}: ${error}`);
      continue;
    }

    // Calculate config hash
    const configHash = calculateConfigHash(toSnakeCaseKeys(testConfig));

    // Get test data from lock file
    const lockedTest = getTestFromLock(lockData, testDefName);

    let needsUpdate = true;

    if (lockedTest) {
      if (lockedTest.hash === configHash) {
        needsUpdate = false;
        console.log(`${testDefName}: No changes`);
      } else {
        console.log(`${testDefName}: Config changed, will update`);
      }
    } else {
      console.log(`${testDefName}: New test detected, will create`);
    }

    if (!needsUpdate) {
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would update test: ${testDefName}`);
      continue;
    }

    // Perform API operation
    try {
      const testId = lockedTest?.id;
      const testApiConfig = toCamelCaseKeys(testConfig) as unknown as ElevenLabs.conversationalAi.CreateUnitTestRequest;

      if (!testId) {
        // Create new test
        const response = await createTestApi(client!, testApiConfig);
        const newTestId = response.id;
        console.log(`Created test ${testDefName} (ID: ${newTestId})`);
        updateTestInLock(lockData, testDefName, newTestId, configHash);
      } else {
        // Update existing test
        await updateTestApi(client!, testId, testApiConfig as ElevenLabs.conversationalAi.UpdateUnitTestRequest);
        console.log(`Updated test ${testDefName} (ID: ${testId})`);
        updateTestInLock(lockData, testDefName, testId, configHash);
      }

      changesMade = true;

    } catch (error) {
      console.log(`Error processing ${testDefName}: ${error}`);
    }
  }

  // Save lock file if changes were made
  if (changesMade && !dryRun) {
    await saveLockFile(lockFilePath, lockData);
    console.log('Updated lock file');
  }
}

async function pushTools(toolName?: string, dryRun = false): Promise<void> {
  // Load tools configuration
  const toolsConfigPath = path.resolve(TOOLS_CONFIG_FILE);
  if (!(await fs.pathExists(toolsConfigPath))) {
    throw new Error('tools.json not found. Run \'agents add-webhook-tool\' or \'agents add-client-tool\' first.');
  }

  const toolsConfig = await readToolsConfig(toolsConfigPath);
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);

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
      toolConfig = await readAgentConfig(configPath);
    } catch (error) {
      console.log(`Error reading config for ${toolDefName}: ${error}`);
      continue;
    }

    // Calculate config hash
    const configHash = calculateConfigHash(toSnakeCaseKeys(toolConfig));

    // Get tool data from lock file
    const lockedTool = getToolFromLock(lockData, toolDefName);

    let needsUpdate = true;

    if (lockedTool) {
      if (lockedTool.hash === configHash) {
        needsUpdate = false;
        console.log(`${toolDefName}: No changes`);
      } else {
        console.log(`${toolDefName}: Config changed, will update`);
      }
    } else {
      console.log(`${toolDefName}: New tool detected, will create`);
    }

    if (!needsUpdate) {
      continue;
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would update tool: ${toolDefName}`);
      continue;
    }

    // Perform API operation
    try {
      const toolId = lockedTool?.id;

      if (!toolId) {
        // Create new tool
        const response = await createToolApi(client!, toolConfig);
        const newToolId = (response as { toolId?: string }).toolId || `tool_${Date.now()}`;
        console.log(`Created tool ${toolDefName} (ID: ${newToolId})`);
        updateToolInLock(lockData, toolDefName, newToolId, configHash);
      } else {
        // Update existing tool
        await updateToolApi(client!, toolId, toolConfig);
        console.log(`Updated tool ${toolDefName} (ID: ${toolId})`);
        updateToolInLock(lockData, toolDefName, toolId, configHash);
      }

      changesMade = true;

    } catch (error) {
      console.log(`Error processing ${toolDefName}: ${error}`);
    }
  }

  // Save lock file if changes were made
  if (changesMade && !dryRun) {
    await saveLockFile(lockFilePath, lockData);
    console.log('Updated lock file');
  }
}

async function pullTests(options: { outputDir: string; dryRun: boolean }): Promise<void> {
  // Check if tests.json exists
  const testsConfigPath = path.resolve(TESTS_CONFIG_FILE);
  let testsConfig: TestsConfig;

  try {
    testsConfig = await readAgentConfig<TestsConfig>(testsConfigPath);
  } catch (error) {
    testsConfig = { tests: [] };
    await writeAgentConfig(testsConfigPath, testsConfig);
    console.log(`Created ${TESTS_CONFIG_FILE}`);
  }

  const client = await getElevenLabsClient();

  // Fetch all tests from ElevenLabs
  console.log('Fetching tests from ElevenLabs...');
  const testsList = await listTestsApi(client, 30);

  if (testsList.length === 0) {
    console.log('No tests found in your ElevenLabs workspace.');
    return;
  }

  console.log(`Found ${testsList.length} test(s)`);

  // Load existing config
  const existingTestNames = new Set(testsConfig.tests.map(test => test.name));

  // Load lock file to check for existing test IDs
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  const existingTestIds = new Set<string>();

  // Collect all existing test IDs
  Object.values(lockData.tests || {}).forEach(testData => {
    if (testData.id) {
      existingTestIds.add(testData.id);
    }
  });

  let newTestsAdded = 0;

  for (const testMeta of testsList) {
    const testMetaTyped = testMeta as { id?: string; name: string };
    const testId = testMetaTyped.id;
    if (!testId) {
      console.log(`Warning: Skipping test '${testMetaTyped.name}' - no test ID found`);
      continue;
    }
    let testNameRemote = testMetaTyped.name;

    // Skip if test already exists by ID
    if (existingTestIds.has(testId)) {
      console.log(`Skipping '${testNameRemote}' - already exists (ID: ${testId})`);
      continue;
    }

    // Check for name conflicts
    if (existingTestNames.has(testNameRemote)) {
      let counter = 1;
      const originalName = testNameRemote;
      while (existingTestNames.has(testNameRemote)) {
        testNameRemote = `${originalName}_${counter}`;
        counter++;
      }
      console.log(`Warning: Name conflict: renamed '${originalName}' to '${testNameRemote}'`);
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Would pull test: ${testNameRemote} (ID: ${testId})`);
      continue;
    }

    try {
      // Fetch detailed test configuration
      console.log(`Pulling config for '${testNameRemote}'...`);
      const testDetails = await getTestApi(client, testId);

      // Generate config file path
      const safeName = testNameRemote.toLowerCase().replace(/\s+/g, '_').replace(/[[\]]/g, '');
      const configPath = `${options.outputDir}/${safeName}.json`;

      // Create config file
      const configFilePath = path.resolve(configPath);
      await fs.ensureDir(path.dirname(configFilePath));
      await writeAgentConfig(configFilePath, testDetails);

      // Create new test entry for tests.json
      const newTest: TestDefinition = {
        name: testNameRemote,
        config: configPath
      };

      // Add to tests config
      testsConfig.tests.push(newTest);
      existingTestNames.add(testNameRemote);
      existingTestIds.add(testId);

      // Update lock file with test ID
      const configHash = calculateConfigHash(toSnakeCaseKeys(testDetails));
      updateTestInLock(lockData, testNameRemote, testId, configHash);

      console.log(`Added '${testNameRemote}' (config: ${configPath})`);
      newTestsAdded++;

    } catch (error) {
      console.log(`Error pulling test '${testNameRemote}': ${error}`);
      continue;
    }
  }

  if (!options.dryRun && newTestsAdded > 0) {
    // Save updated tests.json
    await writeAgentConfig(testsConfigPath, testsConfig);

    // Save updated lock file
    await saveLockFile(lockFilePath, lockData);

    console.log(`Updated ${TESTS_CONFIG_FILE} and ${LOCK_FILE}`);
  }

  if (options.dryRun) {
    const newTestsCount = testsList.filter((t: unknown) => {
      const test = t as { id?: string };
      return test.id && !existingTestIds.has(test.id);
    }).length;
    console.log(`[DRY RUN] Would add ${newTestsCount} new test(s)`);
  } else {
    console.log(`Successfully added ${newTestsAdded} new test(s)`);
    if (newTestsAdded > 0) {
      console.log(`You can now edit the config files in '${options.outputDir}/' and run 'agents push-tests' to update`);
    }
  }
}

async function runAgentTestsWithUI(agentName: string, environment: string): Promise<void> {
  // Load agents configuration and get agent details
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'agents init\' first.');
  }

  const agentsConfig = await readAgentConfig<AgentsConfig>(agentsConfigPath);
  const agentDef = agentsConfig.agents.find(agent => agent.name === agentName);

  if (!agentDef) {
    throw new Error(`Agent '${agentName}' not found in configuration`);
  }

  // Get agent ID from lock file
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  const lockedAgent = getAgentFromLock(lockData, agentName, environment);

  if (!lockedAgent?.id) {
    throw new Error(`Agent '${agentName}' not found for environment '${environment}' or not yet pushed. Run 'agents push --agent ${agentName} --env ${environment}' to create the agent first`);
  }

  const agentId = lockedAgent.id;

  // Get agent config to find attached tests
  let configPath: string | undefined;
  if (agentDef.environments) {
    if (environment in agentDef.environments) {
      configPath = agentDef.environments[environment].config;
    } else {
      throw new Error(`Agent '${agentName}' not configured for environment '${environment}'`);
    }
  } else {
    configPath = agentDef.config;
  }

  if (!configPath || !(await fs.pathExists(configPath))) {
    throw new Error(`Config file not found for agent '${agentName}': ${configPath}`);
  }

  const agentConfig = await readAgentConfig<AgentConfig>(configPath);
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

async function runAgentTests(agentName: string, environment: string): Promise<void> {
  // Implementation for non-UI test running
  console.log(`Running tests for agent '${agentName}' in environment '${environment}'`);
  // This would be similar to runAgentTestsWithUI but without the UI component
  throw new Error('Non-UI test running not yet implemented. Use --ui mode.');
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
  // Special handling for 'add' command without subcommand
  if (args[0] === 'add' && (args.length === 1 || args[1].startsWith('-'))) {
    console.error('Error: Missing required subcommand');
    console.error('Usage: agents add <agent|webhook-tool|client-tool> [options]');
    console.error('');
    console.error('Available subcommands:');
    console.error('  agent          Add a new agent');
    console.error('  webhook-tool   Add a new webhook tool');
    console.error('  client-tool    Add a new client tool');
    process.exit(1);
  }

  const componentsCommand = program
    .command("components")
    .description(
      "Import components from the ElevenLabs UI registry (https://ui.elevenlabs.io)"
    );

  componentsCommand
    .command("add")
    .description("Add a new component from the ElevenLabs UI registry")
    .argument("[name]", "Name of the component")
    .action(async (name?: string) => {
      function getCommandPrefix(): string {
        if (process.env.npm_config_user_agent) {
          const userAgent = process.env.npm_config_user_agent;

          if (userAgent.includes("pnpm")) {
            return "pnpm dlx";
          }
          if (userAgent.includes("yarn")) {
            return "yarn dlx";
          }
          if (userAgent.includes("bun")) {
            return "bunx";
          }
        }

        return "npx -y";
      }

      const commandPrefix = getCommandPrefix();

      const component = name || "all";

      const targetUrl = new URL(
        `/r/${component}.json`,
        "https://ui.elevenlabs.io"
      ).toString();

      const fullCommand = `${commandPrefix} shadcn@latest add ${targetUrl}`;

      console.log(`Installing ${component} from ElevenLabs UI registry...`);
      console.log(`Running: ${fullCommand}`);

      const result = spawnSync(fullCommand, {
        stdio: "inherit",
        shell: true,
      });

      if (result.error) {
        console.error("Failed to execute command:", result.error.message);
        process.exit(1);
      } else if (result.status !== 0) {
        console.error(`Command failed with exit code ${result.status}`);
        process.exit(1);
      }
    });

  program.parse();
}
