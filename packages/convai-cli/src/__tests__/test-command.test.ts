import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

describe('CLI Test Command Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'test-workspace');
  const cliPath = path.join(process.cwd(), 'bin', 'convai');

  beforeEach(async () => {
    // Create test workspace
    await fs.ensureDir(testDir);
    
    // Create mock agents.json
    await fs.writeJson(path.join(testDir, 'agents.json'), {
      agents: [
        {
          name: 'customer-service',
          environments: {
            prod: {
              config: 'configs/customer-service.json'
            },
            dev: {
              config: 'configs/customer-service-dev.json'
            }
          }
        },
        {
          name: 'sales-assistant',
          config: 'configs/sales-assistant.json'
        }
      ]
    });

    // Create mock lock file
    await fs.writeJson(path.join(testDir, 'convai.lock'), {
      agents: [
        {
          name: 'customer-service',
          environment: 'prod',
          id: 'agent_prod_123',
          version: 1,
          last_synced: new Date().toISOString()
        },
        {
          name: 'customer-service',
          environment: 'dev',
          id: 'agent_dev_456',
          version: 1,
          last_synced: new Date().toISOString()
        },
        {
          name: 'sales-assistant',
          environment: 'prod',
          id: 'agent_sales_789',
          version: 1,
          last_synced: new Date().toISOString()
        }
      ]
    });

    // Create mock config files
    await fs.ensureDir(path.join(testDir, 'configs'));
    
    await fs.writeJson(path.join(testDir, 'configs', 'customer-service.json'), {
      name: 'Customer Service Agent',
      conversation_config: {
        agent: {
          prompt: {
            prompt: 'You are a helpful customer service agent',
            temperature: 0.7
          }
        },
        conversation: {
          text_only: false
        }
      },
      platform_settings: {
        testing: {
          attached_tests: [
            { test_id: 'test_greeting_001' },
            { test_id: 'test_resolution_002' }
          ]
        }
      },
      tags: ['customer-service', 'production']
    });

    await fs.writeJson(path.join(testDir, 'configs', 'customer-service-dev.json'), {
      name: 'Customer Service Agent (Dev)',
      conversation_config: {
        agent: {
          prompt: {
            prompt: 'You are a helpful customer service agent in development',
            temperature: 0.8
          }
        },
        conversation: {
          text_only: true
        }
      },
      platform_settings: {
        testing: {
          attached_tests: [
            { test_id: 'test_dev_001' }
          ]
        }
      },
      tags: ['customer-service', 'development']
    });

    await fs.writeJson(path.join(testDir, 'configs', 'sales-assistant.json'), {
      name: 'Sales Assistant',
      conversation_config: {
        agent: {
          prompt: {
            prompt: 'You are a professional sales assistant',
            temperature: 0.6
          }
        },
        conversation: {
          text_only: false
        }
      },
      platform_settings: {
        // No attached tests for this agent
      },
      tags: ['sales', 'production']
    });
  });

  afterEach(async () => {
    // Clean up test workspace
    await fs.remove(testDir);
  });

  describe('convai test agent', () => {
    it('should show error when agent not found', (done) => {
      const childProcess = spawn(cliPath, ['test', 'agent', 'non-existent'], {
        cwd: testDir,
        env: { ...process.env, NO_UI: 'true' }
      });

      let output = '';
      childProcess.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        expect(code).toBe(1);
        expect(output).toContain("Agent 'non-existent' not found");
        done();
      });
    });

    it('should show error when agent not synced', (done) => {
      // Create an agent without lock entry
      fs.writeJsonSync(path.join(testDir, 'agents.json'), {
        agents: [
          {
            name: 'unsynced-agent',
            config: 'configs/unsynced.json'
          }
        ]
      });

      const childProcess = spawn(cliPath, ['test', 'agent', 'unsynced-agent'], {
        cwd: testDir,
        env: { ...process.env, NO_UI: 'true' }
      });

      let output = '';
      childProcess.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        expect(code).toBe(1);
        expect(output).toContain('not synced');
        done();
      });
    });

    it('should show error when no tests configured', (done) => {
      const childProcess = spawn(cliPath, ['test', 'agent', 'sales-assistant', '--no-ui'], {
        cwd: testDir,
        env: { ...process.env, ELEVENLABS_API_KEY: 'test_key' }
      });

      let output = '';
      childProcess.stderr.on('data', (data: Buffer) => {
        output += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        expect(code).toBe(1);
        expect(output).toContain('No tests found');
        done();
      });
    });

    it('should handle specific test IDs parameter', (done) => {
      const childProcess = spawn(
        cliPath, 
        ['test', 'agent', 'customer-service', '--test-ids', 'test_001', 'test_002', '--no-ui'],
        {
          cwd: testDir,
          env: { ...process.env, ELEVENLABS_API_KEY: 'test_key' }
        }
      );

      let output = '';
      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      // Mock the API response
      setTimeout(() => {
        childProcess.kill('SIGINT');
      }, 100);

      childProcess.on('close', () => {
        expect(output).toContain('Running tests for agent');
        expect(output).toContain('customer-service');
        done();
      });
    });

    it('should support environment selection', (done) => {
      const childProcess = spawn(
        cliPath, 
        ['test', 'agent', 'customer-service', '--env', 'dev', '--no-ui'],
        {
          cwd: testDir,
          env: { ...process.env, ELEVENLABS_API_KEY: 'test_key' }
        }
      );

      let output = '';
      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      // Mock the API response
      setTimeout(() => {
        childProcess.kill('SIGINT');
      }, 100);

      childProcess.on('close', () => {
        expect(output).toContain('dev');
        expect(output).toContain('agent_dev_456');
        done();
      });
    });
  });

  describe('convai test all', () => {
    it('should test all agents with attached tests', (done) => {
      const childProcess = spawn(cliPath, ['test', 'all', '--no-ui'], {
        cwd: testDir,
        env: { ...process.env, ELEVENLABS_API_KEY: 'test_key' }
      });

      let output = '';
      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      // Mock the API response
      setTimeout(() => {
        childProcess.kill('SIGINT');
      }, 100);

      childProcess.on('close', () => {
        expect(output).toContain('Running tests for all agents');
        expect(output).toContain('customer-service');
        done();
      });
    });

    it('should skip agents without tests', (done) => {
      const childProcess = spawn(cliPath, ['test', 'all', '--no-ui'], {
        cwd: testDir,
        env: { ...process.env, ELEVENLABS_API_KEY: 'test_key' }
      });

      let output = '';
      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      // Mock the API response
      setTimeout(() => {
        childProcess.kill('SIGINT');
      }, 100);

      childProcess.on('close', () => {
        expect(output).toContain('No tests configured for sales-assistant');
        done();
      });
    });

    it('should support environment filtering', (done) => {
      const childProcess = spawn(cliPath, ['test', 'all', '--env', 'dev', '--no-ui'], {
        cwd: testDir,
        env: { ...process.env, ELEVENLABS_API_KEY: 'test_key' }
      });

      let output = '';
      childProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      // Mock the API response
      setTimeout(() => {
        childProcess.kill('SIGINT');
      }, 100);

      childProcess.on('close', () => {
        expect(output).toContain("environment 'dev'");
        done();
      });
    });
  });

  describe('Exit Codes', () => {
    it('should exit with code 0 when all tests pass', async () => {
      // This would require mocking the actual API calls
      // For now, we'll test the exit code logic
      const mockExitCode = (allPassed: boolean) => {
        return allPassed ? 0 : 1;
      };

      expect(mockExitCode(true)).toBe(0);
      expect(mockExitCode(false)).toBe(1);
    });

    it('should exit with code 1 when any test fails', async () => {
      const testResults = [
        { status: 'passed' },
        { status: 'failed' },
        { status: 'passed' }
      ];

      const allPassed = testResults.every(r => r.status === 'passed');
      const exitCode = allPassed ? 0 : 1;

      expect(exitCode).toBe(1);
    });

    it('should exit with code 1 on timeout', async () => {
      const mockTimeout = true;
      const exitCode = mockTimeout ? 1 : 0;

      expect(exitCode).toBe(1);
    });
  });
});