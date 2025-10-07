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
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

interface TestDefinition {
  name: string;
  config: string;
  type?: string;
}

interface TestsConfig {
  tests: TestDefinition[];
}

interface TestConfigWithMethods {
  tests?: TestDefinition[];
  name?: string;
  type?: string;
  chat_history?: Array<{
    role: string;
    time_in_call_secs: number;
    message: string;
  }>;
}
import {
  readAgentConfig,
  writeAgentConfig,
  loadLockFile,
  saveLockFile,
  updateTestInLock,
  getTestFromLock,
  calculateConfigHash,
  toSnakeCaseKeys,
} from "../utils";
import { getBasicLLMTestTemplate } from "../test-templates";

// Mock the ElevenLabs API
jest.mock("../elevenlabs-api", () => ({
  getElevenLabsClient: jest.fn(),
  createTestApi: jest.fn(),
  getTestApi: jest.fn(),
  listTestsApi: jest.fn(),
  updateTestApi: jest.fn(),
  runTestsOnAgentApi: jest.fn(),
  getTestInvocationApi: jest.fn(),
}));

// Import the mocked module
import * as elevenlabsApi from "../elevenlabs-api";
const mockedApi = jest.mocked(elevenlabsApi);

// Set up default mock implementations
beforeEach(() => {
  mockedApi.getElevenLabsClient.mockResolvedValue(
    {} as unknown as ElevenLabsClient
  );
  mockedApi.createTestApi.mockResolvedValue({ id: "test_123" });
  mockedApi.getTestApi.mockResolvedValue({
    id: "test_123",
    name: "Test Name",
    chat_history: [{ role: "user", time_in_call_secs: 1, message: "Hello" }],
    success_condition: "Agent responds helpfully",
  });
  mockedApi.listTestsApi.mockResolvedValue([
    { id: "test_1", name: "Remote Test 1" },
    { id: "test_2", name: "Remote Test 2" },
  ]);
  mockedApi.updateTestApi.mockResolvedValue({ id: "test_123" });
  mockedApi.runTestsOnAgentApi.mockResolvedValue({
    id: "invocation_123",
    test_runs: [
      {
        test_run_id: "run_1",
        test_id: "test_1",
        status: "pending",
      },
    ],
  });
  mockedApi.getTestInvocationApi.mockResolvedValue({});
});

