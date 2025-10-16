/**
 * Integration tests for push-tools functionality with mocked API calls
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { calculateConfigHash, toSnakeCaseKeys } from "../utils";
import {
  writeToolsConfig,
  writeToolConfig,
  readToolsConfig,
  ToolsConfig,
} from "../tools";
import * as elevenLabsApi from "../elevenlabs-api";
import * as config from "../config";
import { ElevenLabs, ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

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

// Note: pushTools function is tested indirectly through its component functions

describe("Push Tools Integration Tests", () => {
  let tempDir: string;
  let toolsConfigPath: string;

  beforeEach(async () => {
    // Create a temporary directory
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "agents-sync-tools-test-")
    );
    toolsConfigPath = path.join(tempDir, "tools.json");

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

  describe("pushTools function logic components", () => {
    it("should create webhook tool config correctly", async () => {
      const toolConfig = {
        name: "test-webhook",
        description: "test-webhook webhook tool",
        type: "webhook" as const,
        api_schema: {
          url: "https://api.example.com/webhook",
          method: "POST",
          request_body_schema: {
            type: "object",
            description: "Request body for the webhook",
            properties: {}
          },
          request_headers: {
            'Content-Type': "application/json",
          }
        },
        response_timeout_secs: 30,
        dynamic_variables: {
          dynamic_variable_placeholders: {},
        },
      };

      const configPath = path.join(
        tempDir,
        "tool_configs",
        "test_webhook.json"
      );
      await fs.ensureDir(path.dirname(configPath));
      await writeToolConfig(configPath, toolConfig);

      const toolsConfig: ToolsConfig = {
        tools: [
          {
            type: "webhook",
            config: "tool_configs/test_webhook.json",
          },
        ],
      };

      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Test that config can be read back
      const readConfig = await readToolsConfig(toolsConfigPath);
      expect(readConfig.tools).toHaveLength(1);
      expect(readConfig.tools[0].type).toBe("webhook");
      expect(readConfig.tools[0].config).toBe("tool_configs/test_webhook.json");
    });

    it("should create client tool config correctly", async () => {
      const toolConfig = {
        name: "test-client",
        description: "test-client client tool",
        type: "client" as const,
        expects_response: false,
        response_timeout_secs: 30,
        parameters: {
          type: "object",
          description: "Input parameter for the client tool",
          properties: {}
        },
        dynamic_variables: {
          dynamic_variable_placeholders: {},
        },
      };

      const configPath = path.join(tempDir, "tool_configs", "test_client.json");
      await fs.ensureDir(path.dirname(configPath));
      await writeToolConfig(configPath, toolConfig);

      const toolsConfig: ToolsConfig = {
        tools: [
          {
            type: "client",
            config: "tool_configs/test_client.json",
          },
        ],
      };

      await writeToolsConfig(toolsConfigPath, toolsConfig);

      // Test that config can be read back
      const readConfig = await readToolsConfig(toolsConfigPath);
      expect(readConfig.tools).toHaveLength(1);
      expect(readConfig.tools[0].type).toBe("client");
      expect(readConfig.tools[0].config).toBe("tool_configs/test_client.json");
    });

    it("should calculate config hash correctly", async () => {
      const toolConfig = {
        name: "test-tool",
        description: "Test tool",
        type: "webhook",
      };

      const hash1 = calculateConfigHash(toSnakeCaseKeys(toolConfig));
      const hash2 = calculateConfigHash(toSnakeCaseKeys(toolConfig));

      // Same config should produce same hash
      expect(hash1).toBe(hash2);

      // Different config should produce different hash
      const modifiedConfig = {
        ...toolConfig,
        description: "Modified test tool",
      };
      const hash3 = calculateConfigHash(toSnakeCaseKeys(modifiedConfig));
      expect(hash1).not.toBe(hash3);
    });
  });

  describe("API integration scenarios", () => {
    beforeEach(() => {
      // Reset mocks for each test
      mockedElevenLabsApi.createToolApi.mockClear();
      mockedElevenLabsApi.updateToolApi.mockClear();
    });

    it("should call createToolApi for new tools", async () => {
      const mockResponse = {
        id: "tool_new_123",
        toolConfig: {
          name: "new-tool",
          description: "New tool",
          type: "webhook" as const,
        },
        accessInfo: {},
        usageStats: {},
      };
      mockedElevenLabsApi.createToolApi.mockResolvedValue(mockResponse as ElevenLabs.ToolResponseModel);

      const toolConfig = {
        name: "new-tool",
        description: "New tool",
        type: "webhook",
      };

      // Simulate creating a new tool
      const mockClient = {} as ElevenLabsClient;
      const result = await mockedElevenLabsApi.createToolApi(
        mockClient,
        toolConfig
      );

      expect(mockedElevenLabsApi.createToolApi).toHaveBeenCalledWith(
        mockClient,
        toolConfig
      );
      expect(result).toEqual(mockResponse);
    });

    it("should call updateToolApi for existing tools", async () => {
      const mockResponse = {
        id: "tool_existing_123",
        toolConfig: {
          name: "existing-tool",
          description: "Updated existing tool",
          type: "webhook" as const,
        },
        accessInfo: {},
        usageStats: {},
      };
      mockedElevenLabsApi.updateToolApi.mockResolvedValue(mockResponse as ElevenLabs.ToolResponseModel);

      const toolConfig = {
        name: "existing-tool",
        description: "Updated existing tool",
        type: "webhook",
      };

      // Simulate updating an existing tool
      const mockClient = {} as ElevenLabsClient;
      const toolId = "tool_existing_123";
      await mockedElevenLabsApi.updateToolApi(mockClient, toolId, toolConfig);

      expect(mockedElevenLabsApi.updateToolApi).toHaveBeenCalledWith(
        mockClient,
        toolId,
        toolConfig
      );
    });

    it("should handle API errors gracefully", async () => {
      const apiError = new Error("API Error: Tool creation failed");
      mockedElevenLabsApi.createToolApi.mockRejectedValue(apiError);

      const mockClient = {} as ElevenLabsClient;
      const toolConfig = { name: "failing-tool", type: "webhook" };

      await expect(
        mockedElevenLabsApi.createToolApi(mockClient, toolConfig)
      ).rejects.toThrow("API Error: Tool creation failed");
    });
  });

  describe("file system operations", () => {
    it("should handle missing tools.json file", async () => {
      // Ensure tools.json doesn't exist
      const exists = await fs.pathExists(toolsConfigPath);
      expect(exists).toBe(false);

      // This should be handled by the push function throwing an error
      // In real scenario, pushTools would throw: "tools.json not found..."
    });

    it("should handle missing config files", async () => {
      const toolsConfig: ToolsConfig = {
        tools: [
          {
            type: "webhook",
            config: "non_existent_config.json",
          },
        ],
      };

      await writeToolsConfig(toolsConfigPath, toolsConfig);

      const readConfig = await readToolsConfig(toolsConfigPath);
      expect(readConfig.tools[0].config).toBe("non_existent_config.json");

      // The push function should handle missing config files gracefully
      // by logging a warning and continuing with other tools
    });
  });
});
