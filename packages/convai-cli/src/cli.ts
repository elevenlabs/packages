#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as dotenv from 'dotenv';
import { 
  calculateConfigHash, 
  readAgentConfig, 
  writeAgentConfig, 
  loadLockFile, 
  saveLockFile, 
  getAgentFromLock, 
  updateAgentInLock,
  LockFileData 
} from './utils';
import { 
  getTemplateByName, 
  getTemplateOptions,
  AgentConfig 
} from './templates';
import { 
  getElevenLabsClient, 
  createAgentApi, 
  updateAgentApi, 
  listAgentsApi, 
  getAgentApi 
} from './elevenlabs-api';

// Load environment variables
dotenv.config();

const program = new Command();

// Default file names
const AGENTS_CONFIG_FILE = "agents.json";
const LOCK_FILE = "convai.lock";

interface AgentDefinition {
  name: string;
  environments?: Record<string, { config: string }>;
  config?: string; // For backward compatibility
}

interface AgentsConfig {
  agents: AgentDefinition[];
}

program
  .name('convai')
  .description('ElevenLabs Conversational AI Agent Manager CLI')
  .version('0.1.7');

program
  .command('init')
  .description('Initialize a new agent management project')
  .argument('[path]', 'Path to initialize the project in', '.')
  .action(async (projectPath: string) => {
    console.log(`Initializing project in ${projectPath}`);
  });

program
  .command('add')
  .description('Add a new agent - creates config, uploads to ElevenLabs, and saves ID')
  .argument('<name>', 'Name of the agent to create')
  .option('--config-path <path>', 'Custom config path (optional)')
  .option('--template <template>', 'Template type to use', 'default')
  .option('--skip-upload', 'Create config file only, don\'t upload to ElevenLabs', false)
  .option('--env <environment>', 'Environment to create agent for', 'prod')
  .action(async (name: string, options: any) => {
    try {
      // Check if agents.json exists
      const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
      if (!(await fs.pathExists(agentsConfigPath))) {
        console.error('❌ agents.json not found. Run \'convai init\' first.');
        process.exit(1);
      }
      
      // Load existing config
      const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
      
      // Load lock file to check environment-specific agents
      const lockFilePath = path.resolve(LOCK_FILE);
      const lockData = await loadLockFile(lockFilePath);
      
      // Check if agent already exists for this specific environment
      const lockedAgent = getAgentFromLock(lockData, name, options.env);
      if (lockedAgent?.id) {
        console.error(`❌ Agent '${name}' already exists for environment '${options.env}'`);
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
        console.error(`❌ ${error}`);
        process.exit(1);
      }
      
      await writeAgentConfig(configFilePath, agentConfig);
      console.log(`📝 Created config file: ${configPath} (template: ${options.template})`);
      
      if (existingAgent) {
        console.log(`📋 Agent '${name}' exists, adding new environment '${options.env}'`);
      } else {
        console.log(`🆕 Creating new agent '${name}' for environment '${options.env}'`);
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
          console.log(`✅ Added agent '${name}' to agents.json (local only)`);
        } else {
          if (!existingAgent.environments) {
            const oldConfig = existingAgent.config || '';
            existingAgent.environments = { default: { config: oldConfig } };
            delete existingAgent.config;
          }
          existingAgent.environments[options.env] = { config: configPath };
          console.log(`✅ Added environment '${options.env}' to existing agent '${name}' (local only)`);
        }
        
        await writeAgentConfig(agentsConfigPath, agentsConfig);
        console.log(`💡 Edit ${configPath} to customize your agent, then run 'convai sync --env ${options.env}' to upload`);
        return;
      }
      
      // Create agent in ElevenLabs
      console.log(`🚀 Creating agent '${name}' in ElevenLabs (environment: ${options.env})...`);
      
      const client = getElevenLabsClient();
      
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
      
      console.log(`✅ Created agent in ElevenLabs with ID: ${agentId}`);
      
      if (!existingAgent) {
        const newAgent: AgentDefinition = {
          name,
          environments: {
            [options.env]: { config: configPath }
          }
        };
        agentsConfig.agents.push(newAgent);
        console.log(`✅ Added agent '${name}' to agents.json`);
      } else {
        if (!existingAgent.environments) {
          const oldConfig = existingAgent.config || '';
          existingAgent.environments = { default: { config: oldConfig } };
          delete existingAgent.config;
        }
        existingAgent.environments[options.env] = { config: configPath };
        console.log(`✅ Added environment '${options.env}' to existing agent '${name}'`);
      }
      
      // Save updated agents.json
      await writeAgentConfig(agentsConfigPath, agentsConfig);
      
      // Update lock file with environment-specific agent ID
      const configHash = calculateConfigHash(agentConfig);
      updateAgentInLock(lockData, name, options.env, agentId, configHash);
      await saveLockFile(lockFilePath, lockData);
      
      console.log(`💡 Edit ${configPath} to customize your agent, then run 'convai sync --env ${options.env}' to update`);
      
    } catch (error) {
      console.error(`❌ Error creating agent: ${error}`);
      process.exit(1);
    }
  });

