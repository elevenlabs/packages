import { describe, it, expect } from "vitest";
import {
  constructOverrides,
  CONVERSATION_INITIATION_CLIENT_DATA_TYPE,
} from "./overrides";
import type { SessionConfig } from "./BaseConnection";

describe("constructOverrides", () => {
  const baseConfig: SessionConfig = {
    agentId: "test-agent-id",
    connectionType: "webrtc",
  };

  it("should include type in the event", () => {
    const result = constructOverrides(baseConfig);
    expect(result.type).toBe(CONVERSATION_INITIATION_CLIENT_DATA_TYPE);
  });

  describe("branch parameter", () => {
    it("should include branch when provided", () => {
      const config: SessionConfig = {
        ...baseConfig,
        branch: "feature-branch",
      };

      const result = constructOverrides(config);
      expect(result.branch).toBe("feature-branch");
    });

    it("should not include branch when not provided", () => {
      const result = constructOverrides(baseConfig);
      expect(result.branch).toBeUndefined();
    });

    it("should include branch along with other config options", () => {
      const config: SessionConfig = {
        ...baseConfig,
        branch: "my-branch",
        userId: "user-123",
        dynamicVariables: { key: "value" },
        overrides: {
          agent: {
            firstMessage: "Hello!",
            language: "en",
          },
          tts: {
            voiceId: "voice-123",
            speed: 1.2,
          },
        },
      };

      const result = constructOverrides(config);

      expect(result.branch).toBe("my-branch");
      expect(result.user_id).toBe("user-123");
      expect(result.dynamic_variables).toEqual({ key: "value" });
      expect(result.conversation_config_override?.agent?.first_message).toBe(
        "Hello!"
      );
      expect(result.conversation_config_override?.agent?.language).toBe("en");
      expect(result.conversation_config_override?.tts?.voice_id).toBe(
        "voice-123"
      );
      expect(result.conversation_config_override?.tts?.speed).toBe(1.2);
    });
  });

  describe("other config options", () => {
    it("should include user_id when provided", () => {
      const config: SessionConfig = {
        ...baseConfig,
        userId: "user-123",
      };

      const result = constructOverrides(config);
      expect(result.user_id).toBe("user-123");
    });

    it("should include dynamic_variables when provided", () => {
      const config: SessionConfig = {
        ...baseConfig,
        dynamicVariables: { name: "John", age: 30, active: true },
      };

      const result = constructOverrides(config);
      expect(result.dynamic_variables).toEqual({
        name: "John",
        age: 30,
        active: true,
      });
    });

    it("should include custom_llm_extra_body when provided", () => {
      const customBody = { temperature: 0.7, maxTokens: 100 };
      const config: SessionConfig = {
        ...baseConfig,
        customLlmExtraBody: customBody,
      };

      const result = constructOverrides(config);
      expect(result.custom_llm_extra_body).toEqual(customBody);
    });

    it("should include source_info when client overrides are provided", () => {
      const config: SessionConfig = {
        ...baseConfig,
        overrides: {
          client: {
            source: "test-source",
            version: "1.0.0",
          },
        },
      };

      const result = constructOverrides(config);
      expect(result.source_info).toEqual({
        source: "test-source",
        version: "1.0.0",
      });
    });

    it("should include conversation_config_override when overrides are provided", () => {
      const config: SessionConfig = {
        ...baseConfig,
        overrides: {
          agent: {
            prompt: { prompt: "You are a helpful assistant" },
            firstMessage: "Hello!",
            language: "fr",
          },
          tts: {
            voiceId: "voice-456",
            stability: 0.8,
            similarityBoost: 0.9,
            speed: 1.1,
          },
          conversation: {
            textOnly: true,
          },
        },
      };

      const result = constructOverrides(config);
      expect(result.conversation_config_override).toEqual({
        agent: {
          prompt: { prompt: "You are a helpful assistant" },
          first_message: "Hello!",
          language: "fr",
        },
        tts: {
          voice_id: "voice-456",
          stability: 0.8,
          similarity_boost: 0.9,
          speed: 1.1,
        },
        conversation: {
          text_only: true,
        },
      });
    });
  });
});
