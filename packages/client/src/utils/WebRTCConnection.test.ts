import { describe, it, expect, vi, beforeEach } from "vitest";

// Track mock calls using a global object that can be accessed after mocking
const mockCalls = {
  createLocalAudioTrack: [] as unknown[],
  publishTrack: [] as unknown[],
};

vi.mock("livekit-client", () => {
  const mockAudioTrack = { id: "mock-audio-track" };

  const mockLocalParticipant = {
    setMicrophoneEnabled: vi.fn(() => Promise.resolve()),
    publishData: vi.fn(() => Promise.resolve()),
    publishTrack: vi.fn((track: unknown, options: unknown) => {
      (globalThis as Record<string, unknown>).__mockCalls__ ??= {
        createLocalAudioTrack: [],
        publishTrack: [],
      };
      (
        (globalThis as Record<string, unknown>)
          .__mockCalls__ as typeof mockCalls
      ).publishTrack.push({ track, options });
      return Promise.resolve();
    }),
    audioTrackPublications: new Map(),
  };

  const mockRoom = {
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    localParticipant: mockLocalParticipant,
    name: "conv_test123",
  };

  return {
    Room: vi.fn(() => mockRoom),
    RoomEvent: {
      Connected: "connected",
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
    createLocalAudioTrack: vi.fn((constraints: unknown) => {
      (globalThis as Record<string, unknown>).__mockCalls__ ??= {
        createLocalAudioTrack: [],
        publishTrack: [],
      };
      (
        (globalThis as Record<string, unknown>)
          .__mockCalls__ as typeof mockCalls
      ).createLocalAudioTrack.push(constraints);
      return Promise.resolve(mockAudioTrack);
    }),
  };
});

import { WebRTCConnection } from "./WebRTCConnection";
import { Room } from "livekit-client";

describe("WebRTCConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as Record<string, unknown>).__mockCalls__ = {
      createLocalAudioTrack: [],
      publishTrack: [],
    };
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

      try {
        await WebRTCConnection.create({
          conversationToken: "test-token",
          connectionType: "webrtc",
          textOnly,
        });
      } catch {
        // Connection may fail in test environment
      }

      const trackCalls = (
        (globalThis as Record<string, unknown>)
          .__mockCalls__ as typeof mockCalls
      ).createLocalAudioTrack;

      if (shouldEnableMic) {
        expect(trackCalls.length).toBeGreaterThan(0);
        expect(trackCalls[0]).toMatchObject({
          voiceIsolation: true,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        });
      } else {
        expect(trackCalls.length).toBe(0);
      }
    }
  );
});
