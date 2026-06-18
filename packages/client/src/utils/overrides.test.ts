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
});
