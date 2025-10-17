import { calculateConfigHash, toCamelCaseKeys, generateUniqueFilename } from "../utils";
import fs from "fs-extra";
import path from "path";
import os from "os";

describe("Utils", () => {
  describe("calculateConfigHash", () => {
    it("should generate consistent hashes for the same object", () => {
      const config = { name: "test", value: 123 };
      const hash1 = calculateConfigHash(config);
      const hash2 = calculateConfigHash(config);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
    });

    it("should generate different hashes for different objects", () => {
      const config1 = { name: "test1", value: 123 };
      const config2 = { name: "test2", value: 123 };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate same hash regardless of key order", () => {
      const config1 = { name: "test", value: 123, enabled: true };
      const config2 = { enabled: true, value: 123, name: "test" };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).toBe(hash2);
    });

    it("should detect prompt value changes in agent configs", () => {
      const config1 = {
        name: "Test Agent",
        conversation_config: {
          agent: {
            prompt: {
              prompt: "You are a helpful assistant.",
              temperature: 0.5,
            },
          },
        },
      };

      const config2 = {
        name: "Test Agent",
        conversation_config: {
          agent: {
            prompt: {
              prompt: "You are a different assistant.",
              temperature: 0.5,
            },
          },
        },
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate same hash for identical nested configs with different key orders", () => {
      const config1 = {
        name: "Test Agent",
        conversation_config: {
          agent: {
            prompt: {
              prompt: "You are a helpful assistant.",
              temperature: 0.5,
              max_tokens: 1000,
            },
            language: "en",
          },
          tts: {
            voice_id: "abc123",
            model_id: "turbo",
          },
        },
      };

      const config2 = {
        conversation_config: {
          tts: {
            model_id: "turbo",
            voice_id: "abc123",
          },
          agent: {
            language: "en",
            prompt: {
              max_tokens: 1000,
              temperature: 0.5,
              prompt: "You are a helpful assistant.",
            },
          },
        },
        name: "Test Agent",
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).toBe(hash2);
    });

    it("should detect subtle changes in nested values", () => {
      const config1 = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: "Hello",
              temperature: 0.5,
            },
          },
        },
      };

      const config2 = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: "Hello ", // Extra space
              temperature: 0.5,
            },
          },
        },
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle deep nesting with mixed data types", () => {
      const config1 = {
        platform_settings: {
          widget: {
            styles: {
              base: null,
              accent: "#ff0000",
            },
            text_contents: {
              labels: ["start", "stop"],
              enabled: true,
            },
          },
        },
      };

      const config2 = {
        platform_settings: {
          widget: {
            text_contents: {
              enabled: true,
              labels: ["start", "stop"],
            },
            styles: {
              accent: "#ff0000",
              base: null,
            },
          },
        },
      };

      const hash1 = calculateConfigHash(config1);
      const hash2 = calculateConfigHash(config2);

      expect(hash1).toBe(hash2);
    });
  });

  describe("toCamelCaseKeys", () => {
    it("should convert snake_case keys to camelCase", () => {
      const input = {
        snake_case_key: "value",
        another_key: "another_value",
      };

      const result = toCamelCaseKeys(input);

      expect(result).toEqual({
        snakeCaseKey: "value",
        anotherKey: "another_value",
      });
    });

    it("should convert kebab-case keys to camelCase", () => {
      const input = {
        "kebab-case-key": "value",
        "another-key": "another_value",
      };

      const result = toCamelCaseKeys(input);

      expect(result).toEqual({
        kebabCaseKey: "value",
        anotherKey: "another_value",
      });
    });

    it("should preserve HTTP header names in request_headers arrays", () => {
      const input = {
        some_config: {
          request_headers: [
            {
              type: "value",
              name: "Content-Type",
              value: "application/json",
            },
            {
              type: "value",
              name: "X-Api-Key",
              value: "secret",
            },
            {
              type: "value",
              name: "Authorization",
              value: "Bearer token",
            },
          ],
        },
      };

      const result = toCamelCaseKeys(input);

      expect(result).toEqual({
        someConfig: {
          requestHeaders: [
            {
              type: "value",
              name: "Content-Type", // Should NOT be converted to contentType
              value: "application/json",
            },
            {
              type: "value",
              name: "X-Api-Key", // Should NOT be converted to xApiKey
              value: "secret",
            },
            {
              type: "value",
              name: "Authorization", // Should NOT be converted to authorization
              value: "Bearer token",
            },
          ],
        },
      });
    });

    it("should handle nested objects with request_headers", () => {
      const input = {
        conversation_config: {
          tools: [
            {
              tool_name: "webhook",
              api_schema: {
                request_headers: [
                  {
                    type: "value",
                    name: "Content-Type",
                    value: "application/json",
                  },
                ],
              },
            },
          ],
        },
      };

      const result = toCamelCaseKeys(input);

      expect(result).toEqual({
        conversationConfig: {
          tools: [
            {
              toolName: "webhook",
              apiSchema: {
                requestHeaders: [
                  {
                    type: "value",
                    name: "Content-Type", // Header name preserved
                    value: "application/json",
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it("should preserve secret_id and other keys in request_headers object format", () => {
      const input = {
        conversation_config: {
          agent: {
            prompt: {
              tools: [
                {
                  type: "webhook",
                  api_schema: {
                    url: "https://example.com/webhook",
                    method: "GET",
                    request_headers: {
                      "Content-Type": "application/json",
                      "X-Api-Key": {
                        secret_id: "abc"
                      },
                      "foo_bar": "baz"
                    }
                  }
                }
              ]
            }
          }
        }
      };

      const result = toCamelCaseKeys(input);

      expect(result).toEqual({
        conversationConfig: {
          agent: {
            prompt: {
              tools: [
                {
                  type: "webhook",
                  apiSchema: {
                    url: "https://example.com/webhook",
                    method: "GET",
                    requestHeaders: {
                      "Content-Type": "application/json",
                      "X-Api-Key": {
                        secret_id: "abc" // Should NOT be converted to secretId
                      },
                      "foo_bar": "baz" // Should NOT be converted to fooBar
                    }
                  }
                }
              ]
            }
          }
        }
      });
    });

    it("should still convert other name fields that are not in request_headers", () => {
      const input = {
        user_name: "john",
        config: {
          display_name: "John Doe",
        },
      };

      const result = toCamelCaseKeys(input);

      expect(result).toEqual({
        userName: "john",
        config: {
          displayName: "John Doe",
        },
      });
    });
  });

  describe("generateUniqueFilename", () => {
    let tempDir: string;

    beforeEach(async () => {
      // Create a temporary directory for testing
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-filename-"));
    });

    afterEach(async () => {
      // Clean up temp directory
      await fs.remove(tempDir);
    });

    it("should generate filename with name for non-existent file", async () => {
      const result = await generateUniqueFilename(tempDir, "My Agent");
      expect(result).toBe(path.join(tempDir, "My-Agent.json"));
    });

    it("should sanitize special characters in filenames", async () => {
      const result = await generateUniqueFilename(tempDir, "Agent:Test/File*Name?");
      expect(result).toBe(path.join(tempDir, "Agent-Test-File-Name.json"));
    });

    it("should handle spaces in names", async () => {
      const result = await generateUniqueFilename(tempDir, "My Test Agent");
      expect(result).toBe(path.join(tempDir, "My-Test-Agent.json"));
    });

    it("should add counter when file already exists", async () => {
      // Create first file
      const firstPath = path.join(tempDir, "Agent.json");
      await fs.writeFile(firstPath, "{}");

      // Generate filename for second agent with same name
      const result = await generateUniqueFilename(tempDir, "Agent");
      expect(result).toBe(path.join(tempDir, "Agent-1.json"));
    });

    it("should increment counter for multiple duplicates", async () => {
      // Create multiple files
      await fs.writeFile(path.join(tempDir, "Agent.json"), "{}");
      await fs.writeFile(path.join(tempDir, "Agent-1.json"), "{}");
      await fs.writeFile(path.join(tempDir, "Agent-2.json"), "{}");

      const result = await generateUniqueFilename(tempDir, "Agent");
      expect(result).toBe(path.join(tempDir, "Agent-3.json"));
    });

    it("should handle empty names", async () => {
      const result = await generateUniqueFilename(tempDir, "");
      expect(result).toBe(path.join(tempDir, "unnamed.json"));
    });

    it("should handle whitespace-only names", async () => {
      const result = await generateUniqueFilename(tempDir, "   ");
      expect(result).toBe(path.join(tempDir, "unnamed.json"));
    });

    it("should handle names with only special characters", async () => {
      const result = await generateUniqueFilename(tempDir, "***//\\\\");
      expect(result).toBe(path.join(tempDir, "unnamed.json"));
    });

    it("should remove leading and trailing dots", async () => {
      const result = await generateUniqueFilename(tempDir, "...Agent...");
      // Since name starts with dots, it gets underscore prefix after cleanup
      expect(result).toBe(path.join(tempDir, "_Agent.json"));
    });

    it("should prefix names that start with dot after sanitization", async () => {
      const result = await generateUniqueFilename(tempDir, ".hidden");
      expect(result).toBe(path.join(tempDir, "_hidden.json"));
    });

    it("should truncate very long names", async () => {
      const longName = "A".repeat(150);
      const result = await generateUniqueFilename(tempDir, longName);
      const filename = path.basename(result);
      // Should be truncated to 100 chars + ".json"
      expect(filename.length).toBe(105); // 100 + ".json"
      expect(filename).toBe("A".repeat(100) + ".json");
    });

    it("should handle multiple consecutive hyphens", async () => {
      const result = await generateUniqueFilename(tempDir, "Agent---Test");
      expect(result).toBe(path.join(tempDir, "Agent-Test.json"));
    });

    it("should handle Unicode characters", async () => {
      const result = await generateUniqueFilename(tempDir, "Agent 测试 🚀");
      expect(result).toBe(path.join(tempDir, "Agent-测试-🚀.json"));
    });

    it("should use custom extension when provided", async () => {
      const result = await generateUniqueFilename(tempDir, "Agent", ".txt");
      expect(result).toBe(path.join(tempDir, "Agent.txt"));
    });

    it("should handle duplicate detection with custom extension", async () => {
      await fs.writeFile(path.join(tempDir, "Agent.txt"), "test");
      const result = await generateUniqueFilename(tempDir, "Agent", ".txt");
      expect(result).toBe(path.join(tempDir, "Agent-1.txt"));
    });

    it("should handle names with leading/trailing hyphens", async () => {
      const result = await generateUniqueFilename(tempDir, "-Agent-");
      expect(result).toBe(path.join(tempDir, "Agent.json"));
    });

    it("should create different files for agents with same name after sanitization", async () => {
      const name1 = "My/Agent";
      const name2 = "My\\Agent";
      const name3 = "My:Agent";

      const result1 = await generateUniqueFilename(tempDir, name1);
      await fs.writeFile(result1, "{}");

      const result2 = await generateUniqueFilename(tempDir, name2);
      await fs.writeFile(result2, "{}");

      const result3 = await generateUniqueFilename(tempDir, name3);

      // All should sanitize to "My-Agent", so we should get incrementing numbers
      expect(result1).toBe(path.join(tempDir, "My-Agent.json"));
      expect(result2).toBe(path.join(tempDir, "My-Agent-1.json"));
      expect(result3).toBe(path.join(tempDir, "My-Agent-2.json"));
    });
  });
});
