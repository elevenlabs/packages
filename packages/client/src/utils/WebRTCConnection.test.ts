import { describe, it, expect, vi, beforeEach } from "vitest";

// Track mock calls using a global object that can be accessed after mocking
const mockCalls = {
  setMicrophoneEnabled: [] as boolean[],
};

vi.mock("livekit-client", () => {
  const mockLocalParticipant = {
    setMicrophoneEnabled: vi.fn((enabled: boolean) => {
      (globalThis as Record<string, unknown>).__mockCalls__ ??= {
        setMicrophoneEnabled: [],
      };
      (
        (globalThis as Record<string, unknown>)
          .__mockCalls__ as typeof mockCalls
      ).setMicrophoneEnabled.push(enabled);
      return Promise.resolve();
    }),
    publishData: vi.fn(() => Promise.resolve()),
    audioTrackPublications: new Map(),
    getTrackPublication: vi.fn(),
    unpublishTrack: vi.fn(() => Promise.resolve()),
    publishTrack: vi.fn(() => Promise.resolve()),
  };

  const mockRoom = {
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    localParticipant: mockLocalParticipant,
    name: "conv_test123",
  };

  return {
    Room: vi.fn(() => mockRoom),
    RoomEvent: {
      Connected: "connected",
      SignalConnected: "signalConnected",
      Disconnected: "disconnected",
      ConnectionStateChanged: "connectionStateChanged",
      DataReceived: "dataReceived",
      TrackSubscribed: "trackSubscribed",
      ActiveSpeakersChanged: "activeSpeakersChanged",
      ParticipantDisconnected: "participantDisconnected",
    },
    Track: {
      Kind: { Audio: "audio" },
      Source: { Microphone: "microphone" },
    },
    ConnectionState: {
      Connected: "connected",
      Disconnected: "disconnected",
    },
    createLocalAudioTrack: vi.fn(),
  };
});

import { WebRTCConnection } from "./WebRTCConnection.js";
import { Room, createLocalAudioTrack } from "livekit-client";

describe("WebRTCConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as Record<string, unknown>).__mockCalls__ = {
      setMicrophoneEnabled: [],
    };
  });

  it("replaces the input volume provider when switching input device", async () => {
    const mockRoom = new Room() as any;

    // Mock track returned by getTrackPublication (the "old" mic track)
    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      stop: vi.fn(() => Promise.resolve()),
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockReturnValue({ track: oldMockTrack });

    // Mock createLocalAudioTrack to return a "new" track after device switch
    const newMockTrack = {
      mediaStreamTrack: { id: "new-track", kind: "audio" },
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValue(
      newMockTrack
    );

    // Set up room event mocks so create() resolves
    (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
      (event: string, callback: () => void) => {
        if (event === "connected") {
          queueMicrotask(callback);
        }
      }
    );
    (mockRoom.once as ReturnType<typeof vi.fn>).mockImplementation(
      (event: string, callback: () => void) => {
        if (event === "signalConnected") {
          queueMicrotask(callback);
        }
      }
    );

    const connection = await WebRTCConnection.create({
      conversationToken: "test-token",
      connectionType: "webrtc",
    });

    // Simulate a working volume provider (as if set by the web analyser or RN layer)
    connection.setInputVolumeProvider({
      getVolume: () => 0.42,
      getByteFrequencyData: () => {},
    });
    expect(connection.input.getVolume()).toBe(0.42);

    // Switch input device
    await connection.setAudioInputDevice("new-device-id");

    // After fix: the stale volume provider should have been replaced.
    // In the test env AudioContext setup fails with mock tracks, so
    // NO_VOLUME (0) is used — either way, 0.42 must not persist.
    expect(connection.input.getVolume()).not.toBe(0.42);

    connection.close();
  });

  it.each([
    { textOnly: true, shouldEnableMic: false },
    { textOnly: false, shouldEnableMic: true },
  ])(
    "textOnly=$textOnly should enable microphone=$shouldEnableMic",
    async ({ textOnly, shouldEnableMic }) => {
      const mockRoom = new Room();
      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "connected") {
            queueMicrotask(callback);
          }
        }
      );
      (mockRoom.once as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "signalConnected") {
            queueMicrotask(callback);
          }
        }
      );

      try {
        await WebRTCConnection.create({
          conversationToken: "test-token",
          connectionType: "webrtc",
          textOnly,
        });
      } catch {
        // Connection may fail in test environment
      }

      const calls = (
        (globalThis as Record<string, unknown>)
          .__mockCalls__ as typeof mockCalls
      ).setMicrophoneEnabled;

      if (shouldEnableMic) {
        expect(calls).toContain(true);
      } else {
        expect(calls).not.toContain(true);
      }
    }
  );
});
