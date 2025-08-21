/**
 * End-to-end tests for CLI functionality
 */

import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('CLI End-to-End Tests', () => {
  jest.setTimeout(30000); // Increase timeout to 30 seconds for e2e tests
  let tempDir: string;
  let cliPath: string;

  beforeAll(async () => {
    // Build the CLI first
    cliPath = path.join(__dirname, '../../dist/cli.js');
    
    // Ensure the CLI is built
    const cliExists = await fs.pathExists(cliPath);
    if (!cliExists) {
      throw new Error('CLI not built. Run `npm run build` first.');
    }
  });

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'convai-e2e-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  const runCli = (args: string[], options: { cwd?: string; input?: string } = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve, reject) => {
      // Clean environment for testing
      const cleanEnv = { ...process.env };
      delete cleanEnv.ELEVENLABS_API_KEY;
      
      const child = spawn('node', [cliPath, ...args], {
        cwd: options.cwd || tempDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...cleanEnv,
          HOME: tempDir, // Use temp dir as HOME to avoid accessing real keychain/files
          USERPROFILE: tempDir, // Windows equivalent
        }
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      // Set a timeout of 10 seconds per command
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        reject(new Error(`CLI command timed out: ${args.join(' ')}`));
      }, 10000);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        if (!timedOut) {
          resolve({
            stdout,
            stderr,
            exitCode: code || 0
          });
        }
      });

      child.on('error', (err) => {
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

  describe('help and version', () => {
    it('should show help', async () => {
      const result = await runCli(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('ElevenLabs Conversational AI Agent Manager CLI');
      expect(result.stdout).toContain('Usage:');
    });

    it('should show version', async () => {
      const result = await runCli(['--version']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('init command', () => {
    it('should initialize a new project', async () => {
      const result = await runCli(['init']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Initializing project');
      expect(result.stdout).toContain('Project initialized successfully!');
      
      // Check that files were created
      const agentsJsonExists = await fs.pathExists(path.join(tempDir, 'agents.json'));
      const lockFileExists = await fs.pathExists(path.join(tempDir, 'convai.lock'));
      const envExampleExists = await fs.pathExists(path.join(tempDir, '.env.example'));
      
      expect(agentsJsonExists).toBe(true);
      expect(lockFileExists).toBe(true);
      expect(envExampleExists).toBe(true);
      
      // Check directory structure
      const devDirExists = await fs.pathExists(path.join(tempDir, 'agent_configs/dev'));
      const stagingDirExists = await fs.pathExists(path.join(tempDir, 'agent_configs/staging'));
      const prodDirExists = await fs.pathExists(path.join(tempDir, 'agent_configs/prod'));
      
      expect(devDirExists).toBe(true);
      expect(stagingDirExists).toBe(true);
      expect(prodDirExists).toBe(true);
    });

    it('should not overwrite existing files', async () => {
      // Create project first
      await runCli(['init']);
      
      // Modify agents.json
      const agentsJsonPath = path.join(tempDir, 'agents.json');
      await fs.writeFile(agentsJsonPath, '{"agents": [{"name": "test"}]}');
      
      // Init again
      const result = await runCli(['init']);
      
      expect(result.exitCode).toBe(0);
      
      // Check that file was not overwritten
      const content = await fs.readFile(agentsJsonPath, 'utf-8');
      expect(content).toContain('test');
    });
  });

  describe('templates command', () => {
    it('should list available templates', async () => {
      const result = await runCli(['templates', 'list']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Available Agent Templates:');
      expect(result.stdout).toContain('default');
      expect(result.stdout).toContain('minimal');
      expect(result.stdout).toContain('customer-service');
    });

    it('should show template details', async () => {
      const result = await runCli(['templates', 'show', 'default']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Template: default');
      expect(result.stdout).toContain('example_agent');
    });

    it('should show error for invalid template', async () => {
      const result = await runCli(['templates', 'show', 'invalid']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown template type');
    });
  });

  describe('whoami command', () => {
    it('should show not logged in when no API key', async () => {
      const result = await runCli(['whoami']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Not logged in');
    });
  });

  describe('project workflow', () => {
    it('should handle basic project workflow without API key', async () => {
      // Initialize project
      let result = await runCli(['init']);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing command gracefully', async () => {
      const result = await runCli(['nonexistent-command']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should handle invalid arguments', async () => {
      const result = await runCli(['add']); // missing required argument
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Usage: convai add');
    });
  });

  describe('configuration handling', () => {
    it('should handle agents.json operations', async () => {
      // Initialize project
      await runCli(['init']);
      
      // Check that agents.json was created with correct structure
      const agentsJsonPath = path.join(tempDir, 'agents.json');
      const content = await fs.readFile(agentsJsonPath, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed).toEqual({ agents: [] });
    });

    it('should handle lock file operations', async () => {
      // Initialize project
      await runCli(['init']);
      
      // Check that lock file was created with correct structure
      const lockFilePath = path.join(tempDir, 'convai.lock');
      const content = await fs.readFile(lockFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      
      expect(parsed).toEqual({ agents: {}, tools: {} });
    });
  });
});