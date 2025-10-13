/**
 * Common test helpers for pull integration tests
 * Provides shared setup, teardown, and utility functions for agents/tools/tests pull tests
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * Configuration for setting up a pull test environment
 */
export interface PullTestEnvironmentConfig {
  resourceType: 'agents' | 'tools' | 'tests';
  tempDirPrefix?: string;
}

/**
 * Result of setting up a pull test environment
 */
export interface PullTestEnvironment {
  tempDir: string;
  configPath: string;
  configsDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a temporary test environment for pull integration tests
 */
export async function setupPullTestEnvironment(
  config: PullTestEnvironmentConfig
): Promise<PullTestEnvironment> {
  const { resourceType, tempDirPrefix } = config;
  const prefix = tempDirPrefix || `${resourceType}-pull-test-`;
  
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const configPath = path.join(tempDir, `${resourceType}.json`);
  
  // Convert plural to singular + '_configs'
  const singularType = resourceType === 'agents' ? 'agent' :
                       resourceType === 'tools' ? 'tool' :
                       'test';
  const configsDir = path.join(tempDir, `${singularType}_configs`);
  
  await fs.ensureDir(configsDir);
  
  return {
    tempDir,
    configPath,
    configsDir,
    cleanup: async () => {
      await fs.remove(tempDir);
    },
  };
}

/**
 * Sets up common mocks for ElevenLabs API, config, and OS modules
 */
export function setupCommonMocks(
  mockedConfig: any,
  mockedOs: any,
  mockedElevenLabsApi: any
): ElevenLabsClient {
  mockedOs.homedir.mockReturnValue("/mock/home");
  mockedConfig.getApiKey.mockResolvedValue("test-api-key");
  mockedConfig.isLoggedIn.mockResolvedValue(true);
  mockedConfig.getResidency.mockResolvedValue("us");
  
  const mockClient = {} as ElevenLabsClient;
  mockedElevenLabsApi.getElevenLabsClient.mockResolvedValue(mockClient);
  
  return mockClient;
}

/**
 * Clears all mocks (useful in afterEach)
 */
export function clearAllMocks(): void {
  jest.clearAllMocks();
}

/**
 * Creates a standard beforeEach setup for pull tests
 */
export function createBeforeEachSetup(
  config: PullTestEnvironmentConfig,
  mockedConfig: any,
  mockedOs: any,
  mockedElevenLabsApi: any
): () => Promise<PullTestEnvironment> {
  return async () => {
    const env = await setupPullTestEnvironment(config);
    setupCommonMocks(mockedConfig, mockedOs, mockedElevenLabsApi);
    return env;
  };
}

/**
 * Creates a standard afterEach cleanup for pull tests
 */
export function createAfterEachCleanup(
  env: () => PullTestEnvironment
): () => Promise<void> {
  return async () => {
    await env().cleanup();
    clearAllMocks();
  };
}

