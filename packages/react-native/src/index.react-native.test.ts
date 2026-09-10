import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoiceConversation, WebRTCConnection } from "@elevenlabs/client";
import type { Callbacks } from "@elevenlabs/client";

// Shared with the module factories below, which are hoisted above the imports.
const harness = vi.hoisted(() => ({
  audioSession: {
    configureAudio: vi.fn(async () => {}),
    startAudioSession: vi.fn(async () => {}),
    stopAudioSession: vi.fn(async () => {}),
  },
  // The connection `createConnection` hands back for the next session.
  connection: { current: null as unknown },
}));

vi.mock("react-native", () => ({
  NativeModules: { LivekitReactNativeModule: {} },
  NativeEventEmitter: class {
    addListener() {
      return { remove() {} };
    }
  },
}));

vi.mock("@livekit/react-native", () => ({
  registerGlobals: vi.fn(),
  AndroidAudioTypePresets: { communication: {} },
  AudioSession: harness.audioSession,
}));

vi.mock("@elevenlabs/client/internal", async importOriginal => ({
  ...(await importOriginal<typeof import("@elevenlabs/client/internal")>()),
  createConnection: vi.fn(async () => harness.connection.current),
}));

// Registers the React Native setup strategy as a side effect of the import,
// which is what `VoiceConversation.startSession` reaches for below.
import "./index.react-native.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * A stand-in for a live `WebRTCConnection`: enough of one to pass the
 * `instanceof` checks in `setupWebRTCSession` and `attachNativeVolume`, with
 * an empty room so no native volume processor is ever created.
 */
function fakeConnection({
  offTrackListener = () => {},
}: { offTrackListener?: () => void } = {}) {
  const room = {
    localParticipant: { audioTrackPublications: new Map() },
    remoteParticipants: new Map(),
    on: () => {},
    off: offTrackListener,
  };
  return Object.create(WebRTCConnection.prototype, {
    conversationId: { value: "conversation-1" },
    room: { value: room },
    queue: { value: [], writable: true },
    outgoingQueue: { value: [], writable: true },
    input: { value: { close: vi.fn(async () => {}) } },
    output: { value: { close: vi.fn(async () => {}) } },
    close: { value: vi.fn() },
  });
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

async function startSession(
  options: Partial<Parameters<typeof VoiceConversation.startSession>[0]> = {}
) {
  return VoiceConversation.startSession({
    agentId: "agent-1",
    connectionType: "webrtc",
    ...options,
  } as Parameters<typeof VoiceConversation.startSession>[0]);
}

describe("React Native session teardown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.audioSession.stopAudioSession.mockImplementation(async () => {});
  });

  it("holds the session in disconnecting until the audio session has stopped", async () => {
    // A native audio session that takes its time to tear down: the status must
    // not reach "disconnected" while the platform is still holding the mic,
    // otherwise consumers re-enable their "start" affordance too early and the
    // next startSession() races this teardown.
    const stopped = deferred<void>();
    harness.audioSession.stopAudioSession.mockImplementation(
      () => stopped.promise
    );
    harness.connection.current = fakeConnection();
    const { statuses, onStatusChange } = statusRecorder();
    const onDisconnect = vi.fn();

    const conversation = await startSession({ onStatusChange, onDisconnect });
    expect(statuses).toEqual(["connecting", "connected"]);

    const ending = conversation.endSession();
    await flush();

    expect(harness.audioSession.stopAudioSession).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual(["connecting", "connected", "disconnecting"]);
    expect(onDisconnect).not.toHaveBeenCalled();

    stopped.resolve();
    await ending;

    expect(statuses).toEqual([
      "connecting",
      "connected",
      "disconnecting",
      "disconnected",
    ]);
    expect(onDisconnect).toHaveBeenCalledWith({ reason: "user" });
  });

  it("stops the audio session even when detaching the connection throws", async () => {
    harness.connection.current = fakeConnection({
      offTrackListener: () => {
        throw new Error("detach boom");
      },
    });
    const { statuses, onStatusChange } = statusRecorder();

    const conversation = await startSession({ onStatusChange });

    await expect(conversation.endSession()).rejects.toThrow("detach boom");

    expect(harness.audioSession.stopAudioSession).toHaveBeenCalledTimes(1);
    expect(statuses).toEqual([
      "connecting",
      "connected",
      "disconnecting",
      "disconnected",
    ]);
  });
});
