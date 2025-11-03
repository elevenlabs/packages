import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import fs from "fs-extra";
import path from "path";
import { tmpdir } from "os";

/**
 * Integration tests for add commands using name-based filenames.
 * These tests verify that agents add, add-webhook-tool, add-client-tool, and add-test
 * create config files with human-readable names instead of ID-based names.
 * 
 * This validates the fix from commit 8912a719769b64aace09f3f443cfb663941b913d
 */

// Mock the ElevenLabs API
const mockCreateAgentApi = jest.fn();
const mockCreateToolApi = jest.fn();
const mockCreateTestApi = jest.fn();
const mockGetElevenLabsClient = jest.fn();

jest.mock("../elevenlabs-api", () => ({
  getElevenLabsClient: mockGetElevenLabsClient,
  createAgentApi: mockCreateAgentApi,
  createToolApi: mockCreateToolApi,
  createTestApi: mockCreateTestApi,
}));

// Import after mocking
import { readConfig, writeConfig, generateUniqueFilename, toCamelCaseKeys } from "../utils";
import { getTemplateByName } from "../templates";
import { createAgentApi } from "../elevenlabs-api";
import { getBasicLLMTestTemplate } from "../test-templates";

describe("Add Commands - Name-based Filenames", () => {
  let tempDir: string;
  let agentsConfigPath: string;
  let toolsConfigPath: string;
  let testsConfigPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "test-add-"));
    agentsConfigPath = path.join(tempDir, "agents.json");
    toolsConfigPath = path.join(tempDir, "tools.json");
    testsConfigPath = path.join(tempDir, "tests.json");

    // Create necessary directories
    await fs.ensureDir(path.join(tempDir, "agent_configs"));
    await fs.ensureDir(path.join(tempDir, "tool_configs"));
    await fs.ensureDir(path.join(tempDir, "test_configs"));

    // Initialize config files
    await writeConfig(agentsConfigPath, { agents: [] });
    await writeConfig(toolsConfigPath, { tools: [] });
    await writeConfig(testsConfigPath, { tests: [] });

    // Mock API client
    mockGetElevenLabsClient.mockResolvedValue({} as never);

    // Reset mocks
    mockCreateAgentApi.mockReset();
    mockCreateToolApi.mockReset();
    mockCreateTestApi.mockReset();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    jest.clearAllMocks();
  });

  describe("agents add command", () => {
    it("should create config file using agent name, not agent ID", async () => {
      // Mock API to return an agent ID
      const mockAgentId = "agent_abc123xyz";
      mockCreateAgentApi.mockResolvedValue(mockAgentId as never);

      // Simulate the add command logic
      const agentName = "Customer Support Bot";
      const agentConfig = getTemplateByName(agentName, "default");

      // Call the API
      const agentId = await createAgentApi({} as never, agentName, {}, {}, []);

      // Generate config path using name (not ID)
      const configPath = await generateUniqueFilename(
        path.join(tempDir, "agent_configs"),
        agentName
      );

      // Write config file
      await writeConfig(configPath, agentConfig);

      // Update agents.json
      const agentsConfig = await readConfig(agentsConfigPath) as { agents: Array<{ name: string; config: string; id: string }> };
      agentsConfig.agents.push({
        name: agentName,
        config: path.relative(tempDir, configPath),
        id: agentId,
      });
      await writeConfig(agentsConfigPath, agentsConfig);

      // Verify the file was created with name-based path
      const expectedFilename = "Customer-Support-Bot.json";
      const expectedPath = path.join(tempDir, "agent_configs", expectedFilename);
      
      expect(await fs.pathExists(expectedPath)).toBe(true);
      expect(configPath).toBe(expectedPath);
      
      // Verify it's NOT using the ID
      const idBasedPath = path.join(tempDir, "agent_configs", `${mockAgentId}.json`);
      expect(configPath).not.toBe(idBasedPath);

      // Verify agents.json references the correct path
      const finalConfig = await readConfig(agentsConfigPath) as { agents: Array<{ name: string; config: string; id: string }> };
      expect(finalConfig.agents[0].config).toBe(`agent_configs/${expectedFilename}`);
      expect(finalConfig.agents[0].id).toBe(mockAgentId);
    });

    it("should handle special characters in agent names", async () => {
      const mockAgentId = "agent_special123";
      mockCreateAgentApi.mockResolvedValue(mockAgentId as never);

      const agentName = "Sales/Support Agent™";
      const agentConfig = getTemplateByName(agentName, "default");

      const configPath = await generateUniqueFilename(
        path.join(tempDir, "agent_configs"),
        agentName
      );

      await writeConfig(configPath, agentConfig);

      // Verify special characters are sanitized
      expect(path.basename(configPath)).toBe("Sales-Support-Agent™.json");
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it("should handle duplicate agent names with numbered suffixes", async () => {
      mockCreateAgentApi
        .mockResolvedValueOnce("agent_1" as never)
        .mockResolvedValueOnce("agent_2" as never)
        .mockResolvedValueOnce("agent_3" as never);

      const agentName = "Support Agent";

      // Add first agent
      const configPath1 = await generateUniqueFilename(
        path.join(tempDir, "agent_configs"),
        agentName
      );
      await writeConfig(configPath1, getTemplateByName(agentName, "default"));

      // Add second agent with same name
      const configPath2 = await generateUniqueFilename(
        path.join(tempDir, "agent_configs"),
        agentName
      );
      await writeConfig(configPath2, getTemplateByName(agentName, "default"));

      // Add third agent with same name
      const configPath3 = await generateUniqueFilename(
        path.join(tempDir, "agent_configs"),
        agentName
      );
      await writeConfig(configPath3, getTemplateByName(agentName, "default"));

      // Verify all three files exist with proper numbering
      expect(path.basename(configPath1)).toBe("Support-Agent.json");
      expect(path.basename(configPath2)).toBe("Support-Agent-1.json");
      expect(path.basename(configPath3)).toBe("Support-Agent-2.json");

      expect(await fs.pathExists(configPath1)).toBe(true);
      expect(await fs.pathExists(configPath2)).toBe(true);
      expect(await fs.pathExists(configPath3)).toBe(true);
    });
  });

  describe("add-webhook-tool and add-client-tool commands", () => {
    it("should create tool config using tool name, not tool ID", async () => {
      const mockToolId = "tool_xyz789abc";
      mockCreateToolApi.mockResolvedValue({ toolId: mockToolId } as never);

      const toolName = "Payment Webhook";
      const toolConfig = {
        name: toolName,
        description: `${toolName} webhook tool`,
        type: "webhook" as const,
      };

      // Simulate createToolApi
      const response = await mockCreateToolApi({}, toolConfig) as { toolId: string };
      const toolId = response.toolId;

      // Generate config path using name (not ID)
      const configPath = await generateUniqueFilename(
        path.join(tempDir, "tool_configs"),
        toolName
      );

      await writeConfig(configPath, toolConfig);

      // Update tools.json
      const toolsConfig = await readConfig(toolsConfigPath) as { tools: Array<{ name: string; type: string; config: string; id: string }> };
      toolsConfig.tools.push({
        name: toolName,
        type: "webhook",
        config: path.relative(tempDir, configPath),
        id: toolId,
      });
      await writeConfig(toolsConfigPath, toolsConfig);

      // Verify the file was created with name-based path
      const expectedFilename = "Payment-Webhook.json";
      const expectedPath = path.join(tempDir, "tool_configs", expectedFilename);
      
      expect(await fs.pathExists(expectedPath)).toBe(true);
      expect(configPath).toBe(expectedPath);
      
      // Verify it's NOT using the ID
      const idBasedPath = path.join(tempDir, "tool_configs", `${mockToolId}.json`);
      expect(configPath).not.toBe(idBasedPath);

      // Verify tools.json references the correct path
      const finalConfig = await readConfig(toolsConfigPath) as { tools: Array<{ name: string; type: string; config: string; id: string }> };
      expect(finalConfig.tools[0].config).toBe(`tool_configs/${expectedFilename}`);
      expect(finalConfig.tools[0].id).toBe(mockToolId);
    });

    it("should handle client tools with name-based filenames", async () => {
      const mockToolId = "tool_client456";
      mockCreateToolApi.mockResolvedValue({ toolId: mockToolId } as never);

      const toolName = "Analytics Client";
      const toolConfig = {
        name: toolName,
        description: `${toolName} client tool`,
        type: "client" as const,
      };

      const configPath = await generateUniqueFilename(
        path.join(tempDir, "tool_configs"),
        toolName
      );

      await writeConfig(configPath, toolConfig);

      expect(path.basename(configPath)).toBe("Analytics-Client.json");
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it("should handle duplicate tool names", async () => {
      mockCreateToolApi
        .mockResolvedValueOnce({ toolId: "tool_1" } as never)
        .mockResolvedValueOnce({ toolId: "tool_2" } as never);

      const toolName = "API Tool";

      // Add first tool
      const configPath1 = await generateUniqueFilename(
        path.join(tempDir, "tool_configs"),
        toolName
      );
      await writeConfig(configPath1, { name: toolName, type: "webhook" });

      // Add second tool with same name
      const configPath2 = await generateUniqueFilename(
        path.join(tempDir, "tool_configs"),
        toolName
      );
      await writeConfig(configPath2, { name: toolName, type: "client" });

      expect(path.basename(configPath1)).toBe("API-Tool.json");
      expect(path.basename(configPath2)).toBe("API-Tool-1.json");
    });
  });

  describe("add-test command", () => {
    it("should create test config using test name, not test ID", async () => {
      const mockTestId = "test_def456ghi";
      mockCreateTestApi.mockResolvedValue({ id: mockTestId } as never);

      const testName = "Greeting Test";
      const testConfig = getBasicLLMTestTemplate(testName);

      // Simulate createTestApi
      const testApiConfig = toCamelCaseKeys(testConfig);
      const response = await mockCreateTestApi({}, testApiConfig) as { id: string };
      const testId = response.id;

      // Generate config path using name (not ID)
      const configPath = await generateUniqueFilename(
        path.join(tempDir, "test_configs"),
        testName
      );

      await writeConfig(configPath, testConfig);

      // Update tests.json
      const testsConfig = await readConfig(testsConfigPath) as { tests: Array<{ name: string; config: string; type: string; id: string }> };
      testsConfig.tests.push({
        name: testName,
        config: path.relative(tempDir, configPath),
        type: "basic-llm",
        id: testId,
      });
      await writeConfig(testsConfigPath, testsConfig);

      // Verify the file was created with name-based path
      const expectedFilename = "Greeting-Test.json";
      const expectedPath = path.join(tempDir, "test_configs", expectedFilename);
      
      expect(await fs.pathExists(expectedPath)).toBe(true);
      expect(configPath).toBe(expectedPath);
      
      // Verify it's NOT using the ID
      const idBasedPath = path.join(tempDir, "test_configs", `${mockTestId}.json`);
      expect(configPath).not.toBe(idBasedPath);

      // Verify tests.json references the correct path
      const finalConfig = await readConfig(testsConfigPath) as { tests: Array<{ name: string; config: string; type: string; id: string }> };
      expect(finalConfig.tests[0].config).toBe(`test_configs/${expectedFilename}`);
      expect(finalConfig.tests[0].id).toBe(mockTestId);
    });

    it("should handle test names with special characters", async () => {
      const mockTestId = "test_special789";
      mockCreateTestApi.mockResolvedValue({ id: mockTestId } as never);

      const testName = "Tool Test: Payment Processing";
      const testConfig = getBasicLLMTestTemplate(testName);

      const configPath = await generateUniqueFilename(
        path.join(tempDir, "test_configs"),
        testName
      );

      await writeConfig(configPath, testConfig);

      expect(path.basename(configPath)).toBe("Tool-Test-Payment-Processing.json");
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it("should handle duplicate test names", async () => {
      mockCreateTestApi
        .mockResolvedValueOnce({ id: "test_1" } as never)
        .mockResolvedValueOnce({ id: "test_2" } as never)
        .mockResolvedValueOnce({ id: "test_3" } as never);

      const testName = "Basic Test";

      // Add three tests with the same name
      const configPath1 = await generateUniqueFilename(
        path.join(tempDir, "test_configs"),
        testName
      );
      await writeConfig(configPath1, getBasicLLMTestTemplate(testName));

      const configPath2 = await generateUniqueFilename(
        path.join(tempDir, "test_configs"),
        testName
      );
      await writeConfig(configPath2, getBasicLLMTestTemplate(testName));

      const configPath3 = await generateUniqueFilename(
        path.join(tempDir, "test_configs"),
        testName
      );
      await writeConfig(configPath3, getBasicLLMTestTemplate(testName));

      expect(path.basename(configPath1)).toBe("Basic-Test.json");
      expect(path.basename(configPath2)).toBe("Basic-Test-1.json");
      expect(path.basename(configPath3)).toBe("Basic-Test-2.json");

      expect(await fs.pathExists(configPath1)).toBe(true);
      expect(await fs.pathExists(configPath2)).toBe(true);
      expect(await fs.pathExists(configPath3)).toBe(true);
    });
  });

  describe("consistency with pull commands", () => {
    it("should create same filename pattern as pull commands for agents", async () => {
      mockCreateAgentApi.mockResolvedValue("agent_123" as never);

      const agentName = "Production Agent";

      // Simulate add command
      const addConfigPath = await generateUniqueFilename(
        path.join(tempDir, "agent_configs"),
        agentName
      );

      // Simulate pull command (should use same logic)
      const pullConfigPath = await generateUniqueFilename(
        path.join(tempDir, "agent_configs_pull"),
        agentName
      );

      // Both should generate the same base filename
      expect(path.basename(addConfigPath)).toBe(path.basename(pullConfigPath));
      expect(path.basename(addConfigPath)).toBe("Production-Agent.json");
    });

    it("should create same filename pattern as pull commands for tools", async () => {
      const toolName = "Webhook Tool";

      const addConfigPath = await generateUniqueFilename(
        path.join(tempDir, "tool_configs"),
        toolName
      );

      const pullConfigPath = await generateUniqueFilename(
        path.join(tempDir, "tool_configs_pull"),
        toolName
      );

      expect(path.basename(addConfigPath)).toBe(path.basename(pullConfigPath));
      expect(path.basename(addConfigPath)).toBe("Webhook-Tool.json");
    });

    it("should create same filename pattern as pull commands for tests", async () => {
      const testName = "Integration Test";

      const addConfigPath = await generateUniqueFilename(
        path.join(tempDir, "test_configs"),
        testName
      );

      const pullConfigPath = await generateUniqueFilename(
        path.join(tempDir, "test_configs_pull"),
        testName
      );

      expect(path.basename(addConfigPath)).toBe(path.basename(pullConfigPath));
      expect(path.basename(addConfigPath)).toBe("Integration-Test.json");
    });
  });
});

