import { generateUniqueFilename } from "../utils";
import fs from "fs-extra";
import path from "path";
import os from "os";

/**
 * Integration tests for filename generation during pull operations.
 * These tests simulate the real-world scenario of pulling multiple agents/tools/tests
 * with the same or similar names.
 */
describe("Filename Generation Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-pull-"));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it("should handle pulling multiple agents with the same name", async () => {
    // Simulate pulling 3 agents all named "Customer Support"
    const agentName = "Customer Support";
    
    const file1 = await generateUniqueFilename(tempDir, agentName);
    await fs.writeFile(file1, JSON.stringify({ name: agentName, id: "agent1" }));
    
    const file2 = await generateUniqueFilename(tempDir, agentName);
    await fs.writeFile(file2, JSON.stringify({ name: agentName, id: "agent2" }));
    
    const file3 = await generateUniqueFilename(tempDir, agentName);
    await fs.writeFile(file3, JSON.stringify({ name: agentName, id: "agent3" }));
    
    // Verify files are created with proper naming
    expect(file1).toBe(path.join(tempDir, "Customer-Support.json"));
    expect(file2).toBe(path.join(tempDir, "Customer-Support-1.json"));
    expect(file3).toBe(path.join(tempDir, "Customer-Support-2.json"));
    
    // Verify all files exist
    expect(await fs.pathExists(file1)).toBe(true);
    expect(await fs.pathExists(file2)).toBe(true);
    expect(await fs.pathExists(file3)).toBe(true);
  });

  it("should handle agents with problematic characters in names", async () => {
    const agents = [
      { name: "Agent/Test", expected: "Agent-Test.json" },
      { name: "Agent:Production", expected: "Agent-Production.json" },
      { name: "Agent*Beta", expected: "Agent-Beta.json" },
      { name: "Agent?", expected: "Agent.json" },
      { name: "Agent<Dev>", expected: "Agent-Dev.json" },
    ];

    const files = [];
    for (const agent of agents) {
      const file = await generateUniqueFilename(tempDir, agent.name);
      await fs.writeFile(file, JSON.stringify({ name: agent.name }));
      files.push(file);
      expect(path.basename(file)).toBe(agent.expected);
    }

    // Verify all files were created
    for (const file of files) {
      expect(await fs.pathExists(file)).toBe(true);
    }
  });

  it("should handle mixed scenario with duplicates and special chars", async () => {
    // Simulate pulling agents with various naming conflicts
    const pulls = [
      { name: "My Agent", expected: "My-Agent.json" },
      { name: "My Agent", expected: "My-Agent-1.json" },
      { name: "My/Agent", expected: "My-Agent-2.json" }, // Sanitizes to "My-Agent", conflicts with above
      { name: "My\\Agent", expected: "My-Agent-3.json" }, // Same sanitization
      { name: "Another Agent", expected: "Another-Agent.json" },
      { name: "Another Agent", expected: "Another-Agent-1.json" },
    ];

    for (const pull of pulls) {
      const file = await generateUniqueFilename(tempDir, pull.name);
      await fs.writeFile(file, JSON.stringify({ name: pull.name }));
      expect(path.basename(file)).toBe(pull.expected);
    }
  });

  it("should handle pulling tools with unicode names", async () => {
    const tools = [
      { name: "Webhook 测试", expected: "Webhook-测试.json" },
      { name: "API Tool 🚀", expected: "API-Tool-🚀.json" },
      { name: "Инструмент", expected: "Инструмент.json" },
    ];

    for (const tool of tools) {
      const file = await generateUniqueFilename(tempDir, tool.name);
      await fs.writeFile(file, JSON.stringify({ name: tool.name }));
      expect(path.basename(file)).toBe(tool.expected);
    }
  });

  it("should handle edge case names that become 'unnamed' after sanitization", async () => {
    const edgeCases = [
      { name: "", expected: "unnamed.json" },
      { name: "   ", expected: "unnamed.json" },
      { name: "***", expected: "unnamed.json" },
      { name: "///", expected: "unnamed.json" },
    ];

    // First one gets "unnamed.json"
    const file1 = await generateUniqueFilename(tempDir, edgeCases[0].name);
    await fs.writeFile(file1, "{}");
    expect(path.basename(file1)).toBe("unnamed.json");

    // Rest should get numbered variants
    const file2 = await generateUniqueFilename(tempDir, edgeCases[1].name);
    await fs.writeFile(file2, "{}");
    expect(path.basename(file2)).toBe("unnamed-1.json");

    const file3 = await generateUniqueFilename(tempDir, edgeCases[2].name);
    await fs.writeFile(file3, "{}");
    expect(path.basename(file3)).toBe("unnamed-2.json");

    const file4 = await generateUniqueFilename(tempDir, edgeCases[3].name);
    expect(path.basename(file4)).toBe("unnamed-3.json");
  });

  it("should maintain incrementing counter even with gaps in sequence", async () => {
    const name = "Test Agent";
    
    // Create Agent.json and Agent-2.json (deliberately skip Agent-1.json)
    await fs.writeFile(path.join(tempDir, "Test-Agent.json"), "{}");
    await fs.writeFile(path.join(tempDir, "Test-Agent-2.json"), "{}");
    
    // Next pull should create Agent-1.json (fills the gap)
    const file1 = await generateUniqueFilename(tempDir, name);
    expect(path.basename(file1)).toBe("Test-Agent-1.json");
    await fs.writeFile(file1, "{}");
    
    // Next pull should create Agent-3.json
    const file2 = await generateUniqueFilename(tempDir, name);
    expect(path.basename(file2)).toBe("Test-Agent-3.json");
  });
});

