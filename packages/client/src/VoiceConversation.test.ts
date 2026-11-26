import { describe, it, expect, vi } from "vitest";

import { VoiceConversation } from "./VoiceConversation.js";
import type { PartialOptions } from "./BaseConversation.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import type { InputController } from "./InputController.js";
import type {
  OutputController,
  PlaybackEventTarget,
} from "./OutputController.js";
import type { IncomingSocketEvent } from "./utils/events.js";

class TestVoiceConversation extends VoiceConversation {
  public static create(
    options: PartialOptions,
    playbackEventTarget: PlaybackEventTarget | null
  ) {
    let receive: (event: IncomingSocketEvent) => void = () => {};
    const connection = {
      conversationId: "test-conversation-id",
      onMessage: (listener: typeof receive) => (receive = listener),
      onOutgoingMessage: () => {},
      onDisconnect: () => {},
      onModeChange: () => {},
      close: () => {},
      sendMessage: () => {},
    } as unknown as BaseConnection;
    new TestVoiceConversation(
      VoiceConversation.getFullOptions(options),
      connection,
      {} as InputController,
      {} as OutputController,
      playbackEventTarget,
      async () => {}
    );
    return (event: IncomingSocketEvent) => receive(event);
  }
}

const speaker = (voiceId: string, eventId: number) => ({
  type: "agent_speaker" as const,
  agent_speaker_event: { voice_id: voiceId, event_id: eventId },
});

describe("VoiceConversation agent speaker", () => {
  it("reports a changed speaker on arrival without playback events, as on WebRTC", () => {
    const onAgentSpeakerChange = vi.fn();
    const receive = TestVoiceConversation.create(
      { agentId: "test-agent-id", onAgentSpeakerChange },
      null
    );

    receive(speaker("narrator", 1));
    receive(speaker("narrator", 2));
    receive(speaker("primary", 3));

    expect(onAgentSpeakerChange.mock.calls).toEqual([
      ["narrator"],
      ["primary"],
    ]);
  });

  it("leaves the speaker to playback when there are playback events", () => {
    const onAgentSpeakerChange = vi.fn();
    const receive = TestVoiceConversation.create(
      { agentId: "test-agent-id", onAgentSpeakerChange },
      { addListener: () => {}, removeListener: () => {} }
    );

    receive(speaker("narrator", 1));

    expect(onAgentSpeakerChange).not.toHaveBeenCalled();
  });
});
