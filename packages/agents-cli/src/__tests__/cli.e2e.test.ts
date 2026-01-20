/**
 * End-to-end tests for CLI functionality
 * 
 * CRITICAL SAFETY WARNING
 * 
 * These tests require an ELEVENLABS_API_KEY environment variable.
 * 
 * YOU MUST USE A DEDICATED, EMPTY TEST ACCOUNT!
 * 
 * These tests will:
 * - Create test agents
 * - Modify agent configurations
 * - DELETE agents during cleanup
 * 
 * DO NOT use your production account or any account with deployed agents!
 * Any existing agents in the workspace could be PERMANENTLY LOST.
 * 
 * Setup:
 * 1. Create a new AmberNexus account (separate from production)
 * 2. Verify the account is empty
 * 3. Copy .env.example to .env
 * 4. Add the test account API key to .env
 * 5. Run: npm run test:e2e
 */

import { spawn } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import dotenv from "dotenv";

// Load .env file at module level (before Jest environment runs)
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Type definitions for test configurations
interface AgentConfigEntry {
  id?: string;
  name?: string;
  config: string;
  env?: string;
}

interface TestConfigEntry {
  id?: string;
  config: string;
}

interface ToolConfigEntry {
  id?: string;
  config: string;
}

// Check if API key is available for real E2E tests
const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
const describeIfApiKey = hasApiKey ? describe : describe.skip;

