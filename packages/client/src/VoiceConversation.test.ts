import { describe, it, expect, vi, afterEach } from "vitest";

import { VoiceConversation } from "./VoiceConversation.js";
import type { Options, PartialOptions } from "./BaseConversation.js";
import type { InputController } from "./InputController.js";
import type { OutputController } from "./OutputController.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import type { IncomingSocketEvent } from "./utils/events.js";

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
    output: ReturnType<typeof createOutput> = createOutput()
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
      output
    );
    conversation.markConnected();
    return { conversation, connection, input, output, options };
  }

  private constructor(
    options: Options,
    connection: BaseConnection,
    input: InputController,
    output: OutputController
  ) {
    super(options, connection, input, output, null, async () => {});
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
});
