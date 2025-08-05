/**
 * Tests for widget generation logic with residency support
 */

import { getResidency, setResidency } from '../config';
import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock os module
jest.mock('os', () => ({
  ...(jest.requireActual('os') as typeof import('os')),
  homedir: jest.fn()
}));

const mockedOs = os as jest.Mocked<typeof os>;

/**
 * Helper function to generate widget HTML based on agent ID and residency
 * This extracts the core logic from the CLI function for testing
 */
function generateWidgetHtml(agentId: string, residency: string): string {
  let htmlSnippet = `<elevenlabs-convai agent-id="${agentId}"`;
  
  // Add server-location attribute for isolated regions
  if (residency !== 'global' && residency !== 'us') {
    htmlSnippet += ` server-location="${residency}"`;
  }
  
  htmlSnippet += `></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
  
  return htmlSnippet;
}

describe('Widget Generation Logic', () => {
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

  const testAgentId = "agent_01jz86g7nme549cza70tk39rfh";

  it('should generate widget without server-location for global residency', async () => {
    await setResidency('global');
    const residency = await getResidency();
    
    const widget = generateWidgetHtml(testAgentId, residency);
    
    expect(widget).toContain(`agent-id="${testAgentId}"`);
    expect(widget).not.toContain('server-location');
    expect(widget).toContain('<script src="https://unpkg.com/@elevenlabs/convai-widget-embed"');
  });

  it('should generate widget without server-location for us residency', async () => {
    await setResidency('us');
    const residency = await getResidency();
    
    const widget = generateWidgetHtml(testAgentId, residency);
    
    expect(widget).toContain(`agent-id="${testAgentId}"`);
    expect(widget).not.toContain('server-location');
    expect(widget).toContain('<script src="https://unpkg.com/@elevenlabs/convai-widget-embed"');
  });

  it('should generate widget with server-location for eu-residency', async () => {
    await setResidency('eu-residency');
    const residency = await getResidency();
    
    const widget = generateWidgetHtml(testAgentId, residency);
    
    expect(widget).toContain(`agent-id="${testAgentId}"`);
    expect(widget).toContain('server-location="eu-residency"');
    expect(widget).toContain('<script src="https://unpkg.com/@elevenlabs/convai-widget-embed"');
  });

  it('should generate widget with server-location for in-residency', async () => {
    await setResidency('in-residency');
    const residency = await getResidency();
    
    const widget = generateWidgetHtml(testAgentId, residency);
    
    expect(widget).toContain(`agent-id="${testAgentId}"`);
    expect(widget).toContain('server-location="in-residency"');
    expect(widget).toContain('<script src="https://unpkg.com/@elevenlabs/convai-widget-embed"');
  });

  it('should generate complete widget HTML structure', async () => {
    await setResidency('eu-residency');
    const residency = await getResidency();
    
    const widget = generateWidgetHtml(testAgentId, residency);
    
    // Check the complete expected output
    const expectedWidget = `<elevenlabs-convai agent-id="${testAgentId}" server-location="eu-residency"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>`;
    
    expect(widget).toBe(expectedWidget);
  });

  it('should handle different residency values correctly', async () => {
    const testCases = [
      { residency: 'global', shouldHaveServerLocation: false },
      { residency: 'us', shouldHaveServerLocation: false },
      { residency: 'eu-residency', shouldHaveServerLocation: true },
      { residency: 'in-residency', shouldHaveServerLocation: true }
    ];
    
    for (const testCase of testCases) {
      await setResidency(testCase.residency as 'us' | 'eu-residency' | 'in-residency' | 'global');
      const residency = await getResidency();
      const widget = generateWidgetHtml(testAgentId, residency);
      
      if (testCase.shouldHaveServerLocation) {
        expect(widget).toContain(`server-location="${testCase.residency}"`);
      } else {
        expect(widget).not.toContain('server-location');
      }
    }
  });
});