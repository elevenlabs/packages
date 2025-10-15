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
 * 1. Create a new ElevenLabs account (separate from production)
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
      expect(result.stdout).toContain("ElevenLabs Agents Manager CLI");
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

  // Push/Pull Integration Tests
  describeIfApiKey("[integration write] full cycle", () => {
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
      expect(addResult.stdout).toContain(`Created agent in ElevenLabs`);

      // Read agents.json to get the agent ID
      const agentsJsonPath = path.join(pushPullTempDir, "agents.json");
      let agentsConfig = JSON.parse(
        await fs.readFile(agentsJsonPath, "utf-8")
      );

      expect(agentsConfig.agents).toHaveLength(1);
      const createdAgent = agentsConfig.agents[0];
      expect(createdAgent.name).toBe(agentName);
      expect(createdAgent.id).toBeTruthy();

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
      expect(agentsConfig.agents[0].name).toBe(agentName);
      expect(agentsConfig.agents[0].id).toBe(createdAgent.id);

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
      expect(addResult.stdout).toContain(`Created agent in ElevenLabs`);

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
      expect(pulledAgent.name).toBe(agentName);
      expect(pulledAgent.id).toBe(createdAgentId);

      // Compare config files
      const pulledConfigPath = path.join(pushPullTempDir, pulledAgent.config);
      expect(await fs.pathExists(pulledConfigPath)).toBe(true);
      const pulledConfig = JSON.parse(
        await fs.readFile(pulledConfigPath, "utf-8")
      );

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
        (a: any) => a.name !== agentNames[2]
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
        (a: any) => a.name !== agentNames[2]
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
  });
});
