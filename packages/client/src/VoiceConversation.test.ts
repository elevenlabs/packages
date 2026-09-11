import { describe, it, expect, vi } from "vitest";

vi.mock("livekit-client", () => ({
  Room: vi.fn(),
  RoomEvent: {},
  Track: { Kind: { Audio: "audio" }, Source: { Microphone: "microphone" } },
  ConnectionState: {},
  createLocalAudioTrack: vi.fn(),
}));

import { VoiceConversation } from "./VoiceConversation.js";
import { setSetupStrategy } from "./platform/VoiceSessionSetup.js";
import type { VoiceSessionSetupResult } from "./platform/VoiceSessionSetup.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import type { Callbacks } from "./types.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function fakeConnection() {
  return {
    conversationId: "conversation-1",
    onMessage: () => {},
    onOutgoingMessage: () => {},
    onDisconnect: () => {},
    onModeChange: () => {},
    close: vi.fn(),
    sendMessage: () => {},
  } as unknown as BaseConnection;
}

/**
 * Registers a setup strategy whose teardown only finishes when the returned
 * `finishDetach` is called, standing in for a platform tearing down its audio
 * pipeline (releasing a wake lock, stopping a native audio session, ...).
 */
function setupStrategyWithGatedDetach() {
  const detached = deferred<void>();
  const detach = vi.fn(() => detached.promise);
  const input = { close: vi.fn(async () => {}) };
  const output = { close: vi.fn(async () => {}) };

  setSetupStrategy(
    async () =>
      ({
        connection: fakeConnection(),
        input,
        output,
        playbackEventTarget: null,
        detach,
      }) as unknown as VoiceSessionSetupResult
  );

  return { detach, input, output, finishDetach: detached.resolve };
}

function statusRecorder() {
  const statuses: string[] = [];
  const onStatusChange: NonNullable<Callbacks["onStatusChange"]> = ({
    status,
  }) => {
    statuses.push(status);
  };
  return { statuses, onStatusChange };
}

async function startSession(options: Record<string, unknown> = {}) {
  return VoiceConversation.startSession({
    agentId: "agent-1",
    connectionType: "webrtc",
    ...options,
  } as Parameters<typeof VoiceConversation.startSession>[0]);
}

describe("VoiceConversation teardown", () => {
  it("stays in disconnecting until the platform has detached the audio pipeline", async () => {
    // Reaching "disconnected" while the platform still owns the microphone
    // tells consumers the session is fully gone, so they re-enable their
    // "start" affordance and the next startSession() races this teardown.
    const { detach, input, output, finishDetach } =
      setupStrategyWithGatedDetach();
    const { statuses, onStatusChange } = statusRecorder();
    const onDisconnect = vi.fn();

    const conversation = await startSession({ onStatusChange, onDisconnect });
    expect(statuses).toEqual(["connecting", "connected"]);

    const ending = conversation.endSession();
    await flush();

    expect(detach).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["connecting", "connected", "disconnecting"]);
    expect(onDisconnect).not.toHaveBeenCalled();
    // The controllers close only after the platform teardown has finished.
    expect(input.close).not.toHaveBeenCalled();
    expect(output.close).not.toHaveBeenCalled();

    finishDetach();
    await ending;

    expect(statuses).toEqual([
      "connecting",
      "connected",
      "disconnecting",
      "disconnected",
    ]);
    expect(onDisconnect).toHaveBeenCalledWith({ reason: "user" });
    expect(input.close).toHaveBeenCalledTimes(1);
    expect(output.close).toHaveBeenCalledTimes(1);
  });
});
