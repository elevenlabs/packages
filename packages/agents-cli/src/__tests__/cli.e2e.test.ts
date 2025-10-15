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

  // Tests that require API key - No UI Mode
  describeIfApiKey("[integration write] no ui", () => {
    beforeEach(async () => {
      // Create a temporary directory for each test
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-api-"));
    });

    afterEach(async () => {
      // Clean up temp directory
      await fs.remove(tempDir);
    });

    it("should login with valid API key (--no-ui)", async () => {
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      const result = await runCli(["login", "--no-ui"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Login successful");
    });

    it("should show whoami after login (--no-ui)", async () => {
      // Login first
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login", "--no-ui"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });

      // Check whoami
      const result = await runCli(["whoami", "--no-ui"], {
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Logged in");
      expect(result.stdout).toMatch(/sk_\w{5,}\.\.\.\w{4}/); // Masked key pattern (sk_xxxxx...xxxx)
    });
  });

  // Tests that require API key - With UI Mode
  describeIfApiKey("[integration write] with ui", () => {
    beforeEach(async () => {
      // Create a temporary directory for each test
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-e2e-api-ui-"));
    });

    afterEach(async () => {
      // Clean up temp directory
      await fs.remove(tempDir);
    });

    it("should show login UI", async () => {
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      const result = await runCli(["login"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      // UI mode may have different output, just verify success
      expect(result.stdout).toBeTruthy();
    });

    it("should show whoami UI after login", async () => {
      // Login first
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });

      // Check whoami with UI
      const result = await runCli(["whoami"], {
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
    });

    it("should initialize project with UI", async () => {
      const result = await runCli(["init"], {
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      
      // Verify files were created
      const agentsJsonExists = await fs.pathExists(
        path.join(tempDir, "agents.json")
      );
      const toolsJsonExists = await fs.pathExists(
        path.join(tempDir, "tools.json")
      );
      
      expect(agentsJsonExists).toBe(true);
      expect(toolsJsonExists).toBe(true);
    });

    it("should list agents with UI", async () => {
      // Initialize project
      await runCli(["init"], {
        includeApiKey: true,
      });

      // Login
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });

      // List agents with UI
      const result = await runCli(["list"], {
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
    });

    it("should show status with UI", async () => {
      // Initialize project
      await runCli(["init"], {
        includeApiKey: true,
      });

      // Login
      const apiKey = process.env.ELEVENLABS_API_KEY!;
      await runCli(["login"], {
        input: `${apiKey}\n`,
        includeApiKey: true,
      });

      // Status with UI
      const result = await runCli(["status"], {
        includeApiKey: true,
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
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
  });
});
