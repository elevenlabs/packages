import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { VoiceConversation } from "./VoiceConversation.js";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import type { InputController } from "./InputController.js";
import type { OutputController } from "./OutputController.js";
import type { AgentAudioEvent } from "./utils/events.js";

const noopInput = {
  close: vi.fn(),
  setDevice: vi.fn(),
  setMuted: vi.fn(),
  isMuted: () => false,
  getAnalyser: () => undefined,
  getVolume: () => 0,
  getByteFrequencyData: () => {},
} satisfies InputController;

const noopOutput = {
  close: vi.fn(),
  setDevice: vi.fn(),
  setVolume: vi.fn(),
  interrupt: vi.fn(),
  getAnalyser: () => undefined,
  getVolume: () => 0,
  getByteFrequencyData: () => {},
} satisfies OutputController;

export class TestVoiceConversation extends VoiceConversation {
  public static create(
    options: Partial<Options> = {},
    connection: BaseConnection = {
      conversationId: "test-conversation-id",
      inputFormat: { format: "pcm", sampleRate: 16000 },
      outputFormat: { format: "pcm", sampleRate: 16000 },
      onMessage: () => {},
      onDisconnect: () => {},
      onModeChange: () => {},
      close: () => {},
      sendMessage: () => {},
    } as unknown as BaseConnection
  ) {
    const fullOptions = BaseConversation.getFullOptions({
      agentId: "test-agent-id",
      connectionType: "webrtc",
      ...options,
    } as PartialOptions);

    return new TestVoiceConversation(
      fullOptions,
      connection,
      noopInput,
      noopOutput,
      null,
      async () => {}
    );
  }

  public handleAudioEvent(event: AgentAudioEvent) {
    this.handleAudio(event);
  }

  public simulateInterruption(eventId: number) {
    this.handleInterruption({
      type: "interruption",
      interruption_event: { event_id: eventId },
    });
  }
}

describe("VoiceConversation", () => {
  const alignment = {
    chars: ["H", "e", "l", "l", "o"],
    char_start_times_ms: [0, 80, 160, 240, 320],
    char_durations_ms: [80, 80, 80, 80, 120],
  };

  it("fires onAudioAlignment when an audio event includes alignment data", () => {
    const onAudioAlignment = vi.fn();
    const conversation = TestVoiceConversation.create({ onAudioAlignment });

    conversation.handleAudioEvent({
      type: "audio",
      audio_event: {
        audio_base_64: "dGVzdA==",
        event_id: 10,
        alignment,
      },
    });

    expect(onAudioAlignment).toHaveBeenCalledWith(alignment);
  });

  it("does not fire onAudioAlignment for stale events after an interruption", () => {
    const onAudioAlignment = vi.fn();
    const conversation = TestVoiceConversation.create({ onAudioAlignment });

    conversation.simulateInterruption(20);
    conversation.handleAudioEvent({
      type: "audio",
      audio_event: {
        audio_base_64: "dGVzdA==",
        event_id: 5,
        alignment,
      },
    });

    expect(onAudioAlignment).not.toHaveBeenCalled();
  });

  it("fires onAudioAlignment without calling onAudio when audio_base_64 is omitted", () => {
    const onAudioAlignment = vi.fn();
    const onAudio = vi.fn();
    const conversation = TestVoiceConversation.create({
      onAudioAlignment,
      onAudio,
    });

    conversation.handleAudioEvent({
      type: "audio",
      audio_event: {
        audio_base_64: "",
        event_id: 11,
        alignment,
      },
    });

    expect(onAudioAlignment).toHaveBeenCalledWith(alignment);
    expect(onAudio).not.toHaveBeenCalled();
  });
});

describe("VoiceConversation WebSocket integration", () => {
  const alignment = {
    chars: ["A", "B"],
    char_start_times_ms: [0, 100],
    char_durations_ms: [100, 100],
  };

  let listeners: Map<string, ((event: { data: string }) => void)[]>;
  let mockSocket: Record<string, unknown>;

  beforeEach(() => {
    listeners = new Map();
    mockSocket = {
      addEventListener: vi.fn(
        (type: string, handler: (event: { data: string }) => void) => {
          if (!listeners.has(type)) listeners.set(type, []);
          listeners.get(type)!.push(handler);
        }
      ),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
    };
    vi.stubGlobal(
      "WebSocket",
      vi.fn(function WebSocket() {
        return mockSocket;
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delivers onAudioAlignment over WebSocket", async () => {
    const { WebSocketConnection } =
      await import("./utils/WebSocketConnection.js");
    const onAudioAlignment = vi.fn();

    const promise = WebSocketConnection.create({
      agentId: "test-agent",
      connectionType: "websocket",
    });

    for (const handler of listeners.get("open") ?? []) {
      handler({ data: "" });
    }
    for (const handler of listeners.get("message") ?? []) {
      handler({
        data: JSON.stringify({
          type: "conversation_initiation_metadata",
          conversation_initiation_metadata_event: {
            conversation_id: "test-conv-id",
            agent_output_audio_format: "pcm_16000",
            user_input_audio_format: "pcm_16000",
          },
        }),
      });
    }

    const connection = await promise;
    TestVoiceConversation.create({ onAudioAlignment }, connection);

    for (const handler of listeners.get("message") ?? []) {
      handler({
        data: JSON.stringify({
          type: "audio",
          audio_event: {
            audio_base_64: "dGVzdA==",
            event_id: 12,
            alignment,
          },
        }),
      });
    }

    expect(onAudioAlignment).toHaveBeenCalledWith(alignment);
    connection.close();
  });
});
