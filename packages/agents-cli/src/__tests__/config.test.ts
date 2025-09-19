/**
 * Tests for config management
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfig,
  saveConfig,
  getApiKey,
  setApiKey,
  removeApiKey,
  isLoggedIn,
  getDefaultEnvironment,
  setDefaultEnvironment,
  getResidency,
  setResidency
} from '../config';
import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';

// Mock os module
jest.mock('os', () => ({
  ...(jest.requireActual('os') as typeof import('os')),
  homedir: jest.fn()
}));

// Mock auth module for better isolation
jest.mock('../auth', () => {
  let storedApiKey: string | undefined;
  const resetStoredApiKey = () => { storedApiKey = undefined; };
  return {
    storeApiKey: jest.fn().mockImplementation((key: unknown) => {
      storedApiKey = key as string;
      return Promise.resolve();
    }),
    retrieveApiKey: jest.fn().mockImplementation(() => {
      // Check environment variable first (same logic as real auth module)
      if (process.env.ELEVENLABS_API_KEY) {
        return Promise.resolve(process.env.ELEVENLABS_API_KEY);
      }
      return Promise.resolve(storedApiKey);
    }),
    removeApiKey: jest.fn().mockImplementation(() => {
      storedApiKey = undefined;
      return Promise.resolve();
    }),
    hasApiKey: jest.fn().mockImplementation(() => {
      // Check environment variable first (same logic as real auth module)
      if (process.env.ELEVENLABS_API_KEY) {
        return Promise.resolve(true);
      }
      return Promise.resolve(!!storedApiKey);
    }),
    __resetStoredApiKey: resetStoredApiKey
  };
});

const mockedOs = os as jest.Mocked<typeof os>;

describe('Config Management', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for config
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-test-'));
    // Mock os.homedir to return our temp directory
    mockedOs.homedir.mockReturnValue(tempDir);
    // Reset mock state
    const authMock = jest.mocked(await import('../auth.js'));
    if ('__resetStoredApiKey' in authMock && typeof authMock.__resetStoredApiKey === 'function') {
      authMock.__resetStoredApiKey();
    }
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    // Clear environment variables
    delete process.env.ELEVENLABS_API_KEY;
    jest.clearAllMocks();
  });

  describe('loadConfig and saveConfig', () => {
    it('should save and load config correctly', async () => {
      const config = {
        apiKey: 'test-key',
        defaultEnvironment: 'dev'
      };

      await saveConfig(config);
      const loaded = await loadConfig();

      // API key is not saved to config file for security
      expect(loaded).toEqual({
        defaultEnvironment: 'dev'
      });
    });

    it('should return empty config if file does not exist', async () => {
      const config = await loadConfig();
      expect(config).toEqual({});
    });

    it('should create config directory if it does not exist', async () => {
      const config = { apiKey: 'test' };
      await saveConfig(config);

      const configPath = path.join(tempDir, '.agents', 'config.json');
      const exists = await fs.pathExists(configPath);
      expect(exists).toBe(true);
    });
  });

  describe('API key management', () => {
    beforeEach(() => {
      // Clear environment variable
      delete process.env.ELEVENLABS_API_KEY;
    });

    it('should set and get API key', async () => {
      await setApiKey('test-api-key');
      const apiKey = await getApiKey();
      expect(apiKey).toBe('test-api-key');
    });

    it('should remove API key', async () => {
      await setApiKey('test-api-key');
      await removeApiKey();
      const apiKey = await getApiKey();
      expect(apiKey).toBeUndefined();
    });

    it('should prioritize environment variable over config file', async () => {
      await setApiKey('config-key');
      process.env.ELEVENLABS_API_KEY = 'env-key';

      const apiKey = await getApiKey();
      expect(apiKey).toBe('env-key');

      // Clean up environment variable
      delete process.env.ELEVENLABS_API_KEY;
    });

    it('should check login status correctly', async () => {
      // Clear any existing API key from environment
      delete process.env.ELEVENLABS_API_KEY;

      expect(await isLoggedIn()).toBe(false);

      await setApiKey('test-key');
      expect(await isLoggedIn()).toBe(true);

      await removeApiKey();
      expect(await isLoggedIn()).toBe(false);
    });

  });

  describe('Default environment management', () => {
    it('should return prod as default environment', async () => {
      const env = await getDefaultEnvironment();
      expect(env).toBe('prod');
    });

    it('should set and get default environment', async () => {
      await setDefaultEnvironment('dev');
      const env = await getDefaultEnvironment();
      expect(env).toBe('dev');
    });
  });

  describe('Residency management', () => {
    it('should return global as default residency', async () => {
      const residency = await getResidency();
      expect(residency).toBe('global');
    });

    it('should set and get residency', async () => {
      await setResidency('eu-residency');
      const residency = await getResidency();
      expect(residency).toBe('eu-residency');
    });

    it('should handle all valid residency values', async () => {
      const validResidencies = ['us', 'eu-residency', 'in-residency', 'global'] as const;
      
      for (const residencyValue of validResidencies) {
        await setResidency(residencyValue);
        const residency = await getResidency();
        expect(residency).toBe(residencyValue);
      }
    });

    it('should persist residency across config loads', async () => {
      await setResidency('in-residency');
      
      // Load config again to ensure persistence
      const config = await loadConfig();
      expect(config.residency).toBe('in-residency');
      
      const residency = await getResidency();
      expect(residency).toBe('in-residency');
    });

    it('should save residency along with other config', async () => {
      await setDefaultEnvironment('staging');
      await setResidency('eu-residency');
      
      const config = await loadConfig();
      expect(config.defaultEnvironment).toBe('staging');
      expect(config.residency).toBe('eu-residency');
    });
  });
});