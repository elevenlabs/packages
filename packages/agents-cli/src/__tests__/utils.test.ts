import { calculateConfigHash, toCamelCaseKeys } from "../utils";

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
});
