import { describe, it, expect, vi, afterEach } from "vitest";

import { VoiceConversation } from "./VoiceConversation.js";
import type { Options, PartialOptions } from "./BaseConversation.js";
import type { InputController } from "./InputController.js";
import type {
  OutputController,
  PlaybackEventTarget,
  PlaybackStateEvent,
} from "./OutputController.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import type { IncomingSocketEvent } from "./utils/events.js";
import type { Mode } from "./types.js";

const HOLD_ACTIVITY_INTERVAL_MS = 1000;

function createInput() {
  let muted = false;
  return {
    close: vi.fn(async () => {}),
    setDevice: vi.fn(async () => {}),
    setMuted: vi.fn(async (isMuted: boolean) => {
      muted = isMuted;
    }),
    isMuted: vi.fn(() => muted),
    getAnalyser: vi.fn(() => undefined),
    getVolume: vi.fn(() => 0),
    getByteFrequencyData: vi.fn(() => {}),
  };
}

function createOutput() {
  return {
    close: vi.fn(async () => {}),
    setDevice: vi.fn(async () => {}),
    setVolume: vi.fn(() => {}),
    interrupt: vi.fn(() => {}),
    getAnalyser: vi.fn(() => undefined),
    getVolume: vi.fn(() => 0),
    getByteFrequencyData: vi.fn(() => {}),
  };
}

function createPlaybackEventTarget() {
  const listeners = new Set<(event: PlaybackStateEvent) => void>();
  return {
    addListener: vi.fn((listener: (event: PlaybackStateEvent) => void) => {
      listeners.add(listener);
    }),
    removeListener: vi.fn((listener: (event: PlaybackStateEvent) => void) => {
      listeners.delete(listener);
    }),
    /** What the output worklet posts as it starts and finishes a buffer. */
    emitProgress(finished: boolean) {
      const event = {
        data: { type: "process", finished },
      } as PlaybackStateEvent;
      for (const listener of listeners) listener(event);
    },
  };
}

function createConnection() {
  return {
    conversationId: "test-conversation-id",
    onMessage: vi.fn(),
    onOutgoingMessage: vi.fn(),
    onDisconnect: vi.fn(),
    onModeChange: vi.fn(),
    close: vi.fn(),
    sendMessage: vi.fn(),
  };
}

class TestVoiceConversation extends VoiceConversation {
  public static createTest(
    partialOptions: Partial<PartialOptions> = {},
    connection: ReturnType<typeof createConnection> = createConnection(),
    input: ReturnType<typeof createInput> = createInput(),
    output: ReturnType<typeof createOutput> = createOutput(),
    playbackEventTarget: ReturnType<
      typeof createPlaybackEventTarget
    > | null = null
  ) {
    const options = super.getFullOptions({
      agentId: "test-agent-id",
      connectionType: "webrtc",
      ...partialOptions,
    } as PartialOptions);
    const conversation = new TestVoiceConversation(
      options,
      connection as unknown as BaseConnection,
      input,
      output,
      playbackEventTarget
    );
    conversation.markConnected();
    return {
      conversation,
      connection,
      input,
      output,
      playbackEventTarget,
      options,
    };
  }

  private constructor(
    options: Options,
    connection: BaseConnection,
    input: InputController,
    output: OutputController,
    playbackEventTarget: PlaybackEventTarget | null
  ) {
    super(
      options,
      connection,
      input,
      output,
      playbackEventTarget,
      async () => {}
    );
  }

  public receiveMessage(event: IncomingSocketEvent) {
    return this["onMessage"](event);
  }
}

function audioEvent(eventId: number): IncomingSocketEvent {
  return {
    type: "audio",
    audio_event: {
      audio_base_64: "AAAA",
      event_id: eventId,
    },
  } as IncomingSocketEvent;
}

/** The mode callback BaseConversation registers on the connection. */
function connectionModeListener(
  connection: ReturnType<typeof createConnection>
) {
  return connection.onModeChange.mock.calls[0]?.[0] as (mode: Mode) => void;
}