program
  .command('templates-list')
  .description('List available agent templates')
  .action(() => {
    const templateOptions = getTemplateOptions();
    
    console.log('Available Agent Templates:');
    console.log('='.repeat(40));
    
    for (const [templateName, description] of Object.entries(templateOptions)) {
      console.log(`\n🎯 ${templateName}`);
      console.log(`   ${description}`);
    }
    
    console.log('\n💡 Use \'convai add <name> --template <template_name>\' to create an agent with a specific template');
  });

program
  .command('template-show')
  .description('Show the configuration for a specific template')
  .argument('<template>', 'Template name to show')
  .option('--agent-name <name>', 'Agent name to use in template', 'example_agent')
  .action((templateName: string, options: any) => {
    try {
      const templateConfig = getTemplateByName(options.agentName, templateName);
      console.log(`Template: ${templateName}`);
      console.log('='.repeat(40));
      console.log(JSON.stringify(templateConfig, null, 2));
    } catch (error) {
      console.error(`❌ ${error}`);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Synchronize agents with ElevenLabs API when configs change')
  .option('--agent <name>', 'Specific agent name to sync (defaults to all agents)')
  .option('--dry-run', 'Show what would be done without making changes', false)
  .option('--env <environment>', 'Target specific environment (defaults to all environments)')
  .action(async (options: any) => {
    try {
      await syncAgents(options.agent, options.dryRun, options.env);
    } catch (error) {
      console.error(`❌ Error during sync: ${error}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show the status of agents')
  .option('--agent <name>', 'Specific agent name to check (defaults to all agents)')
  .option('--env <environment>', 'Environment to check status for (defaults to all environments)')
  .action(async (options: any) => {
    try {
      await showStatus(options.agent, options.env);
    } catch (error) {
      console.error(`❌ Error showing status: ${error}`);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Watch for config changes and auto-sync agents')
  .option('--agent <name>', 'Specific agent name to watch (defaults to all agents)')
  .option('--env <environment>', 'Environment to watch', 'prod')
  .option('--interval <seconds>', 'Check interval in seconds', '5')
  .action(async (options: any) => {
    try {
      await watchForChanges(options.agent, options.env, parseInt(options.interval));
    } catch (error) {
      console.error(`❌ Error in watch mode: ${error}`);
      process.exit(1);
    }
  });

program
  .command('list-agents')
  .description('List all configured agents')
  .action(async () => {
    try {
      await listConfiguredAgents();
    } catch (error) {
      console.error(`❌ Error listing agents: ${error}`);
      process.exit(1);
    }
  });

program
  .command('fetch')
  .description('Fetch all agents from ElevenLabs workspace and add them to local configuration')
  .option('--agent <name>', 'Specific agent name pattern to search for')
  .option('--output-dir <dir>', 'Directory to store fetched agent configs', 'agent_configs')
  .option('--search <term>', 'Search agents by name')
  .option('--dry-run', 'Show what would be fetched without making changes', false)
  .option('--env <environment>', 'Environment to associate fetched agents with', 'prod')
  .action(async (options: any) => {
    try {
      await fetchAgents(options);
    } catch (error) {
      console.error(`❌ Error fetching agents: ${error}`);
      process.exit(1);
    }
  });

program
  .command('widget')
  .description('Generate HTML widget snippet for an agent')
  .argument('<name>', 'Name of the agent to generate widget for')
  .option('--env <environment>', 'Environment to get agent ID from', 'prod')
  .action(async (name: string, options: any) => {
    try {
      await generateWidget(name, options.env);
    } catch (error) {
      console.error(`❌ Error generating widget: ${error}`);
      process.exit(1);
    }
  });

// Helper functions

async function syncAgents(agentName?: string, dryRun = false, environment?: string): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  
  // Initialize ElevenLabs client
  let client;
  if (!dryRun) {
    client = getElevenLabsClient();
  }
  
  // Filter agents if specific agent name provided
  let agentsToProcess = agentsConfig.agents;
  if (agentName) {
    agentsToProcess = agentsConfig.agents.filter(agent => agent.name === agentName);
    if (agentsToProcess.length === 0) {
      throw new Error(`Agent '${agentName}' not found in configuration`);
    }
  }
  
  // Determine environments to sync
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
      console.log('No environments found to sync');
      return;
    }
    
    console.log(`🔄 Syncing all environments: ${environmentsToSync.join(', ')}`);
  }
  
  let changesMade = false;
  
  for (const currentEnv of environmentsToSync) {
    console.log(`\n📍 Processing environment: ${currentEnv}`);
    
    for (const agentDef of agentsToProcess) {
      const agentDefName = agentDef.name;
      
      // Handle both old and new config structure
      let configPath: string | undefined;
      if (agentDef.environments) {
        if (currentEnv in agentDef.environments) {
          configPath = agentDef.environments[currentEnv].config;
        } else {
          console.log(`⚠️  Agent '${agentDefName}' not configured for environment '${currentEnv}'`);
          continue;
        }
      } else {
        configPath = agentDef.config;
        if (!configPath) {
          console.log(`⚠️  No config path found for agent '${agentDefName}'`);
          continue;
        }
      }
      
      // Check if config file exists
      if (!(await fs.pathExists(configPath))) {
        console.log(`⚠️  Config file not found for ${agentDefName}: ${configPath}`);
        continue;
      }
      
      // Load agent config
      let agentConfig: AgentConfig;
      try {
        agentConfig = await readAgentConfig(configPath) as AgentConfig;
      } catch (error) {
        console.log(`❌ Error reading config for ${agentDefName}: ${error}`);
        continue;
      }
      
      // Calculate config hash
      const configHash = calculateConfigHash(agentConfig);
      
      // Get environment-specific agent data from lock file
      const lockedAgent = getAgentFromLock(lockData, agentDefName, currentEnv);
      
      let needsUpdate = true;
      
      if (lockedAgent) {
        if (lockedAgent.hash === configHash) {
          needsUpdate = false;
          console.log(`✅ ${agentDefName}: No changes (environment: ${currentEnv})`);
        } else {
          console.log(`🔄 ${agentDefName}: Config changed, will update (environment: ${currentEnv})`);
        }
      } else {
        console.log(`🆕 ${agentDefName}: New environment detected, will create/update (environment: ${currentEnv})`);
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
          console.log(`✅ Created agent ${agentDefName} for environment '${currentEnv}' (ID: ${newAgentId})`);
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
          console.log(`✅ Updated agent ${agentDefName} for environment '${currentEnv}' (ID: ${agentId})`);
          updateAgentInLock(lockData, agentDefName, currentEnv, agentId, configHash);
        }
        
        changesMade = true;
        
      } catch (error) {
        console.log(`❌ Error processing ${agentDefName}: ${error}`);
      }
    }
  }
  
  // Save lock file if changes were made
  if (changesMade && !dryRun) {
    await saveLockFile(lockFilePath, lockData);
    console.log('💾 Updated lock file');
  }
}

async function showStatus(agentName?: string, environment?: string): Promise<void> {
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'init\' first.');
  }
  
  const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
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
      
      console.log(`\n📋 ${agentNameCurrent}`);
      console.log(`   Environment: ${currentEnv}`);
      console.log(`   Agent ID: ${agentId}`);
      console.log(`   Config: ${configPath}`);
      
      // Check config file status
      if (await fs.pathExists(configPath)) {
        try {
          const agentConfig = await readAgentConfig(configPath);
          const configHash = calculateConfigHash(agentConfig);
          console.log(`   Config Hash: ${configHash.substring(0, 8)}...`);
          
          // Check lock status for specified environment
          if (lockedAgent) {
            if (lockedAgent.hash === configHash) {
              console.log(`   Status: ✅ Synced (${currentEnv})`);
            } else {
              console.log(`   Status: 🔄 Config changed (needs sync for ${currentEnv})`);
            }
          } else {
            console.log(`   Status: 🆕 New (needs sync for ${currentEnv})`);
          }
          
        } catch (error) {
          console.log(`   Status: ❌ Config error: ${error}`);
        }
      } else {
        console.log('   Status: ❌ Config file not found');
      }
    }
  }
}

async function watchForChanges(agentName?: string, environment = 'prod', interval = 5): Promise<void> {
  console.log(`👀 Watching for config changes (checking every ${interval}s)...`);
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
      const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
      
      // Filter agents if specific agent name provided
      let agentsToWatch = agentsConfig.agents;
      if (agentName) {
        agentsToWatch = agentsConfig.agents.filter(agent => agent.name === agentName);
      }
      
      // Check agents.json itself
      const agentsMtime = await getFileMtime(agentsConfigPath);
      if (fileTimestamps.get(agentsConfigPath) !== agentsMtime) {
        fileTimestamps.set(agentsConfigPath, agentsMtime);
        console.log(`📝 Detected change in ${AGENTS_CONFIG_FILE}`);
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
              console.log(`📝 Detected change in ${configPath}`);
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
        console.log('🔄 Running sync...');
        try {
          await syncAgents(agentName, false, environment);
        } catch (error) {
          console.log(`❌ Error during sync: ${error}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval * 1000));
    }
  } catch (error) {
    if ((error as any).code === 'SIGINT') {
      console.log('\n👋 Stopping watch mode');
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
  
  const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
  
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

async function fetchAgents(options: any): Promise<void> {
  // Check if agents.json exists
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'convai init\' first.');
  }
  
  const client = getElevenLabsClient();
  
  // Use agent option as search term if provided, otherwise use search parameter
  const searchTerm = options.agent || options.search;
  
  // Fetch all agents from ElevenLabs
  console.log('🔍 Fetching agents from ElevenLabs...');
  const agentsList = await listAgentsApi(client, 30, searchTerm);
  
  if (agentsList.length === 0) {
    console.log('No agents found in your ElevenLabs workspace.');
    return;
  }
  
  console.log(`Found ${agentsList.length} agent(s)`);
  
  // Load existing config
  const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
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
    const agentId = agentMeta.agentId || agentMeta.agent_id;
    let agentNameRemote = agentMeta.name;
    
    // Skip if agent already exists by ID (in any environment)
    if (existingAgentIds.has(agentId)) {
      console.log(`⏭️  Skipping '${agentNameRemote}' - already exists (ID: ${agentId})`);
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
      console.log(`⚠️  Name conflict: renamed '${originalName}' to '${agentNameRemote}'`);
    }
    
    if (options.dryRun) {
      console.log(`[DRY RUN] Would fetch agent: ${agentNameRemote} (ID: ${agentId}) for environment: ${options.env}`);
      continue;
    }
    
    try {
      // Fetch detailed agent configuration
      console.log(`📥 Fetching config for '${agentNameRemote}'...`);
      const agentDetails = await getAgentApi(client, agentId);
      
      // Extract configuration components
      const conversationConfig = agentDetails.conversationConfig || agentDetails.conversation_config || {};
      const platformSettings = agentDetails.platformSettings || agentDetails.platform_settings || {};
      const tags = agentDetails.tags || [];
      
      // Create agent config structure
      const agentConfig: AgentConfig = {
        name: agentNameRemote,
        conversation_config: conversationConfig,
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
      const configHash = calculateConfigHash(agentConfig);
      updateAgentInLock(lockData, agentNameRemote, options.env, agentId, configHash);
      
      console.log(`✅ Added '${agentNameRemote}' (config: ${configPath}) for environment: ${options.env}`);
      newAgentsAdded++;
      
    } catch (error) {
      console.log(`❌ Error fetching agent '${agentNameRemote}': ${error}`);
      continue;
    }
  }
  
  if (!options.dryRun && newAgentsAdded > 0) {
    // Save updated agents.json
    await writeAgentConfig(agentsConfigPath, agentsConfig);
    
    // Save updated lock file
    await saveLockFile(lockFilePath, lockData);
    
    console.log(`💾 Updated ${AGENTS_CONFIG_FILE} and ${LOCK_FILE}`);
  }
  
  if (options.dryRun) {
    const newAgentsCount = agentsList.filter(a => !existingAgentIds.has(a.agentId || a.agent_id)).length;
    console.log(`[DRY RUN] Would add ${newAgentsCount} new agent(s) for environment: ${options.env}`);
  } else {
    console.log(`✅ Successfully added ${newAgentsAdded} new agent(s) for environment: ${options.env}`);
    if (newAgentsAdded > 0) {
      console.log(`💡 You can now edit the config files in '${options.outputDir}/' and run 'convai sync --env ${options.env}' to update`);
    }
  }
}

async function generateWidget(name: string, environment: string): Promise<void> {
  // Load agents configuration
  const agentsConfigPath = path.resolve(AGENTS_CONFIG_FILE);
  if (!(await fs.pathExists(agentsConfigPath))) {
    throw new Error('agents.json not found. Run \'convai init\' first.');
  }
  
  // Load lock file to get agent ID
  const lockFilePath = path.resolve(LOCK_FILE);
  const lockData = await loadLockFile(lockFilePath);
  
  // Check if agent exists in config
  const agentsConfig = await readAgentConfig(agentsConfigPath) as AgentsConfig;
  const agentExists = agentsConfig.agents.some(agent => agent.name === name);
  
  if (!agentExists) {
    throw new Error(`Agent '${name}' not found in configuration`);
  }
  
  // Get environment-specific agent data from lock file
  const lockedAgent = getAgentFromLock(lockData, name, environment);
  
  if (!lockedAgent?.id) {
    throw new Error(`Agent '${name}' not found for environment '${environment}' or not yet synced. Run 'convai sync --agent ${name} --env ${environment}' to create the agent first`);
  }
  
  const agentId = lockedAgent.id;
  
  // Generate HTML widget snippet
  const htmlSnippet = `<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  
  console.log(`🎯 HTML Widget for '${name}' (environment: ${environment}):`);
  console.log('='.repeat(60));
  console.log(htmlSnippet);
  console.log('='.repeat(60));
  console.log(`Agent ID: ${agentId}`);
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n👋 Exiting...');
  process.exit(0);
});

program.parse(); 