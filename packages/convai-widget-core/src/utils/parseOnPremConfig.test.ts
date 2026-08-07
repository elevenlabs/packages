import { describe, it, expect, vi, afterEach } from "vitest";
import { parseOnPremConfig } from "./parseOnPremConfig";

describe("parseOnPremConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a URL-only config when no agent config is given", () => {
    expect(parseOnPremConfig("wss://host/convai", undefined)).toEqual({
      conversationUrl: "wss://host/convai",
    });
  });

  it("maps exported agent config keys to the client SDK shape", () => {
    expect(
      parseOnPremConfig(
        "wss://host/convai",
        JSON.stringify({
          agent_config_dict: { name: "agent" },
          tools_config_list: [{ type: "webhook" }],
          override_agent_config_list: [{ language: "en" }],
          prompt_knowledge_base: ["fact"],
          post_call_transcription_webhook: {
            url: "https://example.com/t",
            hmac_secret: "0123456789abcdef",
          },
        })
      )
    ).toEqual({
      conversationUrl: "wss://host/convai",
      agentConfig: { name: "agent" },
      toolsConfigList: [{ type: "webhook" }],
      overrideAgentConfigList: [{ language: "en" }],
      promptKnowledgeBase: ["fact"],
      postCallTranscriptionWebhook: {
        url: "https://example.com/t",
        hmacSecret: "0123456789abcdef",
      },
      postCallAudioWebhook: undefined,
    });
  });

  it("accepts the alternate export key names", () => {
    expect(
      parseOnPremConfig(
        "wss://host/convai",
        JSON.stringify({
          agent_config: { name: "agent" },
          tools_config: [{ type: "webhook" }],
          override_agent_config: [{ language: "en" }],
        })
      )
    ).toMatchObject({
      agentConfig: { name: "agent" },
      toolsConfigList: [{ type: "webhook" }],
      overrideAgentConfigList: [{ language: "en" }],
    });
  });

  it("returns null and logs on invalid JSON", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(parseOnPremConfig("wss://host/convai", "{not json")).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it.each(["null", "123", '"text"', "[1,2]"])(
    "returns null and logs when the JSON is not an object (%s)",
    json => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(parseOnPremConfig("wss://host/convai", json)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    }
  );

  it("normalizes http(s) URLs to ws(s)", () => {
    expect(parseOnPremConfig("https://host/convai", undefined)).toEqual({
      conversationUrl: "wss://host/convai",
    });
    expect(
      parseOnPremConfig("http://localhost:8000/convai", undefined)
    ).toEqual({ conversationUrl: "ws://localhost:8000/convai" });
  });

  it("drops webhooks with non-string fields", () => {
    expect(
      parseOnPremConfig(
        "wss://host/convai",
        JSON.stringify({
          post_call_transcription_webhook: { url: 123 },
          post_call_audio_webhook: {
            url: "https://example.com/a",
            hmac_secret: 42,
          },
        })
      )
    ).toMatchObject({
      postCallTranscriptionWebhook: undefined,
      postCallAudioWebhook: { url: "https://example.com/a" },
    });
  });
});
