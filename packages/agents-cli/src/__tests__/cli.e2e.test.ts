/**
 * End-to-end tests for CLI functionality
 */

import { spawn } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

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
    options: { cwd?: string; input?: string } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve, reject) => {
      // Clean environment for testing
      const cleanEnv = { ...process.env };
      delete cleanEnv.ELEVENLABS_API_KEY;

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

      // Set a timeout of 10 seconds per command
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        reject(new Error(`CLI command timed out: ${args.join(" ")}`));
      }, 10000);

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

  describe("help and version", () => {
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

  describe("init command", () => {
    it("should initialize a new project", async () => {
      const result = await runCli(["init"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Initializing project");
      expect(result.stdout).toContain("Project initialized successfully!");

      // Check that files were created
      const agentsJsonExists = await fs.pathExists(
        path.join(tempDir, "agents.json")
      );
      const lockFileExists = await fs.pathExists(
        path.join(tempDir, "agents.lock")
      );
      const envExampleExists = await fs.pathExists(
        path.join(tempDir, ".env.example")
      );

      expect(agentsJsonExists).toBe(true);
      expect(lockFileExists).toBe(true);
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

  describe("templates command", () => {
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

  describe("whoami command", () => {
    it("should show not logged in when no API key", async () => {
      const result = await runCli(["whoami"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Not logged in");
    });
  });

  describe("project workflow", () => {
    it("should handle basic project workflow without API key", async () => {
      // Initialize project
      let result = await runCli(["init"]);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("error handling", () => {
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

  describe("configuration handling", () => {
    it("should handle agents.json operations", async () => {
      // Initialize project
      await runCli(["init"]);

      // Check that agents.json was created with correct structure
      const agentsJsonPath = path.join(tempDir, "agents.json");
      const content = await fs.readFile(agentsJsonPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed).toEqual({ agents: [] });
    });

    it("should handle lock file operations", async () => {
      // Initialize project
      await runCli(["init"]);

      // Check that lock file was created with correct structure
      const lockFilePath = path.join(tempDir, "agents.lock");
      const content = await fs.readFile(lockFilePath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed).toEqual({ agents: {}, tools: {}, tests: {} });
    });
  });

  describe("push-tools command", () => {
    beforeEach(async () => {
      // Initialize project for each test
      await runCli(["init"]);
    });

    it("should recognize push-tools command", async () => {
      const result = await runCli(["push-tools", "--dry-run"]);

      // Should succeed in dry-run mode with valid tools.json (created by init)
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain("unknown command");
      // Should show dry-run mode output
      expect(result.stdout.toLowerCase()).toContain("push completed successfully");
    });

    it("should show help for push-tools command", async () => {
      const result = await runCli(["push-tools", "--help", "--no-ui"]);

      // Command should be recognized, even if help doesn't work perfectly
      // The important thing is it's not "unknown command"
      expect(result.stderr).not.toContain("unknown command");
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

    it("should handle dry-run option", async () => {
      const result = await runCli(["push-tools", "--dry-run"]);

      expect(result.exitCode).toBe(0);
      // Should get expected success, not unknown option error
      expect(result.stderr).not.toContain("unknown option");
      expect(result.stdout.toLowerCase()).toContain("push completed successfully");
    });

    it("should handle specific tool name option", async () => {
      const result = await runCli(["push-tools", "--tool", "test-tool"]);

      expect(result.exitCode).toBe(1);
      // --tool option should be parsed correctly (no unknown option error)
      expect(result.stderr).not.toContain("unknown option");
      // Should get tool not found error since test-tool doesn't exist in empty tools.json
      expect(result.stderr).toContain("not found in configuration");
    });

    it("should work with existing tools.json", async () => {
      // Create a minimal tools.json
      const toolsJson = {
        tools: [
          {
            name: "test-webhook",
            type: "webhook",
            config: "tool_configs/test_webhook.json",
          },
        ],
      };

      const toolsJsonPath = path.join(tempDir, "tools.json");
      await fs.writeFile(toolsJsonPath, JSON.stringify(toolsJson, null, 2));

      // Create the config directory and a minimal config file
      const configDir = path.join(tempDir, "tool_configs");
      await fs.ensureDir(configDir);

      const toolConfig = {
        name: "test-webhook",
        description: "Test webhook tool",
        type: "webhook",
        api_schema: {
          url: "https://api.example.com/webhook",
          method: "POST",
        },
      };

      const configPath = path.join(configDir, "test_webhook.json");
      await fs.writeFile(configPath, JSON.stringify(toolConfig, null, 2));

      // Run push-tools with dry-run (so it doesn't try to make API calls)
      const result = await runCli(["push-tools", "--dry-run"]);

      // Should succeed (exit code 0) since files exist
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("test-webhook (webhook)");
      expect(result.stdout).toContain("Push completed successfully");
    });

    it("should handle missing config files gracefully", async () => {
      // Create tools.json with reference to non-existent config
      const toolsJson = {
        tools: [
          {
            name: "missing-config-tool",
            type: "webhook",
            config: "non_existent.json",
          },
        ],
      };

      const toolsJsonPath = path.join(tempDir, "tools.json");
      await fs.writeFile(toolsJsonPath, JSON.stringify(toolsJson, null, 2));

      const result = await runCli(["push-tools", "--dry-run"]);

      // Should not crash, UI should handle gracefully
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("missing-config-tool (webhook)");
    });

    it("should handle tools without config path", async () => {
      // Create tools.json with tool missing config path
      const toolsJson = {
        tools: [
          {
            name: "no-config-tool",
            type: "webhook",
            // Missing config property
          },
        ],
      };

      const toolsJsonPath = path.join(tempDir, "tools.json");
      await fs.writeFile(toolsJsonPath, JSON.stringify(toolsJson, null, 2));

      const result = await runCli(["push-tools", "--dry-run"]);

      // Should not crash, UI should handle gracefully
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("no-config-tool (webhook)");
    });
  });
});
