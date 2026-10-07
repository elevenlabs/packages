import { describe, it, expect } from "vitest";
import {
  assertRealtimeConfigSupported,
  constructRealtimeSessionUpdate,
  fromWireAudioFormat,
} from "./realtimeSession.js";
import type { RealtimeSessionConfig } from "./BaseConnection.js";

const base: RealtimeSessionConfig = {
  connectionType: "websocket-realtime",
  clientSecret: "secret",
};

describe("constructRealtimeSessionUpdate", () => {
  it("defaults to 24 kHz PCM audio output", () => {
    expect(constructRealtimeSessionUpdate(base)).toEqual({
      type: "session.update",
      session: {
        type: "realtime",
        output_modalities: ["audio"],
        audio: {
          input: { format: { type: "audio/pcm", rate: 24000 } },
          output: { format: { type: "audio/pcm", rate: 24000 } },
        },
      },
    });
  });

  it("maps every session option to its wire field", () => {
    const update = constructRealtimeSessionUpdate({
      ...base,
      realtime: {
        instructions: "Be brief.",
        voice: "marin",
        inputAudioFormat: "ulaw_8000",
        outputAudioFormat: "ulaw_8000",
        turnDetection: {
          type: "semantic_vad",
          eagerness: "high",
          interruptResponse: false,
        },
        tools: [
          {
            name: "get_weather",
            description: "Look up the weather",
            parameters: {
              type: "object",
              properties: { city: { type: "string" } },
            },
          },
        ],
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    });

    expect(update.session).toEqual({
      type: "realtime",
      output_modalities: ["audio"],
      instructions: "Be brief.",
      audio: {
        input: {
          format: { type: "audio/pcmu" },
          turn_detection: {
            type: "semantic_vad",
            eagerness: "high",
            interrupt_response: false,
          },
        },
        output: { format: { type: "audio/pcmu" }, voice: "marin" },
      },
      tools: [
        {
          type: "function",
          name: "get_weather",
          description: "Look up the weather",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
          },
        },
      ],
      temperature: 0.7,
      max_output_tokens: 512,
    });
  });

  it("sends a null turn detection for manual turn-taking", () => {
    const update = constructRealtimeSessionUpdate({
      ...base,
      realtime: { turnDetection: null },
    });

    expect(
      (update.session.audio as { input: Record<string, unknown> }).input
        .turn_detection
    ).toBeNull();
  });

  it.each([
    { textOnly: true },
    { overrides: { conversation: { textOnly: true } } },
  ])("requests text output for text-only sessions (%o)", extra => {
    const update = constructRealtimeSessionUpdate({ ...base, ...extra });

    expect(update.session.output_modalities).toEqual(["text"]);
  });
});

describe("assertRealtimeConfigSupported", () => {
  it("accepts a supported configuration", () => {
    expect(() =>
      assertRealtimeConfigSupported({
        ...base,
        textOnly: false,
        overrides: { conversation: { textOnly: false } },
        realtime: { turnDetection: { type: "semantic_vad" } },
      })
    ).not.toThrow();
  });

  it("requires a client secret", () => {
    expect(() =>
      assertRealtimeConfigSupported({ ...base, clientSecret: "" })
    ).toThrow("require a clientSecret");
  });

  it.each([
    [{ agentId: "agent_1" }, "agentId"],
    [{ signedUrl: "wss://example" }, "signedUrl"],
    [{ dynamicVariables: { name: "Ada" } }, "dynamicVariables"],
    [{ customLlmExtraBody: {} }, "customLlmExtraBody"],
    [{ userId: "user_1" }, "userId"],
    [{ overrides: { agent: { firstMessage: "Hi" } } }, "overrides.agent"],
    [{ overrides: { tts: { voiceId: "v" } } }, "overrides.tts"],
  ])("rejects %o", (extra, name) => {
    expect(() =>
      assertRealtimeConfigSupported({ ...base, ...extra } as never)
    ).toThrow(name);
  });

  it("rejects server VAD", () => {
    expect(() =>
      assertRealtimeConfigSupported({
        ...base,
        realtime: { turnDetection: { type: "server_vad" } as never },
      })
    ).toThrow('Unsupported realtime turnDetection type "server_vad"');
  });

  it("rejects unsupported audio formats", () => {
    expect(() =>
      assertRealtimeConfigSupported({
        ...base,
        realtime: { outputAudioFormat: "pcm_16000" as never },
      })
    ).toThrow('Unsupported realtime audio format "pcm_16000"');
  });

  it("rejects duplicate tool names", () => {
    expect(() =>
      assertRealtimeConfigSupported({
        ...base,
        realtime: { tools: [{ name: "a" }, { name: "a" }] },
      })
    ).toThrow('Duplicate realtime tool name "a"');
  });
});

describe("fromWireAudioFormat", () => {
  it("reads the format the server selected", () => {
    expect(
      fromWireAudioFormat({ type: "audio/pcm", rate: 24000 }, "ulaw_8000")
    ).toEqual({ format: "pcm", sampleRate: 24000 });
    expect(fromWireAudioFormat({ type: "audio/pcmu" }, "pcm_24000")).toEqual({
      format: "ulaw",
      sampleRate: 8000,
    });
  });

  it("falls back to the requested format", () => {
    expect(fromWireAudioFormat(undefined, "ulaw_8000")).toEqual({
      format: "ulaw",
      sampleRate: 8000,
    });
  });

  it("rejects A-law, which the SDK cannot play", () => {
    expect(() =>
      fromWireAudioFormat({ type: "audio/pcma" }, "pcm_24000")
    ).toThrow("unsupported audio format: audio/pcma");
  });
});
