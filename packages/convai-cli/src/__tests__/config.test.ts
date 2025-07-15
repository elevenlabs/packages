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
  setDefaultEnvironment
} from '../config';

// Mock os module
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn()
}));

const mockedOs = os as jest.Mocked<typeof os>;

describe('Config Management', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for config
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'convai-test-'));
    // Mock os.homedir to return our temp directory
    mockedOs.homedir.mockReturnValue(tempDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
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

      expect(loaded).toEqual(config);
    });

    it('should return empty config if file does not exist', async () => {
      const config = await loadConfig();
      expect(config).toEqual({});
    });

    it('should create config directory if it does not exist', async () => {
      const config = { apiKey: 'test' };
      await saveConfig(config);

      const configPath = path.join(tempDir, '.convai', 'config.json');
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
    });

    it('should check login status correctly', async () => {
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
});