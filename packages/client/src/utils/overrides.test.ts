import { describe, expect, it } from "vitest";

import { constructOverrides } from "./overrides.js";

describe("constructOverrides", () => {
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

  it("maps tts modelId to model_id in conversation_config_override", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          voiceId: "voice_123",
          modelId: "eleven_flash_v2_5",
        },
      },
    });

    expect(event.conversation_config_override?.tts).toMatchObject({
      voice_id: "voice_123",
      model_id: "eleven_flash_v2_5",
    });
  });

  it("leaves tts model_id undefined when modelId is not provided", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          voiceId: "voice_123",
        },
      },
    });

    expect(event.conversation_config_override?.tts?.model_id).toBeUndefined();
  });

  it("maps tts cloneStrength to clone_strength in conversation_config_override", () => {
    const event = constructOverrides({
      agentId: "agent_123",
      overrides: {
        tts: {
          cloneStrength: 0.4,
        },
      },
    });

    expect(event.conversation_config_override?.tts?.clone_strength).toBe(0.4);
  });
});
