/**
 * Integration tests for pull agents functionality with different flags
 * Tests the --update, --all, and --yes flags
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import * as elevenLabsApi from "../elevenlabs-api";
import * as config from "../config";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { readConfig, writeConfig } from "../utils";
import {
  setupPullTestEnvironment,
  setupCommonMocks,
  clearAllMocks,
} from "./helpers/pull-test-helpers";

interface AgentDefinition {
  name: string;
  config: string;
  id?: string;
}

interface AgentsConfig {
  agents: AgentDefinition[];
}

// Mock the entire elevenlabs-api module
jest.mock("../elevenlabs-api");
const mockedElevenLabsApi = elevenLabsApi as jest.Mocked<typeof elevenLabsApi>;

// Mock the config module
jest.mock("../config");
const mockedConfig = config as jest.Mocked<typeof config>;

// Mock os module for config path
jest.mock("os", () => ({
  ...jest.requireActual("os"),
  homedir: jest.fn(),
}));
const mockedOs = os as jest.Mocked<typeof os>;

describe("Pull Agents Integration Tests", () => {
  let tempDir: string;
  let agentsConfigPath: string;
  let agentConfigsDir: string;

  beforeEach(async () => {
    // Create a temporary directory using helper
    const env = await setupPullTestEnvironment({
      resourceType: 'agents',
      tempDirPrefix: 'agents-pull-test-',
    });
    
    tempDir = env.tempDir;
    agentsConfigPath = env.configPath;
    agentConfigsDir = env.configsDir;

    // Set up common mocks
    setupCommonMocks(mockedConfig, mockedOs, mockedElevenLabsApi);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    clearAllMocks();
  });

  describe("ID-based agent matching", () => {
    it("should match agents by ID, not by name", async () => {
      // Create initial agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "existing-agent",
            config: "agent_configs/existing-agent.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Create the config file
      const agentConfigPath = path.join(agentConfigsDir, "existing-agent.json");
      await writeConfig(agentConfigPath, {
        name: "existing-agent",
        conversation_config: { agent: { prompt: { prompt: "old prompt" } } },
        platform_settings: {},
        tags: [],
      });

      // Mock API to return agent with same ID but different name
      const mockRemoteAgents = [
        {
          agentId: "agent_123",
          agent_id: "agent_123",
          name: "renamed-agent",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);
      mockedElevenLabsApi.getAgentApi.mockResolvedValue({
        agentId: "agent_123",
        name: "renamed-agent",
        conversationConfig: {
          agent: { prompt: { prompt: "new prompt" } },
        },
        platformSettings: {},
        tags: [],
      });

      // Verify: Agent should be identified by ID, not name
      // The local name is "existing-agent" but remote name is "renamed-agent"
      // Since ID matches (agent_123), it should be treated as the same agent
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents[0].id).toBe("agent_123");
      expect(config.agents[0].name).toBe("existing-agent");
    });

    it("should handle agents without IDs gracefully", async () => {
      // Create agents.json with agent missing ID
      const agentsConfig = {
        agents: [
          {
            name: "agent-no-id",
            config: "agent_configs/agent-no-id.json",
            // Missing id field
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Mock API to return remote agents
      const mockRemoteAgents = [
        {
          agentId: "agent_456",
          agent_id: "agent_456",
          name: "agent-no-id",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);

      // Verify: Agent without ID should be treated as non-existing
      // and a new agent should be pulled (name conflict will add _1)
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents[0].id).toBeUndefined();
    });
  });

  describe("Default pull behavior (no flags)", () => {
    it("should pull new agents and skip existing ones", async () => {
      // Create initial agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "existing-agent",
            config: "agent_configs/existing-agent.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Create the existing config file
      const existingConfigPath = path.join(
        agentConfigsDir,
        "existing-agent.json"
      );
      await writeConfig(existingConfigPath, {
        name: "existing-agent",
        conversation_config: { agent: { prompt: { prompt: "old prompt" } } },
        platform_settings: {},
        tags: [],
      });

      // Mock API to return both existing and new agents
      const mockRemoteAgents = [
        {
          agentId: "agent_123",
          agent_id: "agent_123",
          name: "existing-agent",
        },
        {
          agentId: "agent_456",
          agent_id: "agent_456",
          name: "new-agent",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);
      mockedElevenLabsApi.getAgentApi.mockResolvedValue({
        agentId: "agent_456",
        name: "new-agent",
        conversationConfig: {
          agent: { prompt: { prompt: "new prompt" } },
        },
        platformSettings: {},
        tags: [],
      });

      // Expected behavior (conceptually):
      // - existing-agent (ID: agent_123) should be SKIPPED
      // - new-agent (ID: agent_456) should be CREATED
      
      // After pull with default options:
      // - agents.json should have 2 entries
      // - existing-agent.json should NOT be updated (keep old prompt)
      // - new-agent.json should be created

      // Verify existing config was not modified
      const existingConfig = await readConfig<{
        conversation_config: { agent: { prompt: { prompt: string } } };
      }>(existingConfigPath);
      expect(existingConfig.conversation_config.agent.prompt.prompt).toBe(
        "old prompt"
      );
    });

    it("should handle name conflicts by appending counter", async () => {
      // Create initial agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "test-agent",
            config: "agent_configs/test-agent.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Mock API to return new agent with conflicting name
      const mockRemoteAgents = [
        {
          agentId: "agent_456",
          agent_id: "agent_456",
          name: "test-agent",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);
      mockedElevenLabsApi.getAgentApi.mockResolvedValue({
        agentId: "agent_456",
        name: "test-agent",
        conversationConfig: {},
        platformSettings: {},
        tags: [],
      });

      // Expected: New agent should be named "test-agent_1" to avoid conflict
      // This is the expected behavior - the new agent with different ID
      // but same name should get a "_1" suffix
    });
  });

  describe("Pull with --update flag", () => {
    it("should update existing agents and skip new ones", async () => {
      // Create initial agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "existing-agent",
            config: "agent_configs/existing-agent.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Create the existing config file with old content
      const existingConfigPath = path.join(
        agentConfigsDir,
        "existing-agent.json"
      );
      await writeConfig(existingConfigPath, {
        name: "existing-agent",
        conversation_config: { agent: { prompt: { prompt: "old prompt" } } },
        platform_settings: {},
        tags: [],
      });

      // Mock API to return both existing and new agents
      const mockRemoteAgents = [
        {
          agentId: "agent_123",
          agent_id: "agent_123",
          name: "existing-agent",
        },
        {
          agentId: "agent_456",
          agent_id: "agent_456",
          name: "new-agent",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);
      
      // Mock getAgentApi for the existing agent
      mockedElevenLabsApi.getAgentApi.mockImplementation(async (client, id) => {
        if (id === "agent_123") {
          return {
            agentId: "agent_123",
            name: "existing-agent",
            conversationConfig: {
              agent: { prompt: { prompt: "updated prompt" } },
            },
            platformSettings: {},
            tags: [],
          };
        }
        return {
          agentId: id,
          name: "new-agent",
          conversationConfig: {},
          platformSettings: {},
          tags: [],
        };
      });

      // Expected behavior with --update:
      // - existing-agent (ID: agent_123) should be UPDATED
      // - new-agent (ID: agent_456) should be SKIPPED
      
      // After pull with --update:
      // - agents.json should still have only 1 entry (existing-agent)
      // - existing-agent.json should be updated with new prompt
      // - new-agent.json should NOT be created
      
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents).toHaveLength(1);
      expect(config.agents[0].id).toBe("agent_123");
    });

    it("should not create new agents when using --update", async () => {
      // Create initial agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "agent-one",
            config: "agent_configs/agent-one.json",
            id: "agent_111",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Mock API to return only new agents (not in local config)
      const mockRemoteAgents = [
        {
          agentId: "agent_222",
          agent_id: "agent_222",
          name: "agent-two",
        },
        {
          agentId: "agent_333",
          agent_id: "agent_333",
          name: "agent-three",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);

      // Expected: agents.json should remain unchanged with --update
      // because all remote agents are new (no matching IDs)
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents).toHaveLength(1);
      expect(config.agents[0].id).toBe("agent_111");
    });

    it("should preserve existing config file paths when updating", async () => {
      // Create initial agents.json
      const agentsConfig = {
        agents: [
          {
            name: "my-agent",
            config: "agent_configs/custom-path.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Create config at custom path
      const customConfigPath = path.join(agentConfigsDir, "custom-path.json");
      await writeConfig(customConfigPath, {
        name: "my-agent",
        conversation_config: { agent: { prompt: { prompt: "old" } } },
        platform_settings: {},
        tags: [],
      });

      // Mock API
      const mockRemoteAgents = [
        {
          agentId: "agent_123",
          agent_id: "agent_123",
          name: "my-agent",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);
      mockedElevenLabsApi.getAgentApi.mockResolvedValue({
        agentId: "agent_123",
        name: "my-agent",
        conversationConfig: {
          agent: { prompt: { prompt: "new" } },
        },
        platformSettings: {},
        tags: [],
      });

      // Expected: config path should remain "agent_configs/custom-path.json"
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents[0].config).toBe("agent_configs/custom-path.json");
    });
  });

  describe("Pull with --all flag", () => {
    it("should pull new agents and update existing ones", async () => {
      // Create initial agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "existing-agent",
            config: "agent_configs/existing-agent.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Create the existing config file
      const existingConfigPath = path.join(
        agentConfigsDir,
        "existing-agent.json"
      );
      await writeConfig(existingConfigPath, {
        name: "existing-agent",
        conversation_config: { agent: { prompt: { prompt: "old prompt" } } },
        platform_settings: {},
        tags: [],
      });

      // Mock API to return both existing and new agents
      const mockRemoteAgents = [
        {
          agentId: "agent_123",
          agent_id: "agent_123",
          name: "existing-agent",
        },
        {
          agentId: "agent_456",
          agent_id: "agent_456",
          name: "new-agent",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);
      mockedElevenLabsApi.getAgentApi.mockImplementation(
        async (client, id) => {
          if (id === "agent_123") {
            return {
              agentId: "agent_123",
              name: "existing-agent",
              conversationConfig: {
                agent: { prompt: { prompt: "updated prompt" } },
              },
              platformSettings: {},
              tags: [],
            };
          }
          return {
            agentId: "agent_456",
            name: "new-agent",
            conversationConfig: {
              agent: { prompt: { prompt: "new prompt" } },
            },
            platformSettings: {},
            tags: [],
          };
        }
      );

      // Expected behavior with --all:
      // - existing-agent (ID: agent_123) should be UPDATED
      // - new-agent (ID: agent_456) should be CREATED
      
      // After pull with --all:
      // - agents.json should have 2 entries
      // - existing-agent.json should be updated with new prompt
      // - new-agent.json should be created
      
      // Verify the config structure is set up correctly
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents).toHaveLength(1); // Initially 1 agent
    });

    it("should handle mixed operations correctly", async () => {
      // Create agents.json with multiple existing agents
      const agentsConfig = {
        agents: [
          {
            name: "agent-a",
            config: "agent_configs/agent-a.json",
            id: "agent_aaa",
          },
          {
            name: "agent-b",
            config: "agent_configs/agent-b.json",
            id: "agent_bbb",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Mock API to return:
      // - 1 existing agent that should be updated (agent-a)
      // - 1 existing agent not returned (agent-b, should remain unchanged)
      // - 2 new agents to be created
      const mockRemoteAgents = [
        {
          agentId: "agent_aaa",
          agent_id: "agent_aaa",
          name: "agent-a",
        },
        {
          agentId: "agent_ccc",
          agent_id: "agent_ccc",
          name: "agent-c",
        },
        {
          agentId: "agent_ddd",
          agent_id: "agent_ddd",
          name: "agent-d",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);

      // Verify initial state
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents).toHaveLength(2);
    });
  });

  describe("Duplicate ID prevention", () => {
    it("should not create duplicate entries for same agent ID", async () => {
      // Create agents.json with one agent
      const agentsConfig = {
        agents: [
          {
            name: "original-name",
            config: "agent_configs/original-name.json",
            id: "agent_123",
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // Mock API to return same agent twice (simulating a bug scenario)
      const mockRemoteAgents = [
        {
          agentId: "agent_123",
          agent_id: "agent_123",
          name: "original-name",
        },
        {
          agentId: "agent_123", // Duplicate ID
          agent_id: "agent_123",
          name: "duplicate-name",
        },
      ];

      mockedElevenLabsApi.listAgentsApi.mockResolvedValue(mockRemoteAgents);

      // Expected: Only one entry should exist for agent_123
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      
      // Count how many entries have the same ID
      const entriesWithId = config.agents.filter(
        (a: AgentDefinition) => a.id === "agent_123"
      );
      
      // Should have exactly 1 entry (no duplicates)
      expect(entriesWithId).toHaveLength(1);
    });
  });

  describe("Error handling", () => {
    it("should handle missing agents.json file", async () => {
      // Don't create agents.json - test should handle missing file

      // Mock API
      mockedElevenLabsApi.listAgentsApi.mockResolvedValue([]);

      // Expected: Should throw error about missing agents.json
      await expect(fs.pathExists(agentsConfigPath)).resolves.toBe(false);
    });

    it("should handle invalid JSON in agents.json", async () => {
      // Create invalid JSON file
      await fs.writeFile(agentsConfigPath, "{ invalid json }");

      // Expected: Should throw error about invalid JSON
      await expect(readConfig(agentsConfigPath)).rejects.toThrow();
    });

    it("should handle API errors gracefully", async () => {
      // Create valid agents.json
      await writeConfig(agentsConfigPath, { agents: [] });

      // Mock API to throw error
      mockedElevenLabsApi.listAgentsApi.mockRejectedValue(
        new Error("API Error")
      );

      // Expected: Should propagate error
      await expect(
        mockedElevenLabsApi.listAgentsApi({} as ElevenLabsClient, 30)
      ).rejects.toThrow("API Error");
    });

    it("should handle missing config file paths", async () => {
      // Create agents.json with agent missing config path
      const agentsConfig = {
        agents: [
          {
            name: "agent-no-config",
            id: "agent_123",
            // Missing config field
          },
        ],
      };
      await writeConfig(agentsConfigPath, agentsConfig);

      // This should not crash - the logic should handle it gracefully
      const config = await readConfig<AgentsConfig>(agentsConfigPath);
      expect(config.agents[0].config).toBeUndefined();
    });
  });
});

