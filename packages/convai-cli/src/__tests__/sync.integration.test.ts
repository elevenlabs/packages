/**
 * Integration tests for sync functionality with mocked API calls
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { 
  writeAgentConfig, 
  loadLockFile, 
  saveLockFile, 
  calculateConfigHash,
  updateAgentInLock 
} from '../utils';
import { getDefaultAgentTemplate } from '../templates';
import * as elevenLabsApi from '../elevenlabs-api';
import * as config from '../config';

// Mock the entire elevenlabs-api module
jest.mock('../elevenlabs-api');
const mockedElevenLabsApi = elevenLabsApi as jest.Mocked<typeof elevenLabsApi>;

// Mock the config module
jest.mock('../config');
const mockedConfig = config as jest.Mocked<typeof config>;

// Mock os module for config path
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn()
}));
const mockedOs = os as jest.Mocked<typeof os>;

describe('Sync Integration Tests', () => {
  let tempDir: string;
  let agentsConfigPath: string;
  let lockFilePath: string;

  beforeEach(async () => {
    // Create a temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'convai-sync-test-'));
    agentsConfigPath = path.join(tempDir, 'agents.json');
    lockFilePath = path.join(tempDir, 'convai.lock');

    // Mock os.homedir for config
    mockedOs.homedir.mockReturnValue(tempDir);

    // Mock config to return a valid API key
    mockedConfig.getApiKey.mockResolvedValue('test-api-key');

    // Mock ElevenLabs client
    const mockClient = {
      conversationalAi: {
        agents: {
          update: jest.fn()
        }
      }
    };
    mockedElevenLabsApi.getElevenLabsClient.mockResolvedValue(mockClient as any);
    mockedElevenLabsApi.updateAgentApi.mockResolvedValue('agent_123');

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    jest.clearAllMocks();
  });

  describe('Config change detection and API calls', () => {
    it('should call updateAgentApi when agent config changes', async () => {
      // Setup: Create initial agent configuration
      const agentName = 'Test Agent';
      const agentId = 'agent_123';
      const environment = 'prod';
      
      // Create agents.json
      const agentsConfig = {
        agents: [{
          name: agentName,
          environments: {
            [environment]: {
              config: `agent_configs/${environment}/test_agent.json`
            }
          }
        }]
      };
      await writeAgentConfig(agentsConfigPath, agentsConfig);

      // Create initial agent config
      const initialConfig = getDefaultAgentTemplate(agentName);
      const configPath = path.join(tempDir, agentsConfig.agents[0].environments[environment].config);
      await fs.ensureDir(path.dirname(configPath));
      await writeAgentConfig(configPath, initialConfig);

      // Create lock file with existing agent (using a different hash to ensure change detection)
      const lockData = {
        agents: {
          [agentName]: {
            [environment]: {
              id: agentId,
              hash: 'old_hash_that_will_not_match'
            }
          }
        },
        tools: {}
      };
      await saveLockFile(lockFilePath, lockData);

      // Modify the agent config to trigger a change
      const modifiedConfig = {
        ...initialConfig,
        conversation_config: {
          ...initialConfig.conversation_config,
          agent: {
            ...initialConfig.conversation_config.agent,
            prompt: {
              ...initialConfig.conversation_config.agent.prompt,
              prompt: 'Modified prompt for testing',
              temperature: 0.5 // Changed from 0.0
            }
          }
        }
      };
      await writeAgentConfig(configPath, modifiedConfig);

      // Import and call the sync logic
      const { syncAgentsWithMocks } = await createSyncFunction();
      
      // Execute sync
      await syncAgentsWithMocks(tempDir, agentName, false, environment);

      // Verify that updateAgentApi was called
      expect(mockedElevenLabsApi.updateAgentApi).toHaveBeenCalledTimes(1);
      expect(mockedElevenLabsApi.updateAgentApi).toHaveBeenCalledWith(
        expect.any(Object), // client
        agentId,
        agentName,
        modifiedConfig.conversation_config,
        modifiedConfig.platform_settings,
        modifiedConfig.tags
      );
    });

    it('should not call updateAgentApi when config has not changed', async () => {
      // Setup: Create agent configuration
      const agentName = 'Test Agent';
      const agentId = 'agent_123';
      const environment = 'prod';
      
      // Create agents.json
      const agentsConfig = {
        agents: [{
          name: agentName,
          environments: {
            [environment]: {
              config: `agent_configs/${environment}/test_agent.json`
            }
          }
        }]
      };
      await writeAgentConfig(agentsConfigPath, agentsConfig);

      // Create agent config
      const agentConfig = getDefaultAgentTemplate(agentName);
      const configPath = path.join(tempDir, agentsConfig.agents[0].environments[environment].config);
      await fs.ensureDir(path.dirname(configPath));
      await writeAgentConfig(configPath, agentConfig);

      // Create lock file with matching hash (no changes)
      const configHash = calculateConfigHash(agentConfig);
      const lockData = {
        agents: {
          [agentName]: {
            [environment]: {
              id: agentId,
              hash: configHash
            }
          }
        },
        tools: {}
      };
      await saveLockFile(lockFilePath, lockData);

      // Import and call the sync logic
      const { syncAgentsWithMocks } = await createSyncFunction();
      
      // Execute sync
      await syncAgentsWithMocks(tempDir, agentName, false, environment);

      // Verify that updateAgentApi was NOT called
      expect(mockedElevenLabsApi.updateAgentApi).not.toHaveBeenCalled();
    });

    it('should update lock file hash after successful API call', async () => {
      // Setup: Create agent with changed config
      const agentName = 'Test Agent';
      const agentId = 'agent_123';
      const environment = 'prod';
      
      // Create agents.json
      const agentsConfig = {
        agents: [{
          name: agentName,
          environments: {
            [environment]: {
              config: `agent_configs/${environment}/test_agent.json`
            }
          }
        }]
      };
      await writeAgentConfig(agentsConfigPath, agentsConfig);

      // Create modified agent config
      const modifiedConfig = getDefaultAgentTemplate(agentName);
      modifiedConfig.conversation_config.agent.prompt.prompt = 'Modified prompt';
      const configPath = path.join(tempDir, agentsConfig.agents[0].environments[environment].config);
      await fs.ensureDir(path.dirname(configPath));
      await writeAgentConfig(configPath, modifiedConfig);

      // Create lock file with old hash
      const lockData = {
        agents: {
          [agentName]: {
            [environment]: {
              id: agentId,
              hash: 'old_hash_value'
            }
          }
        },
        tools: {}
      };
      await saveLockFile(lockFilePath, lockData);

      // Import and call the sync logic
      const { syncAgentsWithMocks } = await createSyncFunction();
      
      // Execute sync
      await syncAgentsWithMocks(tempDir, agentName, false, environment);

      // Verify lock file was updated with new hash
      const updatedLockData = await loadLockFile(lockFilePath);
      const newHash = calculateConfigHash(modifiedConfig);
      expect(updatedLockData.agents[agentName][environment].hash).toBe(newHash);
      expect(updatedLockData.agents[agentName][environment].hash).not.toBe('old_hash_value');
    });

    it('should handle API errors gracefully', async () => {
      // Setup: Create agent configuration
      const agentName = 'Test Agent';
      const agentId = 'agent_123';
      const environment = 'prod';
      
      // Mock API to throw an error
      mockedElevenLabsApi.updateAgentApi.mockRejectedValue(new Error('API Error'));

      // Create agents.json
      const agentsConfig = {
        agents: [{
          name: agentName,
          environments: {
            [environment]: {
              config: `agent_configs/${environment}/test_agent.json`
            }
          }
        }]
      };
      await writeAgentConfig(agentsConfigPath, agentsConfig);

      // Create modified agent config
      const modifiedConfig = getDefaultAgentTemplate(agentName);
      modifiedConfig.conversation_config.agent.prompt.prompt = 'Modified prompt';
      const configPath = path.join(tempDir, agentsConfig.agents[0].environments[environment].config);
      await fs.ensureDir(path.dirname(configPath));
      await writeAgentConfig(configPath, modifiedConfig);

      // Create lock file
      const lockData = {
        agents: {
          [agentName]: {
            [environment]: {
              id: agentId,
              hash: 'old_hash'
            }
          }
        },
        tools: {}
      };
      await saveLockFile(lockFilePath, lockData);

      // Import and call the sync logic
      const { syncAgentsWithMocks } = await createSyncFunction();
      
      // Execute sync and expect it to handle the error
      await syncAgentsWithMocks(tempDir, agentName, false, environment);

      // Verify API was called but failed
      expect(mockedElevenLabsApi.updateAgentApi).toHaveBeenCalledTimes(1);
      
      // Verify lock file was NOT updated due to error
      const lockDataAfter = await loadLockFile(lockFilePath);
      expect(lockDataAfter.agents[agentName][environment].hash).toBe('old_hash');
    });
  });
});

// Helper function to create a testable sync function
async function createSyncFunction() {
  // This mimics the core sync logic from cli.ts but in a testable way
  async function syncAgentsWithMocks(
    projectPath: string,
    agentName?: string,
    dryRun = false,
    environment?: string
  ): Promise<void> {
    const AGENTS_CONFIG_FILE = "agents.json";
    const LOCK_FILE = "convai.lock";
    
    // Load agents configuration
    const agentsConfigPath = path.join(projectPath, AGENTS_CONFIG_FILE);
    const agentsConfig = await fs.readJson(agentsConfigPath);
    const lockFilePath = path.join(projectPath, LOCK_FILE);
    const lockData = await loadLockFile(lockFilePath);
    
    // Initialize ElevenLabs client
    let client: any;
    if (!dryRun) {
      client = await mockedElevenLabsApi.getElevenLabsClient();
    }
    
    // Filter agents if specific agent name provided
    let agentsToProcess = agentsConfig.agents;
    if (agentName) {
      agentsToProcess = agentsConfig.agents.filter((agent: any) => agent.name === agentName);
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
        }
      }
      environmentsToSync = Array.from(envSet);
    }
    
    let changesMade = false;
    
    for (const currentEnv of environmentsToSync) {
      for (const agentDef of agentsToProcess) {
        const agentDefName = agentDef.name;
        
        // Get config path for current environment
        let configPath: string | undefined;
        if (agentDef.environments && currentEnv in agentDef.environments) {
          configPath = agentDef.environments[currentEnv].config;
        } else {
          continue;
        }
        
        // Check if config file exists
        if (!configPath) {
          continue;
        }
        const fullConfigPath = path.join(projectPath, configPath);
        if (!(await fs.pathExists(fullConfigPath))) {
          continue;
        }
        
        // Load agent config
        const agentConfig = await fs.readJson(fullConfigPath);
        
        // Calculate config hash
        const configHash = calculateConfigHash(agentConfig);
        
        // Get environment-specific agent data from lock file
        const lockedAgent = lockData.agents?.[agentDefName]?.[currentEnv];
        
        let needsUpdate = true;
        
        if (lockedAgent && lockedAgent.hash === configHash) {
          needsUpdate = false;
        }
        
        if (!needsUpdate || dryRun) {
          continue;
        }
        
        // Perform API operation
        try {
          const agentId = lockedAgent?.id;
          
          // Extract config components
          const conversationConfig = agentConfig.conversation_config || {};
          const platformSettings = agentConfig.platform_settings;
          const tags = agentConfig.tags || [];
          
          const agentDisplayName = agentConfig.name || agentDefName;
          
          if (agentId) {
            // Update existing agent
            await mockedElevenLabsApi.updateAgentApi(
              client!,
              agentId,
              agentDisplayName,
              conversationConfig,
              platformSettings,
              tags
            );
            updateAgentInLock(lockData, agentDefName, currentEnv, agentId, configHash);
            changesMade = true;
          }
          
        } catch (error) {
          // Log error but continue (matches CLI behavior)
          console.log(`Error processing ${agentDefName}: ${error}`);
        }
      }
    }
    
    // Save lock file if changes were made
    if (changesMade && !dryRun) {
      await saveLockFile(lockFilePath, lockData);
    }
  }

  return { syncAgentsWithMocks };
}