import { describe, expect, it } from "vitest";

import { constructOverrides } from "./overrides.js";

describe("constructOverrides", () => {
  it.each([
    "eleven_turbo_v2",
    "eleven_turbo_v2_5",
    "eleven_flash_v2",
    "eleven_flash_v2_5",
    "eleven_multilingual_v2",
    "eleven_v3_conversational",
  ] as const)("serializes TTS model %s as model_id", modelId => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: { tts: { modelId } },
    });

    expect(
      JSON.parse(JSON.stringify(event)).conversation_config_override.tts
    ).toEqual({ model_id: modelId });
  });

  it("preserves existing TTS overrides alongside model_id", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          modelId: "eleven_v3_conversational",
          voiceId: "voice_123",
          speed: 1.2,
          stability: 0.5,
          similarityBoost: 0.8,
        },
      },
    });

    expect(
      JSON.parse(JSON.stringify(event)).conversation_config_override.tts
    ).toEqual({
      model_id: "eleven_v3_conversational",
      voice_id: "voice_123",
      speed: 1.2,
      stability: 0.5,
      similarity_boost: 0.8,
    });
  });

  it.each([
    { tts: { voiceId: "voice_123" } },
    { tts: {} },
    { tts: { modelId: undefined } },
    { agent: { firstMessage: "Hello" } },
  ])(
    "omits model_id from the serialized payload when unspecified (%j)",
    overrides => {
      const event = constructOverrides({ agentId: "agent_123", overrides });

      expect(
        JSON.parse(JSON.stringify(event)).conversation_config_override.tts
      ).not.toHaveProperty("model_id");
    }
  );

  it("omits conversation_config_override when no overrides are provided", () => {
    const event = constructOverrides({ agentId: "agent_123" });

    expect(JSON.parse(JSON.stringify(event))).not.toHaveProperty(
      "conversation_config_override"
    );
  });

  it("includes asr keywords in conversation_config_override", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        asr: {
          keywords: ["Cvent", "registration"],
        },
      },
    });

    expect(event.conversation_config_override?.asr?.keywords).toEqual([
      "Cvent",
      "registration",
    ]);
  });

  it("omits asr when keywords are not provided", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        agent: {
          firstMessage: "Hello",
        },
      },
    });

    expect(event.conversation_config_override?.asr).toBeUndefined();
  });

  it("includes asr with an empty keywords array when explicitly provided", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        asr: {
          keywords: [],
        },
      },
    });

    expect(event.conversation_config_override?.asr?.keywords).toEqual([]);
  });
});
