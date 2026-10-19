import { describe, it, expect, vi } from "vitest";

import { VoiceConversation } from "./VoiceConversation.js";
import { BaseConversation, type PartialOptions } from "./BaseConversation.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import type { InputController } from "./InputController.js";
import type {
  OutputController,
  PlaybackEventTarget,
} from "./OutputController.js";
import type { IncomingSocketEvent } from "./utils/events.js";

const noopConnection = {
  conversationId: "test-conversation-id",
  onMessage: () => {},
  onOutgoingMessage: () => {},
  onDisconnect: () => {},
  onModeChange: () => {},
  close: () => {},
  sendMessage: () => {},
} as unknown as BaseConnection;

const noopOutput = { interrupt: () => {} } as unknown as OutputController;

class TestVoiceConversation extends VoiceConversation {
  public static create(
    options: Partial<PartialOptions>,
    playbackEventTarget: PlaybackEventTarget | null
  ): TestVoiceConversation {
    const fullOptions = BaseConversation["getFullOptions"]({
      agentId: "test-agent-id",
      ...options,
    } as PartialOptions);
    return new TestVoiceConversation(
      fullOptions,
      noopConnection,
      {} as InputController,
      noopOutput,
      playbackEventTarget,
      async () => {}
    );
  }

  public receiveMessage(event: IncomingSocketEvent) {
    return this["onMessage"](event);
  }
}

const alignment = {
  chars: ["H", "i"],
  char_start_times_ms: [0, 50],
  char_durations_ms: [50, 50],
};

function audio(eventId: number): IncomingSocketEvent {
  return {
    type: "audio",
    audio_event: { audio_base_64: "dGVzdA==", event_id: eventId, alignment },
  };
}

describe("VoiceConversation onAudioAlignmentPlayback", () => {
  it("falls back to receipt time without a playback event target (WebRTC)", async () => {
    const onAudioAlignmentPlayback = vi.fn();
    const conversation = TestVoiceConversation.create(
      { onAudioAlignmentPlayback },
      null
    );

    await conversation.receiveMessage(audio(1));
    expect(onAudioAlignmentPlayback).toHaveBeenCalledWith({
      event_id: 1,
      alignment,
    });
  });
});