describe("CLI End-to-End Tests", () => {
  jest.setTimeout(30000); // Increase timeout to 30 seconds for e2e tests
  let tempDir: string;
  let cliPath: string;

  beforeAll(async () => {
    // Build the CLI first
    cliPath = path.join(__dirname, "../../dist/cli.js");

    // Ensure the CLI is built
    const cliExists = await fs.pathExists(cliPath);
    if (!cliExists) {
      throw new Error("CLI not built. Run `npm run build` first.");
    }
    
    // Log test mode and safety warnings
    if (!hasApiKey) {
      console.log('ELEVENLABS_API_KEY not found - skipping API-dependent tests');
      console.log('   To run full e2e tests: copy .env.example to .env and add your test API key');
    } else {
      console.log('Running full e2e tests with API key');
      console.log('');
      console.log('SAFETY REMINDER: Ensure you are using a DEDICATED TEST ACCOUNT');
      console.log('   These tests will create, modify, and DELETE agents.');
      console.log('   DO NOT use an account with existing deployed agents!');
      console.log('');
    }
  });

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-"));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  const runCli = (
    args: string[],
    options: { cwd?: string; input?: string; includeApiKey?: boolean } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve, reject) => {
      // Clean environment for testing
      const cleanEnv = { ...process.env };
      
      // Only delete API key if not explicitly requested to include it
      if (!options.includeApiKey) {
        delete cleanEnv.ELEVENLABS_API_KEY;
      }

      const child = spawn("node", [cliPath, ...args], {
        cwd: options.cwd || tempDir,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...cleanEnv,
          HOME: tempDir, // Use temp dir as HOME to avoid accessing real keychain/files
          USERPROFILE: tempDir, // Windows equivalent
        },
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      // Set a timeout of 15 seconds per command (UI commands may take longer)
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        reject(new Error(`CLI command timed out: ${args.join(" ")}`));
      }, 15000);

      child.stdout.on("data", data => {
        stdout += data.toString();
      });

      child.stderr.on("data", data => {
        stderr += data.toString();
      });

      child.on("close", code => {
        clearTimeout(timeout);
        if (!timedOut) {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
          });
        }
      });

      child.on("error", err => {
        clearTimeout(timeout);
        reject(err);
      });

      // Send input if provided
      if (options.input) {
        child.stdin.write(options.input);
        child.stdin.end();
      }
    });
  };

  describe("[local] help and version", () => {
    it("should show help", async () => {
      const result = await runCli(["--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("AmberNexus Agents Manager CLI");
      expect(result.stdout).toContain("Usage:");
    });

    it("should show version", async () => {
      const result = await runCli(["--version"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe("[local] init command", () => {
    it("should initialize a new project", async () => {
      const result = await runCli(["init"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Initializing project");
      expect(result.stdout).toContain("Project initialized successfully!");

      // Check that files were created
      const agentsJsonExists = await fs.pathExists(
        path.join(tempDir, "agents.json")
      );
      const envExampleExists = await fs.pathExists(
        path.join(tempDir, ".env.example")
      );

      expect(agentsJsonExists).toBe(true);
      expect(envExampleExists).toBe(true);

      // Check directory structure
      const agentConfigsDirExists = await fs.pathExists(
        path.join(tempDir, "agent_configs")
      );
      const toolConfigsDirExists = await fs.pathExists(
        path.join(tempDir, "tool_configs")
      );
      const testConfigsDirExists = await fs.pathExists(
        path.join(tempDir, "test_configs")
      );

      expect(agentConfigsDirExists).toBe(true);
      expect(toolConfigsDirExists).toBe(true);
      expect(testConfigsDirExists).toBe(true);
    });

    it("should not overwrite existing files", async () => {
      // Create project first
      await runCli(["init"]);

      // Modify agents.json
      const agentsJsonPath = path.join(tempDir, "agents.json");
      await fs.writeFile(agentsJsonPath, '{"agents": [{"name": "test"}]}');

      // Init again
      const result = await runCli(["init"]);

      expect(result.exitCode).toBe(0);

      // Check that file was not overwritten
      const content = await fs.readFile(agentsJsonPath, "utf-8");
      expect(content).toContain("test");
    });
  });

  describe("[local] templates command", () => {
    it("should list available templates", async () => {
      const result = await runCli(["templates", "list"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Available Agent Templates:");
      expect(result.stdout).toContain("default");
      expect(result.stdout).toContain("minimal");
      expect(result.stdout).toContain("customer-service");
    });

    it("should show template details", async () => {
      const result = await runCli(["templates", "show", "default"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Template: default");
      expect(result.stdout).toContain("example_agent");
    });

    it("should show error for invalid template", async () => {
      const result = await runCli(["templates", "show", "invalid"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Unknown template type");
    });
  });

  describe("[local] whoami command", () => {
    it("should show not logged in when no API key", async () => {
      const result = await runCli(["whoami"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Not logged in");
    });
  });

  describe("[local] project workflow", () => {
    it("should handle basic project workflow without API key", async () => {
      // Initialize project
      let result = await runCli(["init"]);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("[local] error handling", () => {
    it("should handle missing command gracefully", async () => {
      const result = await runCli(["nonexistent-command"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("unknown command");
    });

    it("should handle invalid arguments", async () => {
      const result = await runCli(["add"]); // missing required argument

      expect(result.exitCode).toBe(1);
      // Check both stdout and stderr for the usage message
      const output = result.stdout + result.stderr;
      expect(output).toContain("Usage: agents add");
    });
  });

  describe("[local] configuration handling", () => {
    it("should handle agents.json operations", async () => {
      // Initialize project
      await runCli(["init"]);

      // Check that agents.json was created with correct structure
      const agentsJsonPath = path.join(tempDir, "agents.json");
      const content = await fs.readFile(agentsJsonPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed).toEqual({ agents: [] });
    });
  });

  describe("[local] push-tools command", () => {
    beforeEach(async () => {
      // Initialize project for each test
      await runCli(["init"]);
    });

    it("should show help for push-tools command", async () => {
      const result = await runCli(["push-tools", "--help", "--no-ui"]);

      // Command should be recognized, even if help doesn't work perfectly
      // The important thing is it's not "unknown command"
      expect(result.stderr).not.toContain("unknown command");
    });

    it("should recognize push-tools command with dry-run option", async () => {
      const result = await runCli(["push-tools", "--dry-run"]);

      // Should succeed in dry-run mode with valid tools.json (created by init)
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain("unknown command");
      expect(result.stderr).not.toContain("unknown option");
      // Should show dry-run mode output
      expect(result.stdout.toLowerCase()).toContain("tool(s) pushed");
    });

    it("should handle missing tools.json file", async () => {
      // Remove tools.json to test missing file scenario
      const toolsJsonPath = path.join(tempDir, "tools.json");
      await fs.remove(toolsJsonPath);

      const result = await runCli(["push-tools"]);

      expect(result.exitCode).toBe(1);
      // Should get tools.json not found error
      expect(result.stderr).toContain("tools.json not found");
    });

    it("should handle specific tool name option", async () => {
      const result = await runCli(["push-tools", "--tool", "test-tool"]);

      expect(result.exitCode).toBe(1);
      // --tool option should be parsed correctly (no unknown option error)
      expect(result.stderr).not.toContain("unknown option");
      // Should get tool not found error since test-tool doesn't exist in empty tools.json
      expect(result.stderr).toContain("not found in configuration");
    });
  });

  // Tests that require API key - Auth Flow
  describeIfApiKey("[integration read] auth flow", () => {
    beforeEach(async () => {
      // Create a temporary directory for each test
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-auth-"));
    });

    afterEach(async () => {
      // Clean up temp directory
      await fs.remove(tempDir);
    });

    it("should complete full workflow: init -> login -> whoami -> status -> list", async () => {
      const apiKey = process.env.ELEVENLABS_API_KEY!;

      // Step 1: Initialize project
      const initResult = await runCli(["init", "--no-ui"], {
        includeApiKey: true,
      });
      expect(initResult.exitCode).toBe(0);
      
      // Verify files were created
      const agentsJsonExists = await fs.pathExists(
        path.join(tempDir, "agents.json")
      );
      const toolsJsonExists = await fs.pathExists(
        path.join(tempDir, "tools.json")
      );
      expect(agentsJsonExists).toBe(true);
      expect(toolsJsonExists).toBe(true);

      // Step 2: Login
      const loginResult = await runCli(["login", "--no-ui"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });
      expect(loginResult.exitCode).toBe(0);
      expect(loginResult.stdout).toBeTruthy();

      // Step 3: Check whoami
      const whoamiResult = await runCli(["whoami", "--no-ui"], {
        includeApiKey: true,
      });
      expect(whoamiResult.exitCode).toBe(0);
      expect(whoamiResult.stdout).toBeTruthy();

      // Step 4: Check status
      const statusResult = await runCli(["status", "--no-ui"], {
        includeApiKey: true,
      });
      expect(statusResult.exitCode).toBe(0);
      expect(statusResult.stdout).toBeTruthy();

      // Step 5: List agents
      const listResult = await runCli(["list", "--no-ui"], {
        includeApiKey: true,
      });
      expect(listResult.exitCode).toBe(0);
      expect(listResult.stdout).toBeTruthy();
    });
  });

  // Push/Pull Integration Tests - Agents
  describeIfApiKey("[integration write] full cycle agents", () => {
    let pushPullTempDir: string;

    beforeAll(async () => {
      // One-time cleanup: Pull all agents and delete them to ensure clean state
      console.log("One-time cleanup: Removing all remote agents before tests...");
      
      // Create temporary directory for cleanup
      const cleanupTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-cleanup-"));
      
      try {
        // Initialize project
        await runCli(["init", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
        });

        // Login
        const apiKey = process.env.ELEVENLABS_API_KEY!;
        await runCli(["login", "--no-ui"], {
          cwd: cleanupTempDir,
          input: `${apiKey}\n`,
          includeApiKey: true,
        });

        // Pull all agents from remote
        await runCli(["pull", "--all", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });

        // Delete all agents at once
        try {
          await runCli(["delete", "--all", "--no-ui"], {
            cwd: cleanupTempDir,
            includeApiKey: true,
            input: "y\n", // Answer the "Are you sure?" prompt
          });
          console.log("✓ Cleaned up all agents, starting with empty state");
        } catch (error) {
          console.warn(`Failed to delete agents: ${error}`);
        }
      } finally {
        // Clean up temporary directory
        await fs.remove(cleanupTempDir);
      }
    });

    beforeEach(async () => {
      // Create a temporary directory for each test
      pushPullTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-pushpull-"));

      // Initialize project
      await runCli(["init", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      // Login
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login", "--no-ui"], {
        cwd: pushPullTempDir,
        input: `${apiKey}\n`,
        includeApiKey: true,
      });
    });

    afterEach(async () => {
      // Skip cleanup if beforeEach failed before creating temp directory
      if (!pushPullTempDir) {
        return;
      }

      // Clean up agents created during the test
      console.log("Cleaning up agents after test...");
      
      // Pull all agents to ensure we have the current server state
      try {
        await runCli(["pull", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });
      } catch (error) {
        console.warn(`Failed to pull agents: ${error}`);
      }

      // Delete all agents at once
      try {
        await runCli(["delete", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Are you sure?" prompt
        });
        console.log("Deleted all agents");
      } catch (error) {
        console.warn(`Failed to delete agents: ${error}`);
      }

      // Clean up temp directory
      await fs.remove(pushPullTempDir);
    });

    it("should verify agent created by add is the only one after pull (--no-ui)", async () => {
      // Create an agent using add command
      const agentName = `e2e-pushpull-test-${Date.now()}`;
      const addResult = await runCli([
        "add",
        agentName,
        "--template",
        "minimal",
        "--no-ui",
      ], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(addResult.exitCode).toBe(0);
      expect(addResult.stdout).toContain(`Created agent in AmberNexus`);

      // Read agents.json to get the agent ID
      const agentsJsonPath = path.join(pushPullTempDir, "agents.json");
      let agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(agentsConfig.agents).toHaveLength(1);
      const createdAgent = agentsConfig.agents[0];
      expect(createdAgent.id).toBeTruthy();
      
      // Read name from config file
      const createdAgentConfig = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, createdAgent.config), "utf-8")
      );
      expect(createdAgentConfig.name).toBe(agentName);

      // Clear local agents.json to simulate fresh pull
      await fs.writeFile(
        agentsJsonPath,
        JSON.stringify({ agents: [] }, null, 2)
      );

      // Pull all agents from remote
      const pullResult = await runCli(["pull", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);

      // Read agents.json again after pull
      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      // Verify exactly 1 agent exists (the one we created)
      expect(agentsConfig.agents).toHaveLength(1);
      expect(agentsConfig.agents[0].id).toBe(createdAgent.id);
      
      // Verify name from config file
      const pulledAgentConfig = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, agentsConfig.agents[0].config), "utf-8")
      );
      expect(pulledAgentConfig.name).toBe(agentName);

      console.log(`✓ Verified agent '${agentName}' is the only agent after pull`);

      // Clean up: delete the agent
      await runCli(["delete", createdAgent.id, "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });
    });

    it("should complete full cycle: create -> pull -> compare -> delete -> verify empty (--no-ui)", async () => {
      const agentName = `e2e-full-cycle-${Date.now()}`;
      const agentsJsonPath = path.join(pushPullTempDir, "agents.json");
      
      // Step 1: Create agent locally using add command
      const addResult = await runCli([
        "add",
        agentName,
        "--template",
        "minimal",
        "--no-ui",
      ], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(addResult.exitCode).toBe(0);
      expect(addResult.stdout).toContain(`Created agent in AmberNexus`);

      // Read the created agent config
      let agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      expect(agentsConfig.agents).toHaveLength(1);
      const createdAgent = agentsConfig.agents[0];
      const createdAgentId = createdAgent.id;
      const createdAgentConfigPath = path.join(pushPullTempDir, createdAgent.config);
      const originalConfig = JSON.parse(
        await fs.readFile(createdAgentConfigPath, "utf-8")
      );

      console.log(`✓ Created agent '${agentName}' with ID ${createdAgentId}`);
      
      // Step 2: Clear local agents.json and config files to simulate fresh environment
      await fs.writeFile(
        agentsJsonPath,
        JSON.stringify({ agents: [] }, null, 2)
      );
      await fs.remove(createdAgentConfigPath);

      // Step 3: Pull all agents from remote
      const pullResult = await runCli(["pull", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);
      console.log(`✓ Pulled agents from remote`);

      // Step 4: Compare pulled agent matches created agent
      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(agentsConfig.agents).toHaveLength(1);
      const pulledAgent = agentsConfig.agents[0];
      expect(pulledAgent.id).toBe(createdAgentId);

      // Compare config files
      const pulledConfigPath = path.join(pushPullTempDir, pulledAgent.config);
      expect(await fs.pathExists(pulledConfigPath)).toBe(true);
      const pulledConfig = JSON.parse(
        await fs.readFile(pulledConfigPath, "utf-8")
      );
      expect(pulledConfig.name).toBe(agentName);

      // Compare key fields (name and conversation config structure)
      expect(pulledConfig.name).toBe(originalConfig.name);
      expect(pulledConfig.conversation_config).toBeDefined();
      expect(pulledConfig.platform_settings).toBeDefined();

      console.log(`✓ Pulled agent config matches original`);

      // Step 5: Delete the agent
      const deleteResult = await runCli(["delete", createdAgentId, "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(deleteResult.exitCode).toBe(0);
      console.log(`✓ Deleted agent '${agentName}'`);

      // Step 6: Pull again and verify no agents exist
      await fs.writeFile(
        agentsJsonPath,
        JSON.stringify({ agents: [] }, null, 2)
      );

      const finalPullResult = await runCli(["pull", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(finalPullResult.exitCode).toBe(0);

      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(agentsConfig.agents).toHaveLength(0);
      console.log(`✓ Verified no agents exist after deletion`);
    });

    it("should handle complex pull scenarios with local modifications and deletions (--no-ui)", async () => {
      const timestamp = Date.now();
      const agentNames = [
        `e2e-complex-first-${timestamp}`,
        `e2e-complex-second-${timestamp}`,
        `e2e-complex-third-${timestamp}`,
      ];
      const agentsJsonPath = path.join(pushPullTempDir, "agents.json");

      // Step (a) & (b): Create 3 agents using agents add command
      console.log("Step (a) & (b): Creating 3 agents...");
      
      for (const agentName of agentNames) {
        const addResult = await runCli([
          "add",
          agentName,
          "--template",
          "minimal",
          "--no-ui",
        ], {
          cwd: pushPullTempDir,
          includeApiKey: true,
        });
        expect(addResult.exitCode).toBe(0);
      }

      // Read agents.json to get the assigned IDs and config paths
      let agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      expect(agentsConfig.agents).toHaveLength(3);
      const agent1Id = agentsConfig.agents[0].id;
      const agent2Id = agentsConfig.agents[1].id;
      const agent3Id = agentsConfig.agents[2].id;
      expect(agent1Id).toBeTruthy();
      expect(agent2Id).toBeTruthy();
      expect(agent3Id).toBeTruthy();
      
      const configPaths = [
        path.join(pushPullTempDir, agentsConfig.agents[0].config),
        path.join(pushPullTempDir, agentsConfig.agents[1].config),
        path.join(pushPullTempDir, agentsConfig.agents[2].config),
      ];
      
      console.log(`✓ Created 3 agents with IDs: ${agent1Id}, ${agent2Id}, ${agent3Id}`);

      // Step (c): Modify first agent locally
      console.log("Step (c): Modifying first agent locally...");
      const agent1Config = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      agent1Config.conversation_config.agent.prompt.prompt = "MODIFIED LOCALLY";
      await fs.writeFile(configPaths[0], JSON.stringify(agent1Config, null, 2));

      // Step (d): Pull -> check that nothing changed
      console.log("Step (d): Pulling without --all, expecting no changes...");
      const pullResult1 = await runCli(["pull", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult1.exitCode).toBe(0);

      // Verify first agent still has local modifications
      const agent1ConfigAfterPull1 = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(agent1ConfigAfterPull1.conversation_config.agent.prompt.prompt).toBe(
        "MODIFIED LOCALLY"
      );
      console.log(`✓ First agent retained local modifications`);

      // Step (e): Remove local version of third agent
      console.log("Step (e): Removing local version of third agent...");
      await fs.remove(configPaths[2]);
      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      agentsConfig.agents = agentsConfig.agents.filter(
        (a: AgentConfigEntry) => a.id !== agent3Id
      );
      await fs.writeFile(agentsJsonPath, JSON.stringify(agentsConfig, null, 2));

      // Step (f): Pull -> check that first two didn't change, third was pulled
      console.log(
        "Step (f): Pulling to restore third agent, first two unchanged..."
      );
      const pullResult2 = await runCli(["pull", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult2.exitCode).toBe(0);

      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      expect(agentsConfig.agents).toHaveLength(3);

      // First agent should still have modifications
      const agent1ConfigAfterPull2 = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(agent1ConfigAfterPull2.conversation_config.agent.prompt.prompt).toBe(
        "MODIFIED LOCALLY"
      );

      // Third agent should be pulled back
      expect(await fs.pathExists(configPaths[2])).toBe(true);
      console.log(`✓ Third agent restored, first two unchanged`);

      // Step (g): Remove local version of third agent again
      console.log("Step (g): Removing local version of third agent again...");
      await fs.remove(configPaths[2]);
      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      agentsConfig.agents = agentsConfig.agents.filter(
        (a: AgentConfigEntry) => a.id !== agent3Id
      );
      await fs.writeFile(agentsJsonPath, JSON.stringify(agentsConfig, null, 2));

      // Step (h): Pull --update -> check that first got overridden, second didn't change, third didn't appear
      console.log(
        "Step (h): Pulling with --update, expecting first to be overridden..."
      );
      const pullResult3 = await runCli(["pull", "--update", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult3.exitCode).toBe(0);

      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      // Should still have only 2 agents (first and second)
      expect(agentsConfig.agents).toHaveLength(2);

      // First agent should be overridden (no longer has local modifications)
      const agent1ConfigAfterUpdate = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(
        agent1ConfigAfterUpdate.conversation_config.agent.prompt.prompt
      ).not.toBe("MODIFIED LOCALLY");
      expect(agent1ConfigAfterUpdate.conversation_config.agent.prompt.prompt).toBe(
        `You are ${agentNames[0]}, a helpful AI assistant.`
      );

      // Third agent should NOT be pulled (--update doesn't add missing agents)
      expect(await fs.pathExists(configPaths[2])).toBe(false);
      console.log(
        `✓ First agent overridden, second unchanged, third not restored`
      );

      // Step (i): Modify first two locally, remove local version of third
      console.log("Step (i): Modifying first two locally...");
      const agent1ConfigMod = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      agent1ConfigMod.conversation_config.agent.prompt.prompt =
        "MODIFIED AGAIN LOCALLY";
      await fs.writeFile(configPaths[0], JSON.stringify(agent1ConfigMod, null, 2));

      const agent2Config = JSON.parse(
        await fs.readFile(configPaths[1], "utf-8")
      );
      agent2Config.conversation_config.agent.prompt.prompt =
        "MODIFIED LOCALLY TOO";
      await fs.writeFile(configPaths[1], JSON.stringify(agent2Config, null, 2));

      // Third is already removed from step (g)

      // Step (j): Pull --all -> check that first two got overridden, third was pulled
      console.log(
        "Step (j): Pulling with --all, expecting all overridden and third restored..."
      );
      const pullResult4 = await runCli(["pull", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult4.exitCode).toBe(0);

      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      expect(agentsConfig.agents).toHaveLength(3);

      // First agent should be overridden
      const agent1ConfigFinal = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(agent1ConfigFinal.conversation_config.agent.prompt.prompt).not.toBe(
        "MODIFIED AGAIN LOCALLY"
      );
      expect(agent1ConfigFinal.conversation_config.agent.prompt.prompt).toBe(
        `You are ${agentNames[0]}, a helpful AI assistant.`
      );

      // Second agent should be overridden
      const agent2ConfigFinal = JSON.parse(
        await fs.readFile(configPaths[1], "utf-8")
      );
      expect(agent2ConfigFinal.conversation_config.agent.prompt.prompt).not.toBe(
        "MODIFIED LOCALLY TOO"
      );
      expect(agent2ConfigFinal.conversation_config.agent.prompt.prompt).toBe(
        `You are ${agentNames[1]}, a helpful AI assistant.`
      );

      // Third agent should be pulled back
      expect(await fs.pathExists(configPaths[2])).toBe(true);
      const agent3ConfigFinal = JSON.parse(
        await fs.readFile(configPaths[2], "utf-8")
      );
      expect(agent3ConfigFinal.conversation_config.agent.prompt.prompt).toBe(
        `You are ${agentNames[2]}, a helpful AI assistant.`
      );

      console.log(
        `✓ All agents overridden to remote state, third agent restored`
      );
      console.log(`✓ Complex pull scenario test completed successfully`);
    });

    it("should preserve duplicate agent names when pulling (only deduplicate filenames)", async () => {
      const duplicateName = `e2e-duplicate-name-${Date.now()}`;
      const agentsJsonPath = path.join(pushPullTempDir, "agents.json");

      console.log(
        `Creating two agents with the same name '${duplicateName}'...`
      );

      // Step 1: Create first agent with the name
      const addResult1 = await runCli(
        ["add", duplicateName, "--template", "minimal", "--no-ui"],
        {
          cwd: pushPullTempDir,
          includeApiKey: true,
        }
      );

      expect(addResult1.exitCode).toBe(0);
      expect(addResult1.stdout).toContain(`Created agent in AmberNexus`);

      // Step 2: Create second agent with the same name
      const addResult2 = await runCli(
        ["add", duplicateName, "--template", "minimal", "--no-ui"],
        {
          cwd: pushPullTempDir,
          includeApiKey: true,
        }
      );

      expect(addResult2.exitCode).toBe(0);
      expect(addResult2.stdout).toContain(`Created agent in AmberNexus`);

      // Read agents.json to verify both agents were created
      let agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(agentsConfig.agents).toHaveLength(2);
      const agent1 = agentsConfig.agents[0];
      const agent2 = agentsConfig.agents[1];

      expect(agent1.id).toBeTruthy();
      expect(agent2.id).toBeTruthy();
      expect(agent1.id).not.toBe(agent2.id); // Different IDs
      
      // Verify names from config files
      const agent1Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, agent1.config), "utf-8")
      );
      const agent2Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, agent2.config), "utf-8")
      );
      expect(agent1Config.name).toBe(duplicateName);
      expect(agent2Config.name).toBe(duplicateName);

      console.log(
        `✓ Created two agents: '${agent1Config.name}' (${agent1.id}) and '${agent2Config.name}' (${agent2.id})`
      );

      // Step 3: Delete the first agent locally (remove from agents.json and delete config file)
      const agent1ConfigPath = path.join(pushPullTempDir, agent1.config);
      await fs.remove(agent1ConfigPath);

      agentsConfig.agents = agentsConfig.agents.filter(
        (a: AgentConfigEntry) => a.id !== agent1.id
      );
      await fs.writeFile(agentsJsonPath, JSON.stringify(agentsConfig, null, 2));

      console.log(`✓ Deleted first agent locally (ID: ${agent1.id})`);

      // Verify only one agent remains locally
      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );
      expect(agentsConfig.agents).toHaveLength(1);
      expect(agentsConfig.agents[0].id).toBe(agent2.id);

      // Step 4: Pull agents from remote
      console.log(`Pulling agents from remote...`);
      const pullResult = await runCli(["pull", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);

      // Step 5: Verify both agents are now present locally with the same name
      agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(agentsConfig.agents).toHaveLength(2);

      // Find the pulled agents by ID
      const pulledAgent1 = agentsConfig.agents.find(
        (a: AgentConfigEntry) => a.id === agent1.id
      );
      const pulledAgent2 = agentsConfig.agents.find(
        (a: AgentConfigEntry) => a.id === agent2.id
      );

      expect(pulledAgent1).toBeTruthy();
      expect(pulledAgent2).toBeTruthy();

      // CRITICAL: Both should have the same name (not deduplicated like agent_1, agent_2)
      // Read names from config files
      const pulledAgent1Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledAgent1.config), "utf-8")
      );
      const pulledAgent2Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledAgent2.config), "utf-8")
      );
      expect(pulledAgent1Config.name).toBe(duplicateName);
      expect(pulledAgent2Config.name).toBe(duplicateName);

      console.log(
        `✓ Both agents preserved the same name: '${pulledAgent1Config.name}' and '${pulledAgent2Config.name}'`
      );

      // Step 6: Verify filenames are deduplicated (e.g., agent.json and agent-1.json)
      const configPath1 = pulledAgent1.config;
      const configPath2 = pulledAgent2.config;

      expect(configPath1).not.toBe(configPath2); // Different config file paths
      expect(await fs.pathExists(path.join(pushPullTempDir, configPath1))).toBe(
        true
      );
      expect(await fs.pathExists(path.join(pushPullTempDir, configPath2))).toBe(
        true
      );

      console.log(
        `✓ Config filenames are different: '${configPath1}' and '${configPath2}'`
      );

      // Verify the configs also have the same name field
      const config1 = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, configPath1), "utf-8")
      );
      const config2 = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, configPath2), "utf-8")
      );

      expect(config1.name).toBe(duplicateName);
      expect(config2.name).toBe(duplicateName);

      console.log(
        `✓ Agent names preserved in config files: '${config1.name}' and '${config2.name}'`
      );
      console.log(
        `✓ Test completed: Duplicate names preserved, filenames deduplicated`
      );
    });

    it("should preserve duplicate names through push-pull cycle", async () => {
      const duplicateName = `e2e-pushpull-dup-${Date.now()}`;
      const agentsJsonPath = path.join(pushPullTempDir, "agents.json");

      console.log(
        `Testing push-pull cycle with duplicate agent names '${duplicateName}'...`
      );

      // Step 1: Create local config files for two agents with same name
      const configDir = path.join(pushPullTempDir, "agent_configs");
      await fs.ensureDir(configDir);

      const config1Path = path.join(configDir, `${duplicateName}.json`);
      const config2Path = path.join(configDir, `${duplicateName}-1.json`);

      const agentConfig1 = {
        name: duplicateName,
        conversation_config: {
          agent: {
            prompt: {
              prompt: `You are ${duplicateName}, a helpful AI assistant.`,
              temperature: 0.8,
            },
          },
          conversation: {
            text_only: false,
          },
        },
        platform_settings: {},
        tags: [],
      };

      const agentConfig2 = { ...agentConfig1 };

      await fs.writeFile(config1Path, JSON.stringify(agentConfig1, null, 2));
      await fs.writeFile(config2Path, JSON.stringify(agentConfig2, null, 2));

      // Step 2: Create agents.json with both agents (no IDs yet)
      const agentsConfig = {
        agents: [
          {
            name: duplicateName,
            config: `agent_configs/${duplicateName}.json`,
          },
          {
            name: duplicateName,
            config: `agent_configs/${duplicateName}-1.json`,
          },
        ],
      };

      await fs.writeFile(agentsJsonPath, JSON.stringify(agentsConfig, null, 2));

      console.log(`✓ Created two local agents with the same name`);

      // Step 3: Push to create them remotely and get IDs
      const pushResult = await runCli(["push", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(pushResult.exitCode).toBe(0);

      // Read agents.json to get the assigned IDs
      let pushedAgentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      const agent1 = pushedAgentsConfig.agents[0];
      const agent2 = pushedAgentsConfig.agents[1];

      expect(agent1.id).toBeTruthy();
      expect(agent2.id).toBeTruthy();
      expect(agent1.id).not.toBe(agent2.id);
      
      // Verify names from config files
      const pushedAgent1Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, agent1.config), "utf-8")
      );
      const pushedAgent2Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, agent2.config), "utf-8")
      );
      expect(pushedAgent1Config.name).toBe(duplicateName);
      expect(pushedAgent2Config.name).toBe(duplicateName);

      console.log(
        `✓ Pushed both agents: '${pushedAgent1Config.name}' (${agent1.id}) and '${pushedAgent2Config.name}' (${agent2.id})`
      );

      // Step 4: Remove local config files and agents.json
      await fs.remove(config1Path);
      await fs.remove(config2Path);
      await fs.writeFile(
        agentsJsonPath,
        JSON.stringify({ agents: [] }, null, 2)
      );

      console.log(`✓ Removed local config files and cleared agents.json`);

      // Step 5: Pull agents back from remote
      const pullResult = await runCli(["pull", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult.exitCode).toBe(0);

      console.log(`✓ Pulled agents back from remote`);

      // Step 6: Verify both agents are present with the same name
      const pulledAgentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(pulledAgentsConfig.agents).toHaveLength(2);

      const pulledAgent1 = pulledAgentsConfig.agents.find(
        (a: AgentConfigEntry) => a.id === agent1.id
      );
      const pulledAgent2 = pulledAgentsConfig.agents.find(
        (a: AgentConfigEntry) => a.id === agent2.id
      );

      expect(pulledAgent1).toBeTruthy();
      expect(pulledAgent2).toBeTruthy();

      // CRITICAL: Both should still have the same name (not deduplicated)
      // Read names from config files
      const finalPulledAgent1Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledAgent1.config), "utf-8")
      );
      const finalPulledAgent2Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledAgent2.config), "utf-8")
      );
      expect(finalPulledAgent1Config.name).toBe(duplicateName);
      expect(finalPulledAgent2Config.name).toBe(duplicateName);

      // Config paths should be different (deduplicated filenames)
      expect(pulledAgent1.config).not.toBe(pulledAgent2.config);

      console.log(
        `✓ Both agents preserved the same name: '${finalPulledAgent1Config.name}' and '${finalPulledAgent2Config.name}'`
      );
      console.log(
        `✓ Config paths are different: '${pulledAgent1.config}' and '${pulledAgent2.config}'`
      );

      // Verify config files exist and have the correct name
      const pulledConfig1 = JSON.parse(
        await fs.readFile(
          path.join(pushPullTempDir, pulledAgent1.config),
          "utf-8"
        )
      );
      const pulledConfig2 = JSON.parse(
        await fs.readFile(
          path.join(pushPullTempDir, pulledAgent2.config),
          "utf-8"
        )
      );

      expect(pulledConfig1.name).toBe(duplicateName);
      expect(pulledConfig2.name).toBe(duplicateName);

      console.log(
        `✓ Test completed: Duplicate names preserved through push-pull cycle`
      );
    });
  });

  // Push/Pull Integration Tests - Tests
  describeIfApiKey("[integration write] full cycle tests", () => {
    let pushPullTempDir: string;

    beforeAll(async () => {
      // One-time cleanup: Pull all tests and delete them to ensure clean state
      console.log("One-time cleanup: Removing all remote tests before tests...");
      
      // Create temporary directory for cleanup
      const cleanupTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tests-e2e-cleanup-"));
      
      try {
        // Initialize project
        await runCli(["init", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
        });

        // Login
        const apiKey = process.env.ELEVENLABS_API_KEY!;
        await runCli(["login", "--no-ui"], {
          cwd: cleanupTempDir,
          input: `${apiKey}\n`,
          includeApiKey: true,
        });

        // Pull all tests from remote
        await runCli(["pull-tests", "--all", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });

        // Delete all tests at once
        try {
          await runCli(["delete-test", "--all", "--no-ui"], {
            cwd: cleanupTempDir,
            includeApiKey: true,
            input: "y\n", // Answer the "Are you sure?" prompt
          });
          console.log("✓ Cleaned up all tests, starting with empty state");
        } catch (error) {
          console.warn(`Failed to delete tests: ${error}`);
        }
      } finally {
        // Clean up temporary directory
        await fs.remove(cleanupTempDir);
      }
    });

    beforeEach(async () => {
      // Create a temporary directory for each test
      pushPullTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tests-e2e-pushpull-"));

      // Initialize project
      await runCli(["init", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      // Login
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login", "--no-ui"], {
        cwd: pushPullTempDir,
        input: `${apiKey}\n`,
        includeApiKey: true,
      });
    });

    afterEach(async () => {
      // Skip cleanup if beforeEach failed before creating temp directory
      if (!pushPullTempDir) {
        return;
      }

      // Clean up tests created during the test
      console.log("Cleaning up tests after test...");
      
      // Pull all tests to ensure we have the current server state
      try {
        await runCli(["pull-tests", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });
      } catch (error) {
        console.warn(`Failed to pull tests: ${error}`);
      }

      // Delete all tests at once
      try {
        await runCli(["delete-test", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Are you sure?" prompt
        });
        console.log("Deleted all tests");
      } catch (error) {
        console.warn(`Failed to delete tests: ${error}`);
      }

      // Clean up temp directory
      await fs.remove(pushPullTempDir);
    });

    it("should verify test created by add-test is the only one after pull (--no-ui)", async () => {
      // Create a test using add-test command
      const testName = `e2e-pushpull-test-${Date.now()}`;
      const addResult = await runCli([
        "add-test",
        testName,
        "--template",
        "basic-llm",
        "--no-ui",
      ], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(addResult.exitCode).toBe(0);
      expect(addResult.stdout).toContain(`Created test in AmberNexus`);

      // Read tests.json to get the test ID
      const testsJsonPath = path.join(pushPullTempDir, "tests.json");
      let testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );

      expect(testsConfig.tests).toHaveLength(1);
      const createdTest = testsConfig.tests[0];
      expect(createdTest.id).toBeTruthy();

      // Clear local tests.json to simulate fresh pull
      await fs.writeFile(
        testsJsonPath,
        JSON.stringify({ tests: [] }, null, 2)
      );

      // Pull all tests from remote
      const pullResult = await runCli(["pull-tests", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);

      // Read tests.json again after pull
      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );

      // Verify exactly 1 test exists (the one we created)
      expect(testsConfig.tests).toHaveLength(1);
      expect(testsConfig.tests[0].id).toBe(createdTest.id);

      console.log(`✓ Verified test '${testName}' is the only test after pull`);

      // Clean up: delete the test
      await runCli(["delete-test", createdTest.id, "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });
    });

    it("should complete full cycle: create -> pull -> compare -> delete -> verify empty (--no-ui)", async () => {
      const testName = `e2e-full-cycle-${Date.now()}`;
      const testsJsonPath = path.join(pushPullTempDir, "tests.json");
      
      // Step 1: Create test locally using add-test command
      const addResult = await runCli([
        "add-test",
        testName,
        "--template",
        "basic-llm",
        "--no-ui",
      ], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(addResult.exitCode).toBe(0);
      expect(addResult.stdout).toContain(`Created test in AmberNexus`);

      // Read the created test config
      let testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      expect(testsConfig.tests).toHaveLength(1);
      const createdTest = testsConfig.tests[0];
      const createdTestId = createdTest.id;
      const createdTestConfigPath = path.join(pushPullTempDir, createdTest.config);
      const originalConfig = JSON.parse(
        await fs.readFile(createdTestConfigPath, "utf-8")
      );

      console.log(`✓ Created test '${testName}' with ID ${createdTestId}`);
      
      // Step 2: Clear local tests.json and config files to simulate fresh environment
      await fs.writeFile(
        testsJsonPath,
        JSON.stringify({ tests: [] }, null, 2)
      );
      await fs.remove(createdTestConfigPath);

      // Step 3: Pull all tests from remote
      const pullResult = await runCli(["pull-tests", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);
      console.log(`✓ Pulled tests from remote`);

      // Step 4: Compare pulled test matches created test
      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );

      expect(testsConfig.tests).toHaveLength(1);
      const pulledTest = testsConfig.tests[0];
      expect(pulledTest.id).toBe(createdTestId);

      // Compare config files
      const pulledConfigPath = path.join(pushPullTempDir, pulledTest.config);
      expect(await fs.pathExists(pulledConfigPath)).toBe(true);
      const pulledConfig = JSON.parse(
        await fs.readFile(pulledConfigPath, "utf-8")
      );

      // Compare key fields (name and test config structure)
      expect(pulledConfig.name).toBe(originalConfig.name);
      expect(pulledConfig.chat_history).toBeDefined();
      expect(pulledConfig.success_condition).toBeDefined();
      expect(pulledConfig.success_examples).toBeDefined();
      expect(pulledConfig.failure_examples).toBeDefined();

      console.log(`✓ Pulled test config matches original`);

      // Step 5: Delete the test
      const deleteResult = await runCli(["delete-test", createdTestId, "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      expect(deleteResult.exitCode).toBe(0);
      console.log(`✓ Deleted test '${testName}'`);

      // Step 6: Pull again and verify no tests exist
      await fs.writeFile(
        testsJsonPath,
        JSON.stringify({ tests: [] }, null, 2)
      );

      const finalPullResult = await runCli(["pull-tests", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(finalPullResult.exitCode).toBe(0);

      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );

      expect(testsConfig.tests).toHaveLength(0);
      console.log(`✓ Verified no tests exist after deletion`);
    });

    it("should handle complex pull scenarios with local modifications and deletions (--no-ui)", async () => {
      const timestamp = Date.now();
      const testNames = [
        `e2e-complex-first-${timestamp}`,
        `e2e-complex-second-${timestamp}`,
        `e2e-complex-third-${timestamp}`,
      ];
      const testsJsonPath = path.join(pushPullTempDir, "tests.json");

      // Step (a) & (b): Create 3 tests using add-test command
      console.log("Step (a) & (b): Creating 3 tests...");
      
      for (const testName of testNames) {
        const addResult = await runCli([
          "add-test",
          testName,
          "--template",
          "basic-llm",
          "--no-ui",
        ], {
          cwd: pushPullTempDir,
          includeApiKey: true,
        });
        expect(addResult.exitCode).toBe(0);
      }

      // Read tests.json to get the assigned IDs and config paths
      let testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      expect(testsConfig.tests).toHaveLength(3);
      const test1Id = testsConfig.tests[0].id;
      const test2Id = testsConfig.tests[1].id;
      const test3Id = testsConfig.tests[2].id;
      expect(test1Id).toBeTruthy();
      expect(test2Id).toBeTruthy();
      expect(test3Id).toBeTruthy();
      
      const configPaths = [
        path.join(pushPullTempDir, testsConfig.tests[0].config),
        path.join(pushPullTempDir, testsConfig.tests[1].config),
        path.join(pushPullTempDir, testsConfig.tests[2].config),
      ];
      
      console.log(`✓ Created 3 tests with IDs: ${test1Id}, ${test2Id}, ${test3Id}`);

      // Step (c): Modify first test locally
      console.log("Step (c): Modifying first test locally...");
      const test1Config = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      test1Config.name = "MODIFIED LOCALLY";
      await fs.writeFile(configPaths[0], JSON.stringify(test1Config, null, 2));

      // Step (d): Pull -> check that nothing changed
      console.log("Step (d): Pulling without --all, expecting no changes...");
      const pullResult1 = await runCli(["pull-tests", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult1.exitCode).toBe(0);

      // Verify first test still has local modifications
      const test1ConfigAfterPull1 = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(test1ConfigAfterPull1.name).toBe("MODIFIED LOCALLY");
      console.log(`✓ First test retained local modifications`);

      // Step (e): Remove local version of third test
      console.log("Step (e): Removing local version of third test...");
      await fs.remove(configPaths[2]);
      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      testsConfig.tests = testsConfig.tests.filter(
        (t: TestConfigEntry) => t.id !== test3Id
      );
      await fs.writeFile(testsJsonPath, JSON.stringify(testsConfig, null, 2));

      // Step (f): Pull -> check that first two didn't change, third was pulled
      console.log(
        "Step (f): Pulling to restore third test, first two unchanged..."
      );
      const pullResult2 = await runCli(["pull-tests", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult2.exitCode).toBe(0);

      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      expect(testsConfig.tests).toHaveLength(3);

      // First test should still have modifications
      const test1ConfigAfterPull2 = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(test1ConfigAfterPull2.name).toBe("MODIFIED LOCALLY");

      // Third test should be pulled back
      expect(await fs.pathExists(configPaths[2])).toBe(true);
      console.log(`✓ Third test restored, first two unchanged`);

      // Step (g): Remove local version of third test again
      console.log("Step (g): Removing local version of third test again...");
      await fs.remove(configPaths[2]);
      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      testsConfig.tests = testsConfig.tests.filter(
        (t: TestConfigEntry) => t.id !== test3Id
      );
      await fs.writeFile(testsJsonPath, JSON.stringify(testsConfig, null, 2));

      // Step (h): Pull --update -> check that first got overridden, second didn't change, third didn't appear
      console.log(
        "Step (h): Pulling with --update, expecting first to be overridden..."
      );
      const pullResult3 = await runCli(["pull-tests", "--update", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult3.exitCode).toBe(0);

      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      // Should still have only 2 tests (first and second)
      expect(testsConfig.tests).toHaveLength(2);

      // First test should be overridden (no longer has local modifications)
      const test1ConfigAfterUpdate = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(test1ConfigAfterUpdate.name).not.toBe("MODIFIED LOCALLY");
      expect(test1ConfigAfterUpdate.name).toBe(testNames[0]);

      // Third test should NOT be pulled (--update doesn't add missing tests)
      expect(await fs.pathExists(configPaths[2])).toBe(false);
      console.log(
        `✓ First test overridden, second unchanged, third not restored`
      );

      // Step (i): Modify first two locally, remove local version of third
      console.log("Step (i): Modifying first two locally...");
      const test1ConfigMod = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      test1ConfigMod.name = "MODIFIED AGAIN LOCALLY";
      await fs.writeFile(configPaths[0], JSON.stringify(test1ConfigMod, null, 2));

      const test2Config = JSON.parse(
        await fs.readFile(configPaths[1], "utf-8")
      );
      test2Config.name = "MODIFIED LOCALLY TOO";
      await fs.writeFile(configPaths[1], JSON.stringify(test2Config, null, 2));

      // Third is already removed from step (g)

      // Step (j): Pull --all -> check that first two got overridden, third was pulled
      console.log(
        "Step (j): Pulling with --all, expecting all overridden and third restored..."
      );
      const pullResult4 = await runCli(["pull-tests", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      expect(pullResult4.exitCode).toBe(0);

      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      expect(testsConfig.tests).toHaveLength(3);

      // First test should be overridden
      const test1ConfigFinal = JSON.parse(
        await fs.readFile(configPaths[0], "utf-8")
      );
      expect(test1ConfigFinal.name).not.toBe("MODIFIED AGAIN LOCALLY");
      expect(test1ConfigFinal.name).toBe(testNames[0]);

      // Second test should be overridden
      const test2ConfigFinal = JSON.parse(
        await fs.readFile(configPaths[1], "utf-8")
      );
      expect(test2ConfigFinal.name).not.toBe("MODIFIED LOCALLY TOO");
      expect(test2ConfigFinal.name).toBe(testNames[1]);

      // Third test should be pulled back
      expect(await fs.pathExists(configPaths[2])).toBe(true);
      const test3ConfigFinal = JSON.parse(
        await fs.readFile(configPaths[2], "utf-8")
      );
      expect(test3ConfigFinal.name).toBe(testNames[2]);

      console.log(
        `✓ All tests overridden to remote state, third test restored`
      );
      console.log(`✓ Complex pull scenario test completed successfully`);
    });

    it("should preserve duplicate test names when pulling (only deduplicate filenames)", async () => {
      const duplicateName = `e2e-duplicate-test-name-${Date.now()}`;
      const testsJsonPath = path.join(pushPullTempDir, "tests.json");

      console.log(
        `Creating two tests with the same name '${duplicateName}'...`
      );

      // Step 1: Create first test with the name
      const addResult1 = await runCli(
        ["add-test", duplicateName, "--template", "basic-llm", "--no-ui"],
        {
          cwd: pushPullTempDir,
          includeApiKey: true,
        }
      );

      expect(addResult1.exitCode).toBe(0);
      expect(addResult1.stdout).toContain(`Created test in AmberNexus`);

      // Step 2: Create second test with the same name
      const addResult2 = await runCli(
        ["add-test", duplicateName, "--template", "basic-llm", "--no-ui"],
        {
          cwd: pushPullTempDir,
          includeApiKey: true,
        }
      );

      expect(addResult2.exitCode).toBe(0);
      expect(addResult2.stdout).toContain(`Created test in AmberNexus`);

      // Read tests.json to verify both tests were created
      let testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );

      expect(testsConfig.tests).toHaveLength(2);
      const test1 = testsConfig.tests[0];
      const test2 = testsConfig.tests[1];

      expect(test1.id).toBeTruthy();
      expect(test2.id).toBeTruthy();
      expect(test1.id).not.toBe(test2.id); // Different IDs

      // Read names from config files for logging
      const test1Config = JSON.parse(await fs.readFile(path.join(pushPullTempDir, test1.config), "utf-8"));
      const test2Config = JSON.parse(await fs.readFile(path.join(pushPullTempDir, test2.config), "utf-8"));

      console.log(
        `✓ Created two tests: '${test1Config.name}' (${test1.id}) and '${test2Config.name}' (${test2.id})`
      );

      // Step 3: Delete the first test locally (remove from tests.json and delete config file)
      const test1ConfigPath = path.join(pushPullTempDir, test1.config);
      await fs.remove(test1ConfigPath);

      testsConfig.tests = testsConfig.tests.filter(
        (t: TestConfigEntry) => t.id !== test1.id
      );
      await fs.writeFile(testsJsonPath, JSON.stringify(testsConfig, null, 2));

      console.log(`✓ Deleted first test locally (ID: ${test1.id})`);

      // Verify only one test remains locally
      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );
      expect(testsConfig.tests).toHaveLength(1);
      expect(testsConfig.tests[0].id).toBe(test2.id);

      // Step 4: Pull tests from remote
      console.log(`Pulling tests from remote...`);
      const pullResult = await runCli(["pull-tests", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);

      // Step 5: Verify both tests are now present locally with the same name
      testsConfig = JSON.parse(
        await fs.readFile(testsJsonPath, "utf-8")
      );

      expect(testsConfig.tests).toHaveLength(2);

      // Find the pulled tests by ID
      const pulledTest1 = testsConfig.tests.find(
        (t: TestConfigEntry) => t.id === test1.id
      );
      const pulledTest2 = testsConfig.tests.find(
        (t: TestConfigEntry) => t.id === test2.id
      );

      expect(pulledTest1).toBeTruthy();
      expect(pulledTest2).toBeTruthy();

      // Names are stored in individual config files, not in tests.json
      // Read the actual names from config files
      const pulledTest1Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledTest1.config), "utf-8")
      );
      const pulledTest2Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledTest2.config), "utf-8")
      );

      expect(pulledTest1Config.name).toBe(duplicateName);
      expect(pulledTest2Config.name).toBe(duplicateName);

      console.log(
        `✓ Both tests preserved the same name: '${pulledTest1Config.name}' and '${pulledTest2Config.name}'`
      );

      // Step 6: Verify filenames are deduplicated (e.g., test.json and test-1.json)
      const configPath1 = pulledTest1.config;
      const configPath2 = pulledTest2.config;

      expect(configPath1).not.toBe(configPath2); // Different config file paths
      expect(await fs.pathExists(path.join(pushPullTempDir, configPath1))).toBe(
        true
      );
      expect(await fs.pathExists(path.join(pushPullTempDir, configPath2))).toBe(
        true
      );

      console.log(
        `✓ Config filenames are different: '${configPath1}' and '${configPath2}'`
      );

      console.log(
        `✓ Test completed: Duplicate test names preserved, filenames deduplicated`
      );
    });
  });

  // Push/Pull Integration Tests - Tools
  describeIfApiKey("[integration write] full cycle tools", () => {
    let pushPullTempDir: string;

    beforeAll(async () => {
      // One-time cleanup: Pull all tools and delete them to ensure clean state
      console.log("One-time cleanup: Removing all remote tools before tests...");
      
      // Create temporary directory for cleanup
      const cleanupTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tools-e2e-cleanup-"));
      
      try {
        // Initialize project
        await runCli(["init", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
        });

        // Login
        const apiKey = process.env.ELEVENLABS_API_KEY!;
        await runCli(["login", "--no-ui"], {
          cwd: cleanupTempDir,
          input: `${apiKey}\n`,
          includeApiKey: true,
        });

        // Pull all tools from remote
        await runCli(["pull-tools", "--all", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });

        // Delete all tools at once
        try {
          await runCli(["delete-tool", "--all", "--no-ui"], {
            cwd: cleanupTempDir,
            includeApiKey: true,
            input: "y\n", // Answer the "Are you sure?" prompt
          });
          console.log("✓ Cleaned up all tools, starting with empty state");
        } catch (error) {
          console.warn(`Failed to delete tools: ${error}`);
        }
      } finally {
        // Clean up temporary directory
        await fs.remove(cleanupTempDir);
      }
    });

    beforeEach(async () => {
      // Create a temporary directory for each test
      pushPullTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tools-e2e-pushpull-"));

      // Initialize project
      await runCli(["init", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
      });

      // Login
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login", "--no-ui"], {
        cwd: pushPullTempDir,
        input: `${apiKey}\n`,
        includeApiKey: true,
      });
    });

    afterEach(async () => {
      // Skip cleanup if beforeEach failed before creating temp directory
      if (!pushPullTempDir) {
        return;
      }

      // Clean up tools created during the test
      console.log("Cleaning up tools after test...");
      
      // Pull all tools to ensure we have the current server state
      try {
        await runCli(["pull-tools", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });
      } catch (error) {
        console.warn(`Failed to pull tools: ${error}`);
      }

      // Delete all tools at once
      try {
        await runCli(["delete-tool", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Are you sure?" prompt
        });
        console.log("Deleted all tools");
      } catch (error) {
        console.warn(`Failed to delete tools: ${error}`);
      }

      // Clean up temp directory
      await fs.remove(pushPullTempDir);
    });

    // Helper to get the add command for a tool type
    const getAddCommand = (toolType: 'webhook' | 'client') => 
      toolType === 'webhook' ? 'add-webhook-tool' : 'add-client-tool';

    // Test 1: Run for both webhook and client tools
    (['webhook', 'client'] as const).forEach((toolType) => {
      it(`should verify ${toolType} tool created by add is the only one after pull (--no-ui)`, async () => {
        // Create a tool using add command
        const toolName = `e2e-pushpull-${toolType}-${Date.now()}`;
        const addResult = await runCli([
          getAddCommand(toolType),
          toolName,
        ], {
          cwd: pushPullTempDir,
          includeApiKey: true,
        });

        expect(addResult.exitCode).toBe(0);
        expect(addResult.stdout).toContain(`Created ${toolType} tool`);

        // Read tools.json to get the tool ID
        const toolsJsonPath = path.join(pushPullTempDir, "tools.json");
        let toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );

        expect(toolsConfig.tools).toHaveLength(1);
        const createdTool = toolsConfig.tools[0];
        expect(createdTool.id).toBeTruthy();

        // Clear local tools.json to simulate fresh pull
        await fs.writeFile(
          toolsJsonPath,
          JSON.stringify({ tools: [] }, null, 2)
        );

        // Pull all tools from remote
        const pullResult = await runCli(["pull-tools", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });

        expect(pullResult.exitCode).toBe(0);

        // Read tools.json again after pull
        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );

        // Verify exactly 1 tool exists (the one we created)
        expect(toolsConfig.tools).toHaveLength(1);
        expect(toolsConfig.tools[0].id).toBe(createdTool.id);

        console.log(`✓ Verified ${toolType} tool '${toolName}' is the only tool after pull`);

        // Clean up: delete the tool
        await runCli(["delete-tool", createdTool.id, "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
        });
      });
    });

    // Test 2: Run for both webhook and client tools
    (['webhook', 'client'] as const).forEach((toolType) => {
      it(`should complete full cycle for ${toolType} tool: create -> pull -> compare -> delete -> verify empty (--no-ui)`, async () => {
        const toolName = `e2e-full-cycle-${toolType}-${Date.now()}`;
        const toolsJsonPath = path.join(pushPullTempDir, "tools.json");
        
        // Step 1: Create tool locally using add command
        const addResult = await runCli([
          getAddCommand(toolType),
          toolName,
        ], {
          cwd: pushPullTempDir,
          includeApiKey: true,
        });

        expect(addResult.exitCode).toBe(0);
        expect(addResult.stdout).toContain(`Created ${toolType} tool`);

        // Read the created tool config
        let toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        expect(toolsConfig.tools).toHaveLength(1);
        const createdTool = toolsConfig.tools[0];
        const createdToolId = createdTool.id;
        const createdToolConfigPath = path.join(pushPullTempDir, createdTool.config);
        const originalConfig = JSON.parse(
          await fs.readFile(createdToolConfigPath, "utf-8")
        );

        console.log(`✓ Created ${toolType} tool '${toolName}' with ID ${createdToolId}`);
        
        // Step 2: Clear local tools.json and config files to simulate fresh environment
        await fs.writeFile(
          toolsJsonPath,
          JSON.stringify({ tools: [] }, null, 2)
        );
        await fs.remove(createdToolConfigPath);

        // Step 3: Pull all tools from remote
        const pullResult = await runCli(["pull-tools", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n", // Answer the "Proceed?" prompt
        });

        expect(pullResult.exitCode).toBe(0);
        console.log(`✓ Pulled tools from remote`);

        // Step 4: Compare pulled tool matches created tool
        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );

        expect(toolsConfig.tools).toHaveLength(1);
        const pulledTool = toolsConfig.tools[0];
        expect(pulledTool.id).toBe(createdToolId);

        // Compare config files
        const pulledConfigPath = path.join(pushPullTempDir, pulledTool.config);
        expect(await fs.pathExists(pulledConfigPath)).toBe(true);
        const pulledConfig = JSON.parse(
          await fs.readFile(pulledConfigPath, "utf-8")
        );

        // Compare key fields (name and type)
        expect(pulledConfig.name).toBe(originalConfig.name);
        expect(pulledConfig.type).toBe(toolType);
        expect(pulledConfig.description).toBeDefined();

        console.log(`✓ Pulled ${toolType} tool config matches original`);

        // Step 5: Delete the tool
        const deleteResult = await runCli(["delete-tool", createdToolId, "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
        });

        expect(deleteResult.exitCode).toBe(0);
        console.log(`✓ Deleted ${toolType} tool '${toolName}'`);

        // Step 6: Pull again and verify no tools exist
        await fs.writeFile(
          toolsJsonPath,
          JSON.stringify({ tools: [] }, null, 2)
        );

        const finalPullResult = await runCli(["pull-tools", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        expect(finalPullResult.exitCode).toBe(0);

        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );

        expect(toolsConfig.tools).toHaveLength(0);
        console.log(`✓ Verified no tools exist after deletion`);
      });
    });

    // Test 3: Run for both webhook and client tools
    (['webhook', 'client'] as const).forEach((toolType) => {
      it(`should handle complex pull scenarios for ${toolType} tools with local modifications and deletions (--no-ui)`, async () => {
        const timestamp = Date.now();
        const toolNames = [
          `e2e-complex-first-${toolType}-${timestamp}`,
          `e2e-complex-second-${toolType}-${timestamp}`,
          `e2e-complex-third-${toolType}-${timestamp}`,
        ];
        const toolsJsonPath = path.join(pushPullTempDir, "tools.json");

        // Step (a) & (b): Create 3 tools using add command
        console.log(`Step (a) & (b): Creating 3 ${toolType} tools...`);
        
        for (const toolName of toolNames) {
          const addResult = await runCli([
            getAddCommand(toolType),
            toolName,
          ], {
            cwd: pushPullTempDir,
            includeApiKey: true,
          });
          expect(addResult.exitCode).toBe(0);
        }

        // Read tools.json to get the assigned IDs and config paths
        let toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        expect(toolsConfig.tools).toHaveLength(3);
        const tool1Id = toolsConfig.tools[0].id;
        const tool2Id = toolsConfig.tools[1].id;
        const tool3Id = toolsConfig.tools[2].id;
        expect(tool1Id).toBeTruthy();
        expect(tool2Id).toBeTruthy();
        expect(tool3Id).toBeTruthy();
        
        const configPaths = [
          path.join(pushPullTempDir, toolsConfig.tools[0].config),
          path.join(pushPullTempDir, toolsConfig.tools[1].config),
          path.join(pushPullTempDir, toolsConfig.tools[2].config),
        ];
        
        console.log(`✓ Created 3 ${toolType} tools with IDs: ${tool1Id}, ${tool2Id}, ${tool3Id}`);

        // Step (c): Modify first tool locally
        console.log("Step (c): Modifying first tool locally...");
        const tool1Config = JSON.parse(
          await fs.readFile(configPaths[0], "utf-8")
        );
        tool1Config.description = "MODIFIED LOCALLY";
        await fs.writeFile(configPaths[0], JSON.stringify(tool1Config, null, 2));

        // Step (d): Pull -> check that nothing changed
        console.log("Step (d): Pulling without --all, expecting no changes...");
        const pullResult1 = await runCli(["pull-tools", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        expect(pullResult1.exitCode).toBe(0);

        // Verify first tool still has local modifications
        const tool1ConfigAfterPull1 = JSON.parse(
          await fs.readFile(configPaths[0], "utf-8")
        );
        expect(tool1ConfigAfterPull1.description).toBe("MODIFIED LOCALLY");
        console.log(`✓ First tool retained local modifications`);

        // Step (e): Remove local version of third tool
        console.log("Step (e): Removing local version of third tool...");
        await fs.remove(configPaths[2]);
        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        toolsConfig.tools = toolsConfig.tools.filter(
          (t: ToolConfigEntry) => t.id !== tool3Id
        );
        await fs.writeFile(toolsJsonPath, JSON.stringify(toolsConfig, null, 2));

        // Step (f): Pull -> check that first two didn't change, third was pulled
        console.log(
          "Step (f): Pulling to restore third tool, first two unchanged..."
        );
        const pullResult2 = await runCli(["pull-tools", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        expect(pullResult2.exitCode).toBe(0);

        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        expect(toolsConfig.tools).toHaveLength(3);

        // First tool should still have modifications
        const tool1ConfigAfterPull2 = JSON.parse(
          await fs.readFile(configPaths[0], "utf-8")
        );
        expect(tool1ConfigAfterPull2.description).toBe("MODIFIED LOCALLY");

        // Third tool should be pulled back
        expect(await fs.pathExists(configPaths[2])).toBe(true);
        console.log(`✓ Third tool restored, first two unchanged`);

        // Step (g): Remove local version of third tool again
        console.log("Step (g): Removing local version of third tool again...");
        await fs.remove(configPaths[2]);
        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        toolsConfig.tools = toolsConfig.tools.filter(
          (t: ToolConfigEntry) => t.id !== tool3Id
        );
        await fs.writeFile(toolsJsonPath, JSON.stringify(toolsConfig, null, 2));

        // Step (h): Pull --update -> check that first got overridden, second didn't change, third didn't appear
        console.log(
          "Step (h): Pulling with --update, expecting first to be overridden..."
        );
        const pullResult3 = await runCli(["pull-tools", "--update", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        expect(pullResult3.exitCode).toBe(0);

        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        // Should still have only 2 tools (first and second)
        expect(toolsConfig.tools).toHaveLength(2);

        // First tool should be overridden (no longer has local modifications)
        const tool1ConfigAfterUpdate = JSON.parse(
          await fs.readFile(configPaths[0], "utf-8")
        );
        expect(tool1ConfigAfterUpdate.description).not.toBe("MODIFIED LOCALLY");
        expect(tool1ConfigAfterUpdate.description).toBe(`${toolNames[0]} ${toolType} tool`);

        // Third tool should NOT be pulled (--update doesn't add missing tools)
        expect(await fs.pathExists(configPaths[2])).toBe(false);
        console.log(
          `✓ First tool overridden, second unchanged, third not restored`
        );

        // Step (i): Modify first two locally, remove local version of third
        console.log("Step (i): Modifying first two locally...");
        const tool1ConfigMod = JSON.parse(
          await fs.readFile(configPaths[0], "utf-8")
        );
        tool1ConfigMod.description = "MODIFIED AGAIN LOCALLY";
        await fs.writeFile(configPaths[0], JSON.stringify(tool1ConfigMod, null, 2));

        const tool2Config = JSON.parse(
          await fs.readFile(configPaths[1], "utf-8")
        );
        tool2Config.description = "MODIFIED LOCALLY TOO";
        await fs.writeFile(configPaths[1], JSON.stringify(tool2Config, null, 2));

        // Third is already removed from step (g)

        // Step (j): Pull --all -> check that first two got overridden, third was pulled
        console.log(
          "Step (j): Pulling with --all, expecting all overridden and third restored..."
        );
        const pullResult4 = await runCli(["pull-tools", "--all", "--no-ui"], {
          cwd: pushPullTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        expect(pullResult4.exitCode).toBe(0);

        toolsConfig = JSON.parse(
          await fs.readFile(toolsJsonPath, "utf-8")
        );
        expect(toolsConfig.tools).toHaveLength(3);

        // First tool should be overridden
        const tool1ConfigFinal = JSON.parse(
          await fs.readFile(configPaths[0], "utf-8")
        );
        expect(tool1ConfigFinal.description).not.toBe("MODIFIED AGAIN LOCALLY");
        expect(tool1ConfigFinal.description).toBe(`${toolNames[0]} ${toolType} tool`);

        // Second tool should be overridden
        const tool2ConfigFinal = JSON.parse(
          await fs.readFile(configPaths[1], "utf-8")
        );
        expect(tool2ConfigFinal.description).not.toBe("MODIFIED LOCALLY TOO");
        expect(tool2ConfigFinal.description).toBe(`${toolNames[1]} ${toolType} tool`);

        // Third tool should be pulled back
        expect(await fs.pathExists(configPaths[2])).toBe(true);
        const tool3ConfigFinal = JSON.parse(
          await fs.readFile(configPaths[2], "utf-8")
        );
        expect(tool3ConfigFinal.description).toBe(`${toolNames[2]} ${toolType} tool`);

        console.log(
          `✓ All ${toolType} tools overridden to remote state, third tool restored`
        );
        console.log(`✓ Complex pull scenario test completed successfully for ${toolType} tools`);
      });
    });

    it("should preserve duplicate tool names when pulling (only deduplicate filenames)", async () => {
      const duplicateName = `e2e-duplicate-tool-name-${Date.now()}`;
      const toolsJsonPath = path.join(pushPullTempDir, "tools.json");

      console.log(
        `Creating two tools with the same name '${duplicateName}'...`
      );

      // Step 1: Create first tool with the name
      const addResult1 = await runCli(
        ["add-webhook-tool", duplicateName],
        {
          cwd: pushPullTempDir,
          includeApiKey: true,
        }
      );

      expect(addResult1.exitCode).toBe(0);
      expect(addResult1.stdout).toContain(`Created webhook tool in AmberNexus`);

      // Step 2: Create second tool with the same name
      const addResult2 = await runCli(
        ["add-webhook-tool", duplicateName],
        {
          cwd: pushPullTempDir,
          includeApiKey: true,
        }
      );

      expect(addResult2.exitCode).toBe(0);
      expect(addResult2.stdout).toContain(`Created webhook tool in AmberNexus`);

      // Read tools.json to verify both tools were created
      let toolsConfig = JSON.parse(
        await fs.readFile(toolsJsonPath, "utf-8")
      );

      expect(toolsConfig.tools.length).toBeGreaterThanOrEqual(2);
      
      // Get the last two tools (the ones we just created)
      // Names are no longer stored in tools.json, need to read from config files
      const tool1 = toolsConfig.tools[toolsConfig.tools.length - 2];
      const tool2 = toolsConfig.tools[toolsConfig.tools.length - 1];

      expect(tool1.id).toBeTruthy();
      expect(tool2.id).toBeTruthy();
      expect(tool1.id).not.toBe(tool2.id); // Different IDs

      // Read names from config files to verify they're the same
      const tool1Config = JSON.parse(await fs.readFile(path.join(pushPullTempDir, tool1.config), "utf-8"));
      const tool2Config = JSON.parse(await fs.readFile(path.join(pushPullTempDir, tool2.config), "utf-8"));

      expect(tool1Config.name).toBe(duplicateName);
      expect(tool2Config.name).toBe(duplicateName);

      console.log(
        `✓ Created two tools: '${tool1Config.name}' (${tool1.id}) and '${tool2Config.name}' (${tool2.id})`
      );

      // Step 3: Delete the first tool locally (remove from tools.json and delete config file)
      const tool1ConfigPath = path.join(pushPullTempDir, tool1.config);
      await fs.remove(tool1ConfigPath);

      toolsConfig.tools = toolsConfig.tools.filter(
        (t: ToolConfigEntry) => t.id !== tool1.id
      );
      await fs.writeFile(toolsJsonPath, JSON.stringify(toolsConfig, null, 2));

      console.log(`✓ Deleted first tool locally (ID: ${tool1.id})`);

      // Verify the first tool is no longer in tools.json
      toolsConfig = JSON.parse(
        await fs.readFile(toolsJsonPath, "utf-8")
      );
      const remainingTool = toolsConfig.tools.find((t: ToolConfigEntry) => t.id === tool2.id);
      expect(remainingTool).toBeTruthy();
      expect(toolsConfig.tools.find((t: ToolConfigEntry) => t.id === tool1.id)).toBeUndefined();

      // Step 4: Pull tools from remote
      console.log(`Pulling tools from remote...`);
      const pullResult = await runCli(["pull-tools", "--all", "--no-ui"], {
        cwd: pushPullTempDir,
        includeApiKey: true,
        input: "y\n", // Answer the "Proceed?" prompt
      });

      expect(pullResult.exitCode).toBe(0);

      // Step 5: Verify both tools are now present locally
      toolsConfig = JSON.parse(
        await fs.readFile(toolsJsonPath, "utf-8")
      );

      // Find the pulled tools by ID
      const pulledTool1 = toolsConfig.tools.find(
        (t: ToolConfigEntry) => t.id === tool1.id
      );
      const pulledTool2 = toolsConfig.tools.find(
        (t: ToolConfigEntry) => t.id === tool2.id
      );

      expect(pulledTool1).toBeTruthy();
      expect(pulledTool2).toBeTruthy();

      // Read names from config files and verify they're the same
      const pulledTool1Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledTool1.config), "utf-8")
      );
      const pulledTool2Config = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledTool2.config), "utf-8")
      );

      // CRITICAL: Both should have the same name (not deduplicated like tool_1, tool_2)
      expect(pulledTool1Config.name).toBe(duplicateName);
      expect(pulledTool2Config.name).toBe(duplicateName);

      console.log(
        `✓ Both tools preserved the same name: '${pulledTool1Config.name}' and '${pulledTool2Config.name}'`
      );

      // Step 6: Verify filenames are deduplicated (e.g., tool.json and tool-1.json)
      const pulledConfigPath1 = pulledTool1.config;
      const pulledConfigPath2 = pulledTool2.config;

      expect(pulledConfigPath1).not.toBe(pulledConfigPath2); // Different config file paths
      expect(await fs.pathExists(path.join(pushPullTempDir, pulledConfigPath1))).toBe(
        true
      );
      expect(await fs.pathExists(path.join(pushPullTempDir, pulledConfigPath2))).toBe(
        true
      );

      console.log(
        `✓ Config filenames are different: '${pulledConfigPath1}' and '${pulledConfigPath2}'`
      );

      // Verify the configs also have the same name field
      const config1 = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledConfigPath1), "utf-8")
      );
      const config2 = JSON.parse(
        await fs.readFile(path.join(pushPullTempDir, pulledConfigPath2), "utf-8")
      );

      expect(config1.name).toBe(duplicateName);
      expect(config2.name).toBe(duplicateName);

      console.log(
        `✓ Tool names preserved in config files: '${config1.name}' and '${config2.name}'`
      );
      console.log(
        `✓ Test completed: Duplicate tool names preserved, filenames deduplicated`
      );
    });
  });

  describeIfApiKey("[integration write] multi-environment workflow", () => {
    let multiEnvTempDir: string;
    const hasTestApiKey = !!process.env.ELEVENLABS_TEST_API_KEY;
    
    // Skip this test suite if TEST API key is not provided
    const testFn = hasTestApiKey ? it : it.skip;

    beforeAll(async () => {
      if (!hasTestApiKey) {
        console.log("Skipping multi-environment tests: ELEVENLABS_TEST_API_KEY not found");
        console.log("   To run these tests, add ELEVENLABS_TEST_API_KEY to your .env file");
        return;
      }

      // One-time cleanup for both environments
      console.log("One-time cleanup: Removing all remote agents from both environments...");
      
      const cleanupTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-multienv-cleanup-"));
      
      try {
        // Initialize project
        await runCli(["init", "--no-ui"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
        });

        // Cleanup prod environment
        const prodApiKey = process.env.ELEVENLABS_API_KEY!;
        await runCli(["login", "--no-ui", "--env", "prod"], {
          cwd: cleanupTempDir,
          input: `${prodApiKey}\n`,
          includeApiKey: true,
        });

        await runCli(["pull", "--all", "--no-ui", "--env", "prod"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        try {
          await runCli(["delete", "--all", "--no-ui", "--env", "prod"], {
            cwd: cleanupTempDir,
            includeApiKey: true,
            input: "y\n",
          });
          console.log("✓ Cleaned up prod environment");
        } catch (error) {
          console.warn(`Failed to delete prod agents: ${error}`);
        }

        // Cleanup test environment
        const testApiKey = process.env.ELEVENLABS_TEST_API_KEY!;
        await runCli(["login", "--no-ui", "--env", "test"], {
          cwd: cleanupTempDir,
          input: `${testApiKey}\n`,
          includeApiKey: true,
        });

        await runCli(["pull", "--all", "--no-ui", "--env", "test"], {
          cwd: cleanupTempDir,
          includeApiKey: true,
          input: "y\n",
        });

        try {
          await runCli(["delete", "--all", "--no-ui", "--env", "test"], {
            cwd: cleanupTempDir,
            includeApiKey: true,
            input: "y\n",
          });
          console.log("✓ Cleaned up test environment");
        } catch (error) {
          console.warn(`Failed to delete test agents: ${error}`);
        }
      } finally {
        await fs.remove(cleanupTempDir);
      }
    });

    beforeEach(async () => {
      multiEnvTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-multienv-"));
    });

    afterEach(async () => {
      await fs.remove(multiEnvTempDir);
    });

    testFn("should handle complete multi-environment workflow", async () => {
      const prodApiKey = process.env.ELEVENLABS_API_KEY!;
      const testApiKey = process.env.ELEVENLABS_TEST_API_KEY!;

      // Step 1: Initialize project
      console.log("Step 1: Initializing project...");
      const initResult = await runCli(["init", "--no-ui"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
      });
      expect(initResult.exitCode).toBe(0);

      // Step 2: Login to prod environment
      console.log("Step 2: Login to prod environment...");
      const loginProdResult = await runCli(["login", "--no-ui", "--env", "prod"], {
        cwd: multiEnvTempDir,
        input: `${prodApiKey}\n`,
        includeApiKey: true,
      });
      expect(loginProdResult.exitCode).toBe(0);

      // Step 3: Login to test environment
      console.log("Step 3: Login to test environment...");
      const loginTestResult = await runCli(["login", "--no-ui", "--env", "test"], {
        cwd: multiEnvTempDir,
        input: `${testApiKey}\n`,
        includeApiKey: true,
      });
      expect(loginTestResult.exitCode).toBe(0);

      // Verify both environments are logged in
      // Don't include API key env var so whoami reads from stored keys
      const whoamiResult = await runCli(["whoami", "--no-ui"], {
        cwd: multiEnvTempDir,
        includeApiKey: false,
      });
      expect(whoamiResult.exitCode).toBe(0);
      expect(whoamiResult.stdout).toContain("prod");
      expect(whoamiResult.stdout).toContain("test");

      // Step 4: Add agent to prod (default)
      console.log("Step 4: Adding agent to prod environment...");
      const addProdResult = await runCli(["add", "prod-agent", "--no-ui"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
      });
      expect(addProdResult.exitCode).toBe(0);

      // Step 5: Add agent to test environment
      console.log("Step 5: Adding agent to test environment...");
      const addTestResult = await runCli(["add", "test-agent", "--no-ui", "--env", "test"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
      });
      expect(addTestResult.exitCode).toBe(0);

      // Verify both agents exist in agents.json with correct environments
      let agentsJsonPath = path.join(multiEnvTempDir, "agents.json");
      let agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(2);
      
      const prodAgent = agentsConfig.agents.find((a: AgentConfigEntry) => (a.env || 'prod') === 'prod');
      const testAgent = agentsConfig.agents.find((a: AgentConfigEntry) => a.env === 'test');
      expect(prodAgent).toBeTruthy();
      expect(testAgent).toBeTruthy();
      
      const prodAgentId = prodAgent.id;
      const testAgentId = testAgent.id;
      console.log(`✓ Created prod agent (${prodAgentId}) and test agent (${testAgentId})`);

      // Step 6: Delete local files
      console.log("Step 6: Deleting local files...");
      await fs.remove(agentsJsonPath);
      await fs.remove(path.join(multiEnvTempDir, "agent_configs"));

      // Step 7: Pull from test environment only
      console.log("Step 7: Pulling from test environment...");
      const pullTestResult = await runCli(["pull", "--all", "--no-ui", "--env", "test"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
        input: "y\n",
      });
      if (pullTestResult.exitCode !== 0) {
        console.log("Pull stderr:", pullTestResult.stderr);
        console.log("Pull stdout:", pullTestResult.stdout);
      }
      expect(pullTestResult.exitCode).toBe(0);

      // Step 8: Check that only one agent was pulled (test agent)
      console.log("Step 8: Verifying only test agent was pulled...");
      agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(1);
      expect(agentsConfig.agents[0].env).toBe("test");
      expect(agentsConfig.agents[0].id).toBe(testAgentId);
      console.log("✓ Only test agent was pulled");

      // Step 9: Pull from prod environment
      console.log("Step 9: Pulling from prod environment...");
      const pullProdResult = await runCli(["pull", "--all", "--no-ui", "--env", "prod"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
        input: "y\n",
      });
      expect(pullProdResult.exitCode).toBe(0);

      // Step 10: Check both agents exist
      console.log("Step 10: Verifying both agents exist...");
      agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(2);
      
      const pulledProdAgent = agentsConfig.agents.find((a: AgentConfigEntry) => a.id === prodAgentId);
      const pulledTestAgent = agentsConfig.agents.find((a: AgentConfigEntry) => a.id === testAgentId);
      expect(pulledProdAgent).toBeTruthy();
      expect(pulledTestAgent).toBeTruthy();
      expect(pulledProdAgent.env || 'prod').toBe('prod');
      expect(pulledTestAgent.env).toBe('test');
      console.log("✓ Both agents exist with correct environments");

      // Step 11: Modify both agents
      console.log("Step 11: Modifying both agents...");
      const prodConfigPath = path.join(multiEnvTempDir, pulledProdAgent.config);
      const testConfigPath = path.join(multiEnvTempDir, pulledTestAgent.config);
      
      const prodConfig = JSON.parse(await fs.readFile(prodConfigPath, "utf-8"));
      const testConfig = JSON.parse(await fs.readFile(testConfigPath, "utf-8"));
      
      prodConfig.name = "modified-prod-agent";
      testConfig.name = "modified-test-agent";
      
      await fs.writeFile(prodConfigPath, JSON.stringify(prodConfig, null, 2));
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      console.log("✓ Modified both agents");

      // Step 12: Push changes
      console.log("Step 12: Pushing changes...");
      const pushResult = await runCli(["push", "--no-ui"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
      });
      expect(pushResult.exitCode).toBe(0);
      console.log("✓ Pushed changes");

      // Step 13: Remove local files again
      console.log("Step 13: Removing local files...");
      await fs.remove(agentsJsonPath);
      await fs.remove(path.join(multiEnvTempDir, "agent_configs"));

      // Step 14: Pull from test environment
      console.log("Step 14: Pulling from test environment...");
      await runCli(["pull", "--all", "--no-ui", "--env", "test"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      // Step 15: Confirm test agent was modified
      console.log("Step 15: Verifying test agent was modified...");
      agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(1);
      const modifiedTestConfig = JSON.parse(
        await fs.readFile(path.join(multiEnvTempDir, agentsConfig.agents[0].config), "utf-8")
      );
      expect(modifiedTestConfig.name).toBe("modified-test-agent");
      console.log("✓ Test agent was modified");

      // Step 16: Pull from prod environment
      console.log("Step 16: Pulling from prod environment...");
      await runCli(["pull", "--all", "--no-ui", "--env", "prod"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
        input: "y\n",
      });

      // Step 17: Confirm prod agent was modified
      console.log("Step 17: Verifying prod agent was modified...");
      agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(2);
      const modifiedProdAgent = agentsConfig.agents.find((a: AgentConfigEntry) => a.id === prodAgentId);
      const modifiedProdConfig = JSON.parse(
        await fs.readFile(path.join(multiEnvTempDir, modifiedProdAgent.config), "utf-8")
      );
      expect(modifiedProdConfig.name).toBe("modified-prod-agent");
      console.log("✓ Prod agent was modified");

      // Step 18: Delete all agents
      console.log("Step 18: Deleting all agents...");
      const deleteAllResult = await runCli(["delete", "--all", "--no-ui"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
        input: "y\n",
      });
      expect(deleteAllResult.exitCode).toBe(0);

      // Verify agents.json is empty
      agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(0);
      console.log("✓ All agents deleted");

      // Step 19: Pull from both environments
      console.log("Step 19: Pulling from both environments...");
      const finalPullResult = await runCli(["pull", "--all", "--no-ui"], {
        cwd: multiEnvTempDir,
        includeApiKey: true,
        input: "y\n",
      });
      expect(finalPullResult.exitCode).toBe(0);

      // Step 20: Confirm nothing was pulled
      console.log("Step 20: Verifying nothing was pulled...");
      agentsConfig = JSON.parse(await fs.readFile(agentsJsonPath, "utf-8"));
      expect(agentsConfig.agents).toHaveLength(0);
      console.log("✓ No agents pulled (both environments empty)");

      console.log("✓ Multi-environment workflow test completed successfully");
    });
  });
});