function userActivityCount(connection: ReturnType<typeof createConnection>) {
  return connection.sendMessage.mock.calls.filter(
    ([message]) => message?.type === "user_activity"
  ).length;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("VoiceConversation hold", () => {
  it("stops the agent, mutes the microphone and silences the output", () => {
    const { conversation, input, output } = TestVoiceConversation.createTest();

    expect(conversation.isOnHold()).toBe(false);
    conversation.setOnHold(true);

    expect(conversation.isOnHold()).toBe(true);
    expect(input.setMuted).toHaveBeenCalledWith(true);
    expect(output.interrupt).toHaveBeenCalledTimes(1);
    expect(output.setVolume).toHaveBeenCalledWith(0);
    // The output restores its own volume once the interrupt fade completes,
    // so the zero has to be set after the interrupt, not before it.
    expect(output.interrupt.mock.invocationCallOrder[0]).toBeLessThan(
      output.setVolume.mock.invocationCallOrder[0]
    );
  });

  it("restores the microphone and the caller's volume when released", () => {
    const { conversation, input, output } = TestVoiceConversation.createTest();
    conversation.setVolume({ volume: 0.5 });

    conversation.setOnHold(true);
    output.setVolume.mockClear();
    output.interrupt.mockClear();
    input.setMuted.mockClear();

    conversation.setOnHold(false);

    expect(conversation.isOnHold()).toBe(false);
    expect(output.setVolume).toHaveBeenCalledWith(0.5);
    expect(input.setMuted).toHaveBeenCalledWith(false);
    // Anything the agent sent while nobody was listening is dropped, and the
    // volume it comes back to is set before the flush that restores it.
    expect(output.interrupt).toHaveBeenCalledTimes(1);
    expect(output.setVolume.mock.invocationCallOrder[0]).toBeLessThan(
      output.interrupt.mock.invocationCallOrder[0]
    );
  });

  it("leaves the microphone muted if it was already muted before the hold", () => {
    const { conversation, input } = TestVoiceConversation.createTest();
    conversation.setMicMuted(true);

    conversation.setOnHold(true);
    conversation.setOnHold(false);

    expect(input.setMuted).toHaveBeenLastCalledWith(true);
    expect(input.isMuted()).toBe(true);
  });

  it("defers a setMicMuted call made during a hold", () => {
    const { conversation, input } = TestVoiceConversation.createTest();

    conversation.setOnHold(true);
    input.setMuted.mockClear();
    conversation.setMicMuted(false);

    // The hold owns the microphone: the request is remembered, not applied.
    expect(input.setMuted).not.toHaveBeenCalled();
    expect(input.isMuted()).toBe(true);

    conversation.setOnHold(false);
    expect(input.setMuted).toHaveBeenCalledWith(false);
  });

  it("defers a setVolume call made during a hold", () => {
    const { conversation, output } = TestVoiceConversation.createTest();

    conversation.setOnHold(true);
    output.setVolume.mockClear();
    conversation.setVolume({ volume: 0.25 });

    // A volume change must not bring a held agent back.
    expect(output.setVolume).not.toHaveBeenCalled();

    conversation.setOnHold(false);
    expect(output.setVolume).toHaveBeenCalledWith(0.25);
  });

  it("ignores a setOnHold call for the state it is already in", () => {
    const { conversation, output } = TestVoiceConversation.createTest();

    conversation.setOnHold(true);
    output.interrupt.mockClear();
    conversation.setOnHold(true);
    expect(output.interrupt).not.toHaveBeenCalled();

    conversation.setOnHold(false);
    output.interrupt.mockClear();
    conversation.setOnHold(false);
    expect(output.interrupt).not.toHaveBeenCalled();
  });

  it("keeps the agent quiet with user activity for as long as the hold lasts", () => {
    vi.useFakeTimers();
    const { conversation, connection } = TestVoiceConversation.createTest();

    conversation.setOnHold(true);
    vi.advanceTimersByTime(HOLD_ACTIVITY_INTERVAL_MS * 3);
    expect(userActivityCount(connection)).toBe(3);

    conversation.setOnHold(false);
    vi.advanceTimersByTime(HOLD_ACTIVITY_INTERVAL_MS * 3);
    expect(userActivityCount(connection)).toBe(3);
  });

  it("stops sending user activity when the session ends while on hold", async () => {
    vi.useFakeTimers();
    const { conversation, connection } = TestVoiceConversation.createTest();

    conversation.setOnHold(true);
    vi.advanceTimersByTime(HOLD_ACTIVITY_INTERVAL_MS);
    await conversation.endSession();

    const sentBeforeTeardown = userActivityCount(connection);
    vi.advanceTimersByTime(HOLD_ACTIVITY_INTERVAL_MS * 3);
    expect(userActivityCount(connection)).toBe(sentBeforeTeardown);
  });

  it("does not start a user activity interval for a session that has ended", async () => {
    vi.useFakeTimers();
    const { conversation, connection } = TestVoiceConversation.createTest();
    await conversation.endSession();

    conversation.setOnHold(true);
    vi.advanceTimersByTime(HOLD_ACTIVITY_INTERVAL_MS * 3);

    expect(userActivityCount(connection)).toBe(0);
  });

  it("does not report the agent as speaking for audio arriving during a hold", async () => {
    const onModeChange = vi.fn();
    const { conversation } = TestVoiceConversation.createTest({ onModeChange });

    await conversation.receiveMessage(audioEvent(1));
    expect(onModeChange).toHaveBeenLastCalledWith({ mode: "speaking" });

    conversation.setOnHold(true);
    expect(onModeChange).toHaveBeenLastCalledWith({ mode: "listening" });

    onModeChange.mockClear();
    await conversation.receiveMessage(audioEvent(2));
    expect(onModeChange).not.toHaveBeenCalled();

    conversation.setOnHold(false);
    await conversation.receiveMessage(audioEvent(3));
    expect(onModeChange).toHaveBeenLastCalledWith({ mode: "speaking" });
  });

  it("does not report the agent as speaking for playback progress during a hold", () => {
    const onModeChange = vi.fn();
    const playback = createPlaybackEventTarget();
    const { conversation } = TestVoiceConversation.createTest(
      { onModeChange },
      createConnection(),
      createInput(),
      createOutput(),
      playback
    );

    playback.emitProgress(false);
    expect(onModeChange).toHaveBeenLastCalledWith({ mode: "speaking" });

    conversation.setOnHold(true);
    expect(onModeChange).toHaveBeenLastCalledWith({ mode: "listening" });

    onModeChange.mockClear();
    // Audio that keeps arriving is played at volume zero, so the worklet
    // still reports progress while the hold is on.
    playback.emitProgress(true);
    playback.emitProgress(false);
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("does not report the agent as speaking when the transport says so during a hold", () => {
    const onModeChange = vi.fn();
    const connection = createConnection();
    const { conversation } = TestVoiceConversation.createTest(
      { onModeChange },
      connection
    );
    const reportMode = connectionModeListener(connection);

    conversation.setOnHold(true);
    onModeChange.mockClear();

    reportMode("speaking");
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("reports the agent as speaking again when a hold over a live track is released", () => {
    const onModeChange = vi.fn();
    const connection = createConnection();
    const { conversation } = TestVoiceConversation.createTest(
      { onModeChange },
      connection
    );
    const reportMode = connectionModeListener(connection);

    conversation.setOnHold(true);
    reportMode("speaking");
    onModeChange.mockClear();

    // A transport that plays the agent's track itself was never interrupted,
    // and it will not report the same utterance a second time.
    conversation.setOnHold(false);
    expect(onModeChange).toHaveBeenCalledWith({ mode: "speaking" });
  });

  it("does not report a stale speaking when the agent stopped during the hold", () => {
    const onModeChange = vi.fn();
    const connection = createConnection();
    const { conversation } = TestVoiceConversation.createTest(
      { onModeChange },
      connection
    );
    const reportMode = connectionModeListener(connection);

    conversation.setOnHold(true);
    reportMode("speaking");
    reportMode("listening");
    onModeChange.mockClear();

    conversation.setOnHold(false);
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("does not report speaking when a hold is released after the session ended", async () => {
    const onModeChange = vi.fn();
    const connection = createConnection();
    const { conversation } = TestVoiceConversation.createTest(
      { onModeChange },
      connection
    );
    const reportMode = connectionModeListener(connection);

    conversation.setOnHold(true);
    reportMode("speaking");
    await conversation.endSession();
    onModeChange.mockClear();

    conversation.setOnHold(false);
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it("does not report a stale speaking when local playback was flushed on release", () => {
    const onModeChange = vi.fn();
    const playback = createPlaybackEventTarget();
    const { conversation } = TestVoiceConversation.createTest(
      { onModeChange },
      createConnection(),
      createInput(),
      createOutput(),
      playback
    );

    conversation.setOnHold(true);
    playback.emitProgress(false);
    onModeChange.mockClear();

    // The release flushes what was queued, and the worklet reports the drain
    // itself, so nothing here should announce speech that was just dropped.
    conversation.setOnHold(false);
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
