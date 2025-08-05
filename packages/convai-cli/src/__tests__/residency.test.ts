/**
 * Tests for residency-specific functionality
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { getElevenLabsClient } from '../elevenlabs-api';
import { setResidency, setApiKey } from '../config';
import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';

// Mock the ElevenLabsClient
jest.mock('@elevenlabs/elevenlabs-js', () => ({
  ElevenLabsClient: jest.fn().mockImplementation((options: any) => ({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey
  }))
}));

// Mock os module
jest.mock('os', () => ({
  ...(jest.requireActual('os') as typeof import('os')),
  homedir: jest.fn()
}));

const mockedOs = os as jest.Mocked<typeof os>;

describe('Residency-specific API Client', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for config
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'convai-test-'));
    // Mock os.homedir to return our temp directory
    mockedOs.homedir.mockReturnValue(tempDir);
    
    // Set a test API key
    await setApiKey('test-api-key');
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    jest.clearAllMocks();
  });

  it('should use correct API endpoint for eu-residency', async () => {
    await setResidency('eu-residency');
    
    const client = await getElevenLabsClient();
    
    expect(client).toEqual({
      baseUrl: 'https://api.eu.elevenlabs.io',
      apiKey: 'test-api-key'
    });
  });

  it('should use correct API endpoint for in-residency', async () => {
    await setResidency('in-residency');
    
    const client = await getElevenLabsClient();
    
    expect(client).toEqual({
      baseUrl: 'https://api.in.elevenlabs.io',
      apiKey: 'test-api-key'
    });
  });

  it('should use correct API endpoint for us', async () => {
    await setResidency('us');
    
    const client = await getElevenLabsClient();
    
    expect(client).toEqual({
      baseUrl: 'https://api.us.elevenlabs.io',
      apiKey: 'test-api-key'
    });
  });

  it('should use correct API endpoint for global (default)', async () => {
    await setResidency('global');
    
    const client = await getElevenLabsClient();
    
    expect(client).toEqual({
      baseUrl: 'https://api.elevenlabs.io',
      apiKey: 'test-api-key'
    });
  });

  it('should use global endpoint when no residency is set', async () => {
    // Don't set residency, should default to global
    const client = await getElevenLabsClient();
    
    expect(client).toEqual({
      baseUrl: 'https://api.elevenlabs.io',
      apiKey: 'test-api-key'
    });
  });

  it('should throw error when no API key is found', async () => {
    // Remove API key
    delete process.env.ELEVENLABS_API_KEY;
    
    // Clear the temp directory to remove any stored config
    await fs.remove(tempDir);
    await fs.mkdtemp(path.join(os.tmpdir(), 'convai-test-'));
    mockedOs.homedir.mockReturnValue(tempDir);

    await expect(getElevenLabsClient()).rejects.toThrow("No API key found. Use 'convai login' to authenticate or set ELEVENLABS_API_KEY environment variable.");
  });
});