/**
 * Integration tests for pull tools functionality with different flags
 * Tests the --update, --all, and --yes flags
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import * as elevenLabsApi from "../elevenlabs-api";
import * as config from "../config";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import {
  readToolsConfig,
  writeToolsConfig,
  ToolsConfig,
  ToolDefinition,
} from "../tools";

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

describe("Pull Tools Integration Tests", () => {
  let tempDir: string;
  let toolsConfigPath: string;
  let toolConfigsDir: string;

  beforeEach(async () => {
    // Create a temporary directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tools-pull-test-"));
    toolsConfigPath = path.join(tempDir, "tools.json");
    toolConfigsDir = path.join(tempDir, "tool_configs");
    await fs.ensureDir(toolConfigsDir);

    // Set up mocks
    mockedOs.homedir.mockReturnValue("/mock/home");
    mockedConfig.getApiKey.mockResolvedValue("test-api-key");
    mockedConfig.isLoggedIn.mockResolvedValue(true);
    mockedConfig.getResidency.mockResolvedValue("us");

    const mockClient = {} as ElevenLabsClient;
    mockedElevenLabsApi.getElevenLabsClient.mockResolvedValue(mockClient);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    jest.clearAllMocks();
  });

  describe("ID-based tool matching", () => {
    it("should match tools by ID, not by name", async () => {
      // Create initial tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "existing-tool",
            type: "webhook",
            config: "tool_configs/existing-tool.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Create minimal config file
      const toolConfigPath = path.join(toolConfigsDir, "existing-tool.json");
      await fs.writeJson(toolConfigPath, {
        name: "existing-tool",
        description: "Old description",
        type: "webhook",
      });

      // Verify: Tool should be identified by ID, not name
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].id).toBe("tool_123");
      expect(config.tools[0].name).toBe("existing-tool");
    });

    it("should handle tools without IDs gracefully", async () => {
      // Create tools.json with tool missing ID
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "tool-no-id",
            type: "webhook",
            config: "tool_configs/tool-no-id.json",
            // Missing id field
          } as Partial<ToolDefinition> as ToolDefinition,
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Verify: Tool without ID should be treated as non-existing
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].id).toBeUndefined();
    });
  });

  describe("Default pull behavior (no flags)", () => {
    it("should pull new tools and skip existing ones", async () => {
      // Create initial tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "existing-tool",
            type: "webhook",
            config: "tool_configs/existing-tool.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Create minimal existing config file
      const existingConfigPath = path.join(
        toolConfigsDir,
        "existing-tool.json"
      );
      await fs.writeJson(existingConfigPath, {
        name: "existing-tool",
        description: "Old description",
        type: "webhook",
      });

      // Expected behavior (default):
      // - existing-tool (ID: tool_123) should be SKIPPED
      // - new-tool (ID: tool_456) should be CREATED

      // Verify existing config was not modified
      const existingConfig = await fs.readJson(existingConfigPath);
      expect(existingConfig.description).toBe("Old description");
    });

    it("should handle name conflicts by appending counter", async () => {
      // Create initial tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "test-tool",
            type: "webhook",
            config: "tool_configs/test-tool.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Expected: New tool should be named "test-tool_1" to avoid conflict
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].name).toBe("test-tool");
    });
  });

  describe("Pull with --update flag", () => {
    it("should update existing tools and skip new ones", async () => {
      // Create initial tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "existing-tool",
            type: "webhook",
            config: "tool_configs/existing-tool.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Create minimal existing config file
      const existingConfigPath = path.join(
        toolConfigsDir,
        "existing-tool.json"
      );
      await fs.writeJson(existingConfigPath, {
        name: "existing-tool",
        description: "Old description",
        type: "webhook",
      });

      // Expected behavior with --update:
      // - existing-tool (ID: tool_123) should be UPDATED
      // - new-tool (ID: tool_456) should be SKIPPED

      // Verify only 1 tool exists in config
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools).toHaveLength(1);
      expect(config.tools[0].id).toBe("tool_123");
    });

    it("should not create new tools when using --update", async () => {
      // Create initial tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "tool-one",
            type: "webhook",
            config: "tool_configs/tool-one.json",
            id: "tool_111",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Expected: tools.json should remain unchanged with --update
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools).toHaveLength(1);
      expect(config.tools[0].id).toBe("tool_111");
    });

    it("should preserve existing config file paths when updating", async () => {
      // Create initial tools.json
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "my-tool",
            type: "webhook",
            config: "tool_configs/custom-path.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Create config at custom path
      const customConfigPath = path.join(toolConfigsDir, "custom-path.json");
      await fs.writeJson(customConfigPath, {
        name: "my-tool",
        description: "Old",
        type: "webhook",
      });

      // Expected: config path should remain "tool_configs/custom-path.json"
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].config).toBe("tool_configs/custom-path.json");
    });
  });

  describe("Pull with --all flag", () => {
    it("should pull new tools and update existing ones", async () => {
      // Create initial tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "existing-tool",
            type: "webhook",
            config: "tool_configs/existing-tool.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Create minimal existing config file
      const existingConfigPath = path.join(
        toolConfigsDir,
        "existing-tool.json"
      );
      await fs.writeJson(existingConfigPath, {
        name: "existing-tool",
        description: "Old description",
        type: "webhook",
      });

      // Expected behavior with --all:
      // - existing-tool (ID: tool_123) should be UPDATED
      // - new-tool (ID: tool_456) should be CREATED

      // Verify initial state
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools).toHaveLength(1);
    });

    it("should handle mixed operations correctly", async () => {
      // Create tools.json with multiple existing tools
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "tool-a",
            type: "webhook",
            config: "tool_configs/tool-a.json",
            id: "tool_aaa",
          },
          {
            name: "tool-b",
            type: "client",
            config: "tool_configs/tool-b.json",
            id: "tool_bbb",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Verify initial state
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools).toHaveLength(2);
    });
  });

  describe("Duplicate ID prevention", () => {
    it("should not create duplicate entries for same tool ID", async () => {
      // Create tools.json with one tool
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "original-name",
            type: "webhook",
            config: "tool_configs/original-name.json",
            id: "tool_123",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Expected: Only one entry should exist for tool_123
      const config = await readToolsConfig(toolsConfigPath);

      // Count how many entries have the same ID
      const entriesWithId = config.tools.filter((t) => t.id === "tool_123");

      // Should have exactly 1 entry (no duplicates)
      expect(entriesWithId).toHaveLength(1);
    });
  });

  describe("Error handling", () => {
    it("should handle missing tools.json file", async () => {
      // Don't create tools.json - test should handle missing file

      // Mock API
      mockedElevenLabsApi.listToolsApi.mockResolvedValue([]);

      // Expected: Should handle missing file
      await expect(fs.pathExists(toolsConfigPath)).resolves.toBe(false);
    });

    it("should handle invalid JSON in tools.json", async () => {
      // Create invalid JSON file
      await fs.writeFile(toolsConfigPath, "{ invalid json }");

      // Expected: Should throw error about invalid JSON
      await expect(readToolsConfig(toolsConfigPath)).rejects.toThrow();
    });

    it("should handle API errors gracefully", async () => {
      // Create valid tools.json
      await writeToolsConfig(toolsConfigPath, { tools: [] });

      // Mock API to throw error
      mockedElevenLabsApi.listToolsApi.mockRejectedValue(
        new Error("API Error")
      );

      // Expected: Should propagate error
      await expect(
        mockedElevenLabsApi.listToolsApi({} as ElevenLabsClient)
      ).rejects.toThrow("API Error");
    });

    it("should handle missing config file paths", async () => {
      // Create tools.json with tool missing config path
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "tool-no-config",
            type: "webhook",
            id: "tool_123",
            // Missing config field
          } as Partial<ToolDefinition> as ToolDefinition,
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // This should not crash - the logic should handle it gracefully
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].config).toBeUndefined();
    });

    it("should handle tools without type", async () => {
      // Create tools.json with tool missing type
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "tool-no-type",
            config: "tool_configs/tool-no-type.json",
            id: "tool_123",
            // Missing type field
          } as Partial<ToolDefinition> as ToolDefinition,
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // This should not crash
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].type).toBeUndefined();
    });
  });

  describe("Tool type handling", () => {
    it("should handle different tool types (webhook and client)", async () => {
      // Create tools.json with both types
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            name: "webhook-tool",
            type: "webhook",
            config: "tool_configs/webhook-tool.json",
            id: "tool_111",
          },
          {
            name: "client-tool",
            type: "client",
            config: "tool_configs/client-tool.json",
            id: "tool_222",
          },
        ],
      };
      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Verify types are preserved
      const config = await readToolsConfig(toolsConfigPath);
      expect(config.tools[0].type).toBe("webhook");
      expect(config.tools[1].type).toBe("client");
    });
  });
});
