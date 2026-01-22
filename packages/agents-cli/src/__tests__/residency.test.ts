/**
 * Tests for residency-specific functionality
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { getElevenLabsClient } from "../elevenlabs-api";
import { setResidency, setApiKey } from "../config";
import {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  jest,
} from "@jest/globals";

// Mock the ElevenLabsClient
jest.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: jest.fn().mockImplementation((options: unknown) => {
    const opts = options as { baseUrl?: string; apiKey: string };
    return {
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
    };
  }),
}));

// Mock os module
jest.mock("os", () => ({
  ...(jest.requireActual("os") as typeof import("os")),
  homedir: jest.fn(),
}));

// Mock auth module for better isolation
jest.mock("../auth", () => {
  let storedApiKey: string | undefined;
  return {
    storeApiKey: jest.fn().mockImplementation((key: unknown) => {
      storedApiKey = key as string;
      return Promise.resolve();
    }),
    retrieveApiKey: jest.fn().mockImplementation(() => {
      return Promise.resolve(storedApiKey);
    }),
    removeApiKey: jest.fn().mockImplementation(() => {
      storedApiKey = undefined;
      return Promise.resolve();
    }),
    hasApiKey: jest.fn().mockImplementation(() => {
      return Promise.resolve(!!storedApiKey);
    }),
  };
});

const mockedOs = os as jest.Mocked<typeof os>;

describe("Residency-specific API Client", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for config
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-test-"));
    // Mock os.homedir to return our temp directory
    mockedOs.homedir.mockReturnValue(tempDir);

    // Set a test API key
    await setApiKey("test-api-key");
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
    // Clear environment variables
    delete process.env.ELEVENLABS_API_KEY;
    jest.clearAllMocks();
  });

  it("should use correct API endpoint for eu-residency", async () => {
    await setResidency("eu-residency");

    const client = await getElevenLabsClient();

    expect(client).toEqual({
      baseUrl: "https://api.eu.residency.elevenlabs.io",
      apiKey: "test-api-key",
    });
  });

  it("should use correct API endpoint for in-residency", async () => {
    await setResidency("in-residency");

    const client = await getElevenLabsClient();

    expect(client).toEqual({
      baseUrl: "https://api.in.residency.elevenlabs.io",
      apiKey: "test-api-key",
    });
  });

  it("should use correct API endpoint for us", async () => {
    await setResidency("us");

    const client = await getElevenLabsClient();

    expect(client).toEqual({
      baseUrl: "https://api.us.elevenlabs.io",
      apiKey: "test-api-key",
    });
  });

  it("should use correct API endpoint for global (default)", async () => {
    await setResidency("global");

    const client = await getElevenLabsClient();

    expect(client).toEqual({
      baseUrl: "https://api.elevenlabs.io",
      apiKey: "test-api-key",
    });
  });

  it("should use global endpoint when no residency is set", async () => {
    // Don't set residency, should default to global
    const client = await getElevenLabsClient();

    expect(client).toEqual({
      baseUrl: "https://api.elevenlabs.io",
      apiKey: "test-api-key",
    });
  });

  it("should throw error when no API key is found", async () => {
    // Remove API key from environment
    delete process.env.ELEVENLABS_API_KEY;

    // Clear the stored API key from the mocked auth module
    const { removeApiKey } = await import("../config");
    await removeApiKey();

    // Clear the temp directory to remove any stored config
    await fs.remove(tempDir);

    // Create a new empty temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agents-test-"));
    mockedOs.homedir.mockReturnValue(tempDir);

    await expect(getElevenLabsClient()).rejects.toThrow(
      "No API key found for environment 'prod'. Use 'agents login --env prod' to authenticate or set ELEVENLABS_API_KEY environment variable."
    );
  });
});