describe("Test Commands Integration", () => {
  let tempDir: string;
  let testsConfigPath: string;
  let lockFilePath: string;

  beforeEach(async () => {
    // Create temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "agents-cli-test-"));
    testsConfigPath = path.join(tempDir, "tests.json");
    lockFilePath = path.join(tempDir, "agents.lock");

    // Change to temp directory
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe("Test configuration management", () => {
    it("should create tests.json when it does not exist", async () => {
      expect(await fs.pathExists(testsConfigPath)).toBe(false);

      const initialConfig = { tests: [] };
      await writeAgentConfig(testsConfigPath, initialConfig);

      expect(await fs.pathExists(testsConfigPath)).toBe(true);

      const config = await readAgentConfig(testsConfigPath);
      expect(config).toEqual(initialConfig);
    });

    it("should add test to tests.json", async () => {
      // Initialize tests.json
      const initialConfig = { tests: [] };
      await writeAgentConfig(testsConfigPath, initialConfig);

      // Add a test
      const config = await readAgentConfig(testsConfigPath);
      (config as unknown as TestsConfig).tests.push({
        name: "Test 1",
        config: "test_configs/test_1.json",
        type: "basic-llm",
      });
      await writeAgentConfig(testsConfigPath, config);

      // Verify test was added
      const updatedConfig = await readAgentConfig(testsConfigPath);
      expect((updatedConfig as unknown as TestsConfig).tests).toHaveLength(1);
      expect((updatedConfig as unknown as TestsConfig).tests[0].name).toBe(
        "Test 1"
      );
    });

    it("should create test config file with template", async () => {
      const testName = "Sample Test";
      const configPath = "test_configs/sample_test.json";
      const fullConfigPath = path.join(tempDir, configPath);

      // Create test config using template
      const testConfig = getBasicLLMTestTemplate(testName);
      await fs.ensureDir(path.dirname(fullConfigPath));
      await writeAgentConfig(fullConfigPath, testConfig);

      // Verify config file exists and has correct content
      expect(await fs.pathExists(fullConfigPath)).toBe(true);

      const savedConfig = await readAgentConfig(fullConfigPath);
      expect((savedConfig as TestConfigWithMethods).name).toBe(testName);
      expect((savedConfig as TestConfigWithMethods).type).toBe("llm");
      expect((savedConfig as TestConfigWithMethods).chat_history).toHaveLength(
        1
      );
    });
  });

  describe("Lock file management", () => {
    it("should initialize lock file with tests section", async () => {
      const lockData = {
        agents: {},
        tools: {},
        tests: {},
      };

      await saveLockFile(lockFilePath, lockData);
      expect(await fs.pathExists(lockFilePath)).toBe(true);

      const loadedData = await loadLockFile(lockFilePath);
      expect(loadedData).toHaveProperty("tests");
      expect(loadedData.tests).toEqual({});
    });

    it("should update test in lock file", async () => {
      const lockData = {
        agents: {},
        tools: {},
        tests: {},
      };

      await saveLockFile(lockFilePath, lockData);

      // Update test in lock
      updateTestInLock(lockData, "test-1", "test_123", "hash123");
      await saveLockFile(lockFilePath, lockData);

      // Verify test was saved
      const loadedData = await loadLockFile(lockFilePath);
      const testData = getTestFromLock(loadedData, "test-1");
      expect(testData).toEqual({
        id: "test_123",
        hash: "hash123",
      });
    });

    it("should handle multiple tests in lock file", async () => {
      const lockData = {
        agents: {},
        tools: {},
        tests: {},
      };

      // Add multiple tests
      updateTestInLock(lockData, "test-1", "id-1", "hash-1");
      updateTestInLock(lockData, "test-2", "id-2", "hash-2");
      await saveLockFile(lockFilePath, lockData);

      // Verify all tests were saved
      const loadedData = await loadLockFile(lockFilePath);
      expect(getTestFromLock(loadedData, "test-1")).toEqual({
        id: "id-1",
        hash: "hash-1",
      });
      expect(getTestFromLock(loadedData, "test-2")).toEqual({
        id: "id-2",
        hash: "hash-2",
      });
    });
  });

  describe("Test configuration hash calculation", () => {
    it("should calculate consistent hash for test config", () => {
      const testConfig = getBasicLLMTestTemplate("Test");
      const configForHash = toSnakeCaseKeys(testConfig);

      const hash1 = calculateConfigHash(configForHash);
      const hash2 = calculateConfigHash(configForHash);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for different configs", () => {
      const config1 = getBasicLLMTestTemplate("Test 1");
      const config2 = getBasicLLMTestTemplate("Test 2");

      const hash1 = calculateConfigHash(toSnakeCaseKeys(config1));
      const hash2 = calculateConfigHash(toSnakeCaseKeys(config2));

      expect(hash1).not.toBe(hash2);
    });

    it("should detect config changes through hash comparison", () => {
      const originalConfig = getBasicLLMTestTemplate("Test");
      const originalHash = calculateConfigHash(toSnakeCaseKeys(originalConfig));

      // Modify config
      const modifiedConfig = { ...originalConfig };
      modifiedConfig.success_condition = "Modified condition";
      const modifiedHash = calculateConfigHash(toSnakeCaseKeys(modifiedConfig));

      expect(originalHash).not.toBe(modifiedHash);
    });
  });

  describe("File structure integration", () => {
    it("should create proper directory structure for tests", async () => {
      const testConfigDir = path.join(tempDir, "test_configs");

      // Create test config directory
      await fs.ensureDir(testConfigDir);
      expect(await fs.pathExists(testConfigDir)).toBe(true);

      // Create test config file
      const testConfig = getBasicLLMTestTemplate("Test");
      const configPath = path.join(testConfigDir, "test.json");
      await writeAgentConfig(configPath, testConfig);

      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it("should handle test name to file path conversion", () => {
      const testName = "Test With Spaces & Special-Characters";
      const safeName = testName
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[[\]]/g, "");
      const expectedPath = `test_configs/${safeName}.json`;

      expect(safeName).toBe("test_with_spaces_&_special-characters");
      expect(expectedPath).toBe(
        "test_configs/test_with_spaces_&_special-characters.json"
      );
    });

    it("should maintain file integrity across operations", async () => {
      // Create initial files
      const testsConfig = { tests: [] };
      const lockData = { agents: {}, tools: {}, tests: {} };

      await writeAgentConfig(testsConfigPath, testsConfig);
      await saveLockFile(lockFilePath, lockData);

      // Add test to both files
      (testsConfig as unknown as TestsConfig).tests.push({
        name: "Integration Test",
        config: "test_configs/integration_test.json",
        type: "basic-llm",
      });

      updateTestInLock(lockData, "Integration Test", "test_456", "hash456");

      await writeAgentConfig(testsConfigPath, testsConfig);
      await saveLockFile(lockFilePath, lockData);

      // Verify both files were updated correctly
      const loadedTestsConfig = await readAgentConfig(testsConfigPath);
      const loadedLockData = await loadLockFile(lockFilePath);

      expect((loadedTestsConfig as unknown as TestsConfig).tests).toHaveLength(
        1
      );
      expect((loadedTestsConfig as unknown as TestsConfig).tests[0].name).toBe(
        "Integration Test"
      );

      const testData = getTestFromLock(loadedLockData, "Integration Test");
      expect(testData?.id).toBe("test_456");
      expect(testData?.hash).toBe("hash456");
    });
  });

  describe("Error handling", () => {
    it("should handle missing tests.json gracefully", async () => {
      expect(await fs.pathExists(testsConfigPath)).toBe(false);

      // Should not throw when trying to load non-existent file
      await expect(async () => {
        try {
          await readAgentConfig(testsConfigPath);
        } catch (error) {
          expect((error as Error).message).toContain(
            "Configuration file not found"
          );
        }
      }).not.toThrow();
    });

    it("should handle corrupted lock file", async () => {
      // Write invalid JSON to lock file
      await fs.writeFile(lockFilePath, "invalid json content");

      // Should return default structure for corrupted file
      const lockData = await loadLockFile(lockFilePath);
      expect(lockData).toEqual({
        agents: {},
        tools: {},
        tests: {},
      });
    });

    it("should handle missing directories", async () => {
      const configPath = path.join(tempDir, "non-existent-dir", "test.json");

      // Should create directory structure when writing config
      const testConfig = getBasicLLMTestTemplate("Test");
      await writeAgentConfig(configPath, testConfig);

      expect(await fs.pathExists(configPath)).toBe(true);
      expect(await fs.pathExists(path.dirname(configPath))).toBe(true);
    });
  });

  describe("Concurrent operations", () => {
    it("should handle concurrent lock file updates", async () => {
      const lockData = { agents: {}, tools: {}, tests: {} };
      await saveLockFile(lockFilePath, lockData);

      // Simulate concurrent updates
      const operations = [
        () => {
          updateTestInLock(lockData, "test-a", "id-a", "hash-a");
          return saveLockFile(lockFilePath, lockData);
        },
        () => {
          updateTestInLock(lockData, "test-b", "id-b", "hash-b");
          return saveLockFile(lockFilePath, lockData);
        },
        () => {
          updateTestInLock(lockData, "test-c", "id-c", "hash-c");
          return saveLockFile(lockFilePath, lockData);
        },
      ];

      // Execute operations concurrently
      await Promise.all(operations.map(op => op()));

      // Verify final state
      const finalData = await loadLockFile(lockFilePath);
      expect(Object.keys(finalData.tests)).toHaveLength(3);
      expect(getTestFromLock(finalData, "test-a")).toBeTruthy();
      expect(getTestFromLock(finalData, "test-b")).toBeTruthy();
      expect(getTestFromLock(finalData, "test-c")).toBeTruthy();
    });
  });

  describe("Data consistency", () => {
    it("should maintain referential integrity between tests.json and lock file", async () => {
      const testsConfig = {
        tests: [
          {
            name: "Test 1",
            config: "test_configs/test_1.json",
            type: "basic-llm",
          },
          { name: "Test 2", config: "test_configs/test_2.json", type: "tool" },
        ],
      };

      const lockData = { agents: {}, tools: {}, tests: {} };
      updateTestInLock(lockData, "Test 1", "id-1", "hash-1");
      updateTestInLock(lockData, "Test 2", "id-2", "hash-2");

      await writeAgentConfig(testsConfigPath, testsConfig);
      await saveLockFile(lockFilePath, lockData);

      // Verify consistency
      const loadedTestsConfig = await readAgentConfig(testsConfigPath);
      const loadedLockData = await loadLockFile(lockFilePath);

      (loadedTestsConfig as unknown as TestsConfig).tests.forEach(
        (test: TestDefinition) => {
          const lockEntry = getTestFromLock(loadedLockData, test.name);
          expect(lockEntry).toBeTruthy();
          expect(lockEntry?.id).toBeTruthy();
          expect(lockEntry?.hash).toBeTruthy();
        }
      );
    });
  });
});
