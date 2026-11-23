import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Track mock calls using a global object that can be accessed after mocking
const mockCalls = {
  setMicrophoneEnabled: [] as boolean[],
};

vi.mock("livekit-client", async importOriginal => {
  const { DisconnectReason } =
    await importOriginal<typeof import("livekit-client")>();
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
    remoteParticipants: new Map([["agent-test", { identity: "agent-test" }]]),
  };

  return {
    Room: vi.fn(function Room() {
      return mockRoom;
    }),
    RoomEvent: {
      Connected: "connected",
      SignalConnected: "signalConnected",
      Disconnected: "disconnected",
      ConnectionStateChanged: "connectionStateChanged",
      DataReceived: "dataReceived",
      TrackSubscribed: "trackSubscribed",
      TrackUnsubscribed: "trackUnsubscribed",
      ActiveSpeakersChanged: "activeSpeakersChanged",
      ParticipantConnected: "participantConnected",
      ParticipantDisconnected: "participantDisconnected",
    },
    Track: {
      Kind: { Audio: "audio", Video: "video" },
      Source: { Microphone: "microphone" },
    },
    ConnectionState: {
      Connected: "connected",
      Disconnected: "disconnected",
      Reconnecting: "reconnecting",
      SignalReconnecting: "signalReconnecting",
    },
    DisconnectReason,
    createLocalAudioTrack: vi.fn(),
  };
});

import { WebRTCConnection } from "./WebRTCConnection.js";
import { Room, createLocalAudioTrack, DisconnectReason } from "livekit-client";
import { setWebRTCAudioAdapterFactory } from "../WebRTCAudioAdapter.js";
import { WebAudioAdapter } from "../platform/web/webAudioAdapter.js";
import { NO_VOLUME } from "./volumeProvider.js";
import type { PongEvent } from "./events.js";
import { enableAvatarVideo, onAvatarVideoTrack } from "../experimental.js";
import type { Conversation } from "../index.js";

describe("WebRTCConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    (globalThis as Record<string, unknown>).__mockCalls__ = {
      setMicrophoneEnabled: [],
    };
  });

  it("preserves external volume provider when AudioContext is unavailable", async () => {
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

    // Simulate an external volume provider (e.g. React Native's native layer)
    connection.setInputVolumeProvider({
      getVolume: () => 0.42,
      getByteFrequencyData: () => {},
    });
    expect(connection.input.getVolume()).toBe(0.42);

    // Switch input device — AudioContext will fail with mock tracks (as on RN),
    // so the external provider should be preserved rather than clobbered.
    await connection.setAudioInputDevice("new-device-id");

    expect(connection.input.getVolume()).toBe(0.42);

    connection.close();
  });

  it("passes webRtc.iceTransportPolicy through to room.connect", async () => {
    const mockRoom = new Room() as any;
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
      webRtc: { iceTransportPolicy: "relay" },
    });

    expect(mockRoom.connect).toHaveBeenCalledWith(
      expect.any(String),
      "test-token",
      { rtcConfig: { iceTransportPolicy: "relay" } }
    );

    connection.close();
  });

  describe("webRtc.singlePeerConnection", () => {
    // Options the Room constructor was last called with, if any.
    function lastRoomOptions(): { singlePeerConnection?: boolean } | undefined {
      return (Room as unknown as ReturnType<typeof vi.fn>).mock.calls.at(
        -1
      )?.[0];
    }

    // Returns a room mock whose connect sequence resolves, so create() runs to
    // completion and we can inspect how the Room itself was constructed.
    function mockConnectingRoom() {
      const mockRoom = new Room() as any;
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
      return mockRoom;
    }

    it("forces the dual peer connection path when set to false", async () => {
      mockConnectingRoom();

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
        webRtc: { singlePeerConnection: false },
      });

      expect(Room).toHaveBeenLastCalledWith({ singlePeerConnection: false });

      connection.close();
    });

    it("passes the option through when set to true", async () => {
      mockConnectingRoom();

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
        webRtc: { singlePeerConnection: true },
      });

      expect(Room).toHaveBeenLastCalledWith({ singlePeerConnection: true });

      connection.close();
    });

    // The back-compat control: an unset option must leave livekit-client's own
    // default in place rather than pinning it from here. Asserts that no mode
    // was pinned rather than the exact call arity, since `new Room()` and
    // `new Room(undefined)` are the same thing to LiveKit.
    it("leaves the LiveKit default alone when the option is omitted", async () => {
      mockConnectingRoom();

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      expect(lastRoomOptions()?.singlePeerConnection).toBeUndefined();

      connection.close();
    });

    // The two webRtc options are independent: setting the sibling must not
    // start pinning the peer connection mode.
    it("does not pin the peer connection mode when only iceTransportPolicy is set", async () => {
      mockConnectingRoom();

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
        webRtc: { iceTransportPolicy: "relay" },
      });

      expect(lastRoomOptions()?.singlePeerConnection).toBeUndefined();

      connection.close();
    });
  });

  it("reconnects input analyser after unmuting", async () => {
    const mockRoom = new Room() as any;

    const mockMediaStreamTrack = { id: "mic-track", kind: "audio" };
    const mockTrack = {
      mediaStreamTrack: mockMediaStreamTrack,
      mute: vi.fn(() => Promise.resolve()),
      unmute: vi.fn(() => Promise.resolve()),
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockReturnValue({ track: mockTrack });

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

    // Mock AudioContext so setupInputAnalyser succeeds via the web adapter
    const mockAnalyser = {
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
    };
    const mockSource = { connect: vi.fn() };
    const MockAudioContext = vi.fn(() => ({
      createAnalyser: vi.fn(() => mockAnalyser),
      createMediaStreamSource: vi.fn(() => mockSource),
      close: vi.fn(() => Promise.resolve()),
      sampleRate: 44100,
    }));
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal(
      "MediaStream",
      vi.fn((tracks: unknown[]) => ({ getTracks: () => tracks }))
    );

    // Register the web audio adapter so WebRTCConnection delegates to it
    setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());

    const connection = await WebRTCConnection.create({
      conversationToken: "test-token",
      connectionType: "webrtc",
    });

    // Initial setup during create() may call AudioContext
    const callsBeforeMute = MockAudioContext.mock.calls.length;

    // Mute — should NOT reconnect analyser
    await connection.input.setMuted(true);
    expect(MockAudioContext.mock.calls.length).toBe(callsBeforeMute);
    expect(connection.input.isMuted()).toBe(true);

    // Unmute — should reconnect analyser with the current track
    await connection.input.setMuted(false);
    expect(MockAudioContext.mock.calls.length).toBe(callsBeforeMute + 1);
    expect(connection.input.isMuted()).toBe(false);

    connection.close();
  });

  it("sets isMuted and zeros volume even when track.mute() throws", async () => {
    const mockRoom = new Room() as any;

    const mockTrack = {
      mediaStreamTrack: { id: "mic-track", kind: "audio" },
      mute: vi.fn(() => Promise.resolve()),
      unmute: vi.fn(() => Promise.resolve()),
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockReturnValue({ track: mockTrack });

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

    // Simulate a native volume provider (like React Native)
    connection.setInputVolumeProvider({
      getVolume: () => 0.75,
      getByteFrequencyData: (buf: Uint8Array) => buf.fill(200),
    });
    expect(connection.input.getVolume()).toBe(0.75);

    // Now make both track.mute() and setMicrophoneEnabled throw
    // (simulates RN environment where these operations may not be supported)
    mockTrack.mute.mockRejectedValueOnce(new Error("mute unsupported"));
    (
      mockRoom.localParticipant.setMicrophoneEnabled as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("setMicrophoneEnabled unsupported"));

    // Mute — even though track.mute() and setMicrophoneEnabled both throw,
    // isMuted should already be set and volume should return 0
    await connection.input.setMuted(true).catch(() => {});
    expect(connection.input.isMuted()).toBe(true);
    expect(connection.input.getVolume()).toBe(0);

    connection.close();
  });

  describe("disconnection context", () => {
    async function createWithHandlers() {
      const mockRoom = new Room() as any;
      const eventHandlers = new Map<string, (...args: unknown[]) => void>();

      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: (...args: unknown[]) => void) => {
          eventHandlers.set(event, callback);
          if (event === "connected") {
            queueMicrotask(() => callback());
          }
        }
      );
      (mockRoom.once as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: (...args: unknown[]) => void) => {
          if (event === "signalConnected") {
            queueMicrotask(() => callback());
          }
        }
      );

      mockRoom.state = "connected";

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      return { connection, eventHandlers, mockRoom };
    }

    it("emits agent disconnect with context on RoomEvent.Disconnected", async () => {
      const { connection, eventHandlers } = await createWithHandlers();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      eventHandlers.get("disconnected")?.(DisconnectReason.CLIENT_INITIATED);

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: {
          type: "close",
          reason: String(DisconnectReason.CLIENT_INITIATED),
        },
      });
    });

    it.each(
      [
        DisconnectReason.ROOM_DELETED,
        DisconnectReason.ROOM_CLOSED,
        DisconnectReason.PARTICIPANT_REMOVED,
      ].map(reason => ({ reason, name: DisconnectReason[reason] }))
    )(
      "reports the agent when the server closes the room with $name",
      async ({ reason }) => {
        const { connection, eventHandlers } = await createWithHandlers();
        const onDisconnect = vi.fn();
        connection.onDisconnect(onDisconnect);

        eventHandlers.get("disconnected")?.(reason);

        expect(onDisconnect).toHaveBeenCalledOnce();
        expect(onDisconnect).toHaveBeenCalledWith({
          reason: "agent",
          context: { type: "close", reason: String(reason) },
        });
      }
    );

    it.each(
      [
        DisconnectReason.UNKNOWN_REASON,
        DisconnectReason.SERVER_SHUTDOWN,
        DisconnectReason.JOIN_FAILURE,
        DisconnectReason.SIGNAL_CLOSE,
        DisconnectReason.CONNECTION_TIMEOUT,
        DisconnectReason.MEDIA_FAILURE,
        DisconnectReason.AGENT_ERROR,
      ].map(reason => ({ reason, name: DisconnectReason[reason] }))
    )(
      "reports an error when the room disconnects with $name",
      async ({ reason }) => {
        const { connection, eventHandlers } = await createWithHandlers();
        const onDisconnect = vi.fn();
        connection.onDisconnect(onDisconnect);

        eventHandlers.get("disconnected")?.(reason);

        expect(onDisconnect).toHaveBeenCalledOnce();
        expect(onDisconnect).toHaveBeenCalledWith({
          reason: "error",
          message: `LiveKit room disconnected: ${DisconnectReason[reason]}`,
          context: { type: "close", reason: String(reason) },
        });
      }
    );

    // LiveKit emits Disconnected without a reason when it gives up
    // reconnecting.
    it("reports an error when the room disconnects without a reason", async () => {
      const { connection, eventHandlers } = await createWithHandlers();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      eventHandlers.get("disconnected")?.(undefined);

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "error",
        message: "LiveKit room disconnected: UNKNOWN_REASON",
        context: { type: "close", reason: undefined },
      });
    });

    it("emits error disconnect with context on ConnectionStateChanged to Disconnected", async () => {
      const { connection, eventHandlers } = await createWithHandlers();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      eventHandlers.get("connectionStateChanged")?.("disconnected");

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "error",
        message: "LiveKit connection state changed to disconnected",
        context: { type: "connection_state_changed" },
      });
    });

    it("emits agent disconnect with context on agent ParticipantDisconnected", async () => {
      const { connection, eventHandlers } = await createWithHandlers();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      eventHandlers.get("participantDisconnected")?.({
        identity: "agent_123",
      });
      await Promise.resolve();

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: { type: "close", reason: "agent disconnected" },
      });
    });

    // A full reconnect drops every remote participant before the room leaves
    // the connected state, so the agent's departure is a symptom of the
    // failure rather than the agent ending the call.
    it.each(["reconnecting", "signalReconnecting"])(
      "reports an error when the agent drops out while the room is %s",
      async state => {
        const { connection, eventHandlers, mockRoom } =
          await createWithHandlers();
        const onDisconnect = vi.fn();
        connection.onDisconnect(onDisconnect);

        eventHandlers.get("participantDisconnected")?.({
          identity: "agent_123",
        });
        mockRoom.state = state;
        eventHandlers.get("connectionStateChanged")?.(state);
        await Promise.resolve();

        expect(onDisconnect).toHaveBeenCalledOnce();
        expect(onDisconnect).toHaveBeenCalledWith({
          reason: "error",
          message: `LiveKit connection state changed to ${state}`,
          context: { type: "connection_state_changed" },
        });
      }
    );

    it("keeps an error reported after the agent drops out of a failing room", async () => {
      const { connection, eventHandlers, mockRoom } =
        await createWithHandlers();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      eventHandlers.get("participantDisconnected")?.({
        identity: "agent_123",
      });
      mockRoom.state = "disconnected";
      eventHandlers.get("connectionStateChanged")?.("disconnected");
      eventHandlers.get("disconnected")?.(DisconnectReason.SIGNAL_CLOSE);
      await Promise.resolve();

      expect(onDisconnect).toHaveBeenCalledOnce();
      expect(onDisconnect).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "error" })
      );
    });

    it("ignores a non-agent participant leaving", async () => {
      const { connection, eventHandlers } = await createWithHandlers();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      eventHandlers.get("participantDisconnected")?.({ identity: "user_1" });
      await Promise.resolve();

      expect(onDisconnect).not.toHaveBeenCalled();
    });
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

  it("publishes a track from the configured inputDeviceId instead of the default mic", async () => {
    const mockRoom = new Room() as any;
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

    const newMockTrack = {
      mediaStreamTrack: { id: "selected-device-track", kind: "audio" },
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValue(
      newMockTrack
    );

    const connection = await WebRTCConnection.create({
      conversationToken: "test-token",
      connectionType: "webrtc",
      inputDeviceId: "selected-mic-id",
    });

    // The selected device must drive the published track, not the default mic.
    expect(createLocalAudioTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: { exact: "selected-mic-id" },
      })
    );
    expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalledWith(
      newMockTrack,
      expect.objectContaining({ source: "microphone" })
    );
    // And the default-mic path must not have run.
    const micCalls = (
      (globalThis as Record<string, unknown>).__mockCalls__ as typeof mockCalls
    ).setMicrophoneEnabled;
    expect(micCalls).not.toContain(true);

    connection.close();
  });

  it("falls back to setMicrophoneEnabled when no inputDeviceId is configured", async () => {
    const mockRoom = new Room() as any;
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

    expect(createLocalAudioTrack).not.toHaveBeenCalled();
    const micCalls = (
      (globalThis as Record<string, unknown>).__mockCalls__ as typeof mockCalls
    ).setMicrophoneEnabled;
    expect(micCalls).toContain(true);

    connection.close();
  });

  it("keeps the previous mic published when setAudioInputDevice re-acquire fails", async () => {
    const mockRoom = new Room() as any;

    // Existing published mic track stays alive when the new capture fails.
    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      stop: vi.fn(() => Promise.resolve()),
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockReturnValue({ track: oldMockTrack });

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

    // Re-acquire the new device fails. The old track must NOT be stopped or
    // unpublished, so the call keeps working audio.
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("device unavailable")
    );

    await expect(
      connection.setAudioInputDevice("missing-device-id")
    ).rejects.toThrow("device unavailable");

    expect(oldMockTrack.stop).not.toHaveBeenCalled();
    expect(mockRoom.localParticipant.unpublishTrack).not.toHaveBeenCalled();

    connection.close();
  });

  it("recovers onto the default mic when publishing the new device fails", async () => {
    const mockRoom = new Room() as any;

    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      stop: vi.fn(),
    };
    // Model LiveKit: unpublishTrack removes the publication before resolving.
    let micPublication: { track: unknown } | undefined = {
      track: oldMockTrack,
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockImplementation(() => micPublication);
    (
      mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      micPublication = undefined;
      return Promise.resolve();
    });

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

    const newMockTrack = {
      mediaStreamTrack: { id: "new-track", kind: "audio" },
      stop: vi.fn(),
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      newMockTrack
    );
    (
      mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("publish failed"));
    // Ignore the default mic enabled at connect time.
    (
      (globalThis as Record<string, unknown>).__mockCalls__ as typeof mockCalls
    ).setMicrophoneEnabled.length = 0;

    await expect(
      connection.setAudioInputDevice("selected-mic-id")
    ).rejects.toThrow("publish failed");

    // The old track is gone, so the unpublished new track is released and the
    // session falls back to the default device instead of going silent.
    expect(newMockTrack.stop).toHaveBeenCalled();
    const micCalls = (
      (globalThis as Record<string, unknown>).__mockCalls__ as typeof mockCalls
    ).setMicrophoneEnabled;
    expect(micCalls).toContain(true);

    connection.close();
  });

  it("keeps the new track published when the swap succeeds", async () => {
    const mockRoom = new Room() as any;

    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      stop: vi.fn(),
    };
    let micPublication: { track: unknown } | undefined = {
      track: oldMockTrack,
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockImplementation(() => micPublication);
    (
      mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      micPublication = undefined;
      return Promise.resolve();
    });

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

    const newMockTrack = {
      mediaStreamTrack: { id: "new-track", kind: "audio" },
      stop: vi.fn(),
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      newMockTrack
    );

    await connection.setAudioInputDevice("selected-mic-id");

    expect(newMockTrack.stop).not.toHaveBeenCalled();
    expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith(
      oldMockTrack
    );
    // unpublishTrack stops the track it removes.
    expect(oldMockTrack.stop).not.toHaveBeenCalled();

    connection.close();
  });

  it("releases the mic when publishing at session start fails", async () => {
    const mockRoom = new Room() as any;
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

    const newMockTrack = {
      mediaStreamTrack: { id: "selected-device-track", kind: "audio" },
      stop: vi.fn(),
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValue(
      newMockTrack
    );
    // The track never reaches the room, so disconnecting cannot release it.
    (
      mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("publish failed"));

    await expect(
      WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
        inputDeviceId: "selected-mic-id",
      })
    ).rejects.toThrow("publish failed");

    expect(newMockTrack.stop).toHaveBeenCalled();
  });

  it("publishes the new device muted when the session is muted", async () => {
    const mockRoom = new Room() as any;

    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      mute: vi.fn(() => Promise.resolve()),
      unmute: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
    };
    let micPublication: { track: unknown } | undefined = {
      track: oldMockTrack,
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockImplementation(() => micPublication);
    (
      mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      micPublication = undefined;
      return Promise.resolve();
    });

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

    await connection.input.setMuted(true);

    const newMockTrack = {
      mediaStreamTrack: { id: "new-track", kind: "audio" },
      mute: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      newMockTrack
    );

    await connection.setAudioInputDevice("selected-mic-id");

    // Muted before publishing, so the agent never receives audio from the
    // device the user swapped to while muted.
    expect(newMockTrack.mute).toHaveBeenCalled();
    const muteCallOrder = newMockTrack.mute.mock.invocationCallOrder[0];
    const publishCallOrder = (
      mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
    ).mock.invocationCallOrder[0];
    expect(muteCallOrder).toBeLessThan(publishCallOrder);
    expect(connection.input.isMuted()).toBe(true);

    connection.close();
  });

  it("recovers a muted session without republishing live audio", async () => {
    const mockRoom = new Room() as any;

    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      mute: vi.fn(() => Promise.resolve()),
      unmute: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
    };
    let micPublication: { track: unknown } | undefined = {
      track: oldMockTrack,
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockImplementation(() => micPublication);
    (
      mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      micPublication = undefined;
      return Promise.resolve();
    });

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

    await connection.input.setMuted(true);

    const newMockTrack = {
      mediaStreamTrack: { id: "new-track", kind: "audio" },
      mute: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      newMockTrack
    );
    (
      mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("publish failed"));
    (
      (globalThis as Record<string, unknown>).__mockCalls__ as typeof mockCalls
    ).setMicrophoneEnabled.length = 0;

    await expect(
      connection.setAudioInputDevice("selected-mic-id")
    ).rejects.toThrow("publish failed");

    // Recovery must honour the mute state instead of going live.
    const micCalls = (
      (globalThis as Record<string, unknown>).__mockCalls__ as typeof mockCalls
    ).setMicrophoneEnabled;
    expect(micCalls).toEqual([false]);
    expect(connection.input.isMuted()).toBe(true);

    connection.close();
  });

  it("reconnects the input analyser to the recovered mic", async () => {
    const mockRoom = new Room() as any;

    const oldMockTrack = {
      mediaStreamTrack: { id: "old-track", kind: "audio" },
      stop: vi.fn(),
    };
    const recoveredTrack = {
      mediaStreamTrack: { id: "recovered-track", kind: "audio" },
      stop: vi.fn(),
    };
    let micPublication: { track: unknown } | undefined = {
      track: oldMockTrack,
    };
    (
      mockRoom.localParticipant.getTrackPublication as ReturnType<typeof vi.fn>
    ).mockImplementation(() => micPublication);
    (
      mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      micPublication = undefined;
      return Promise.resolve();
    });
    // The default mic comes back published once recovery enables it, leaving
    // the connect-time publication alone.
    (
      mockRoom.localParticipant.setMicrophoneEnabled as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      micPublication ??= { track: recoveredTrack };
      return Promise.resolve();
    });

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

    const analysedTracks: unknown[] = [];
    setWebRTCAudioAdapterFactory(() => {
      const adapter = new WebAudioAdapter() as any;
      const setupInputAnalysis = adapter.setupInputAnalysis.bind(adapter);
      adapter.setupInputAnalysis = (track: unknown) => {
        analysedTracks.push(track);
        return setupInputAnalysis(track);
      };
      return adapter;
    });

    const mockAnalyser = {
      frequencyBinCount: 128,
      getByteFrequencyData: vi.fn(),
      getFloatTimeDomainData: vi.fn(),
    };
    const mockSource = { connect: vi.fn() };
    vi.stubGlobal(
      "AudioContext",
      vi.fn(() => ({
        createAnalyser: vi.fn(() => mockAnalyser),
        createMediaStreamSource: vi.fn(() => mockSource),
        close: vi.fn(() => Promise.resolve()),
        sampleRate: 44100,
      }))
    );
    vi.stubGlobal(
      "MediaStream",
      vi.fn((tracks: unknown[]) => ({ getTracks: () => tracks }))
    );

    const connection = await WebRTCConnection.create({
      conversationToken: "test-token",
      connectionType: "webrtc",
    });

    const newMockTrack = {
      mediaStreamTrack: { id: "new-track", kind: "audio" },
      mute: vi.fn(() => Promise.resolve()),
      stop: vi.fn(),
    };
    (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      newMockTrack
    );
    (
      mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
    ).mockRejectedValueOnce(new Error("publish failed"));

    await expect(
      connection.setAudioInputDevice("selected-mic-id")
    ).rejects.toThrow("publish failed");

    // Metering must follow the live mic, not the track recovery replaced.
    expect(analysedTracks.at(-1)).toBe(recoveredTrack.mediaStreamTrack);

    connection.close();
  });

  it("properly reports sent messages", async () => {
    const connection = await WebRTCConnection.create({
      conversationToken: "test-token",
      connectionType: "webrtc",
    });
    const message: PongEvent = {
      type: "pong",
      event_id: 1,
    };

    const listener = vi.fn();
    connection.onOutgoingMessage(listener);
    connection.sendMessage(message);
    connection.close();

    expect(listener).toHaveBeenCalledWith(message);
  });

  it.each([
    {
      name: "forwards configured workletPaths to the audio adapter",
      workletPaths: { rawAudioProcessor: "/vendor/raw-audio-processor.js" },
    },
    {
      name: "passes undefined to the audio adapter when none are configured",
      workletPaths: undefined,
    },
  ])("$name", async ({ workletPaths }) => {
    const mockRoom = new Room() as any;
    const handlers = new Map<string, (...args: any[]) => unknown>();

    (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
      (event: string, callback: (...args: any[]) => unknown) => {
        handlers.set(event, callback);
        if (event === "connected") {
          queueMicrotask(callback as () => void);
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

    const setupOutputAnalysis = vi.fn(() =>
      Promise.resolve({ volumeProvider: NO_VOLUME })
    );
    setWebRTCAudioAdapterFactory(() => ({
      attachRemoteTrack: vi.fn(() => Promise.resolve()),
      setupInputAnalysis: vi.fn(() => ({ volumeProvider: NO_VOLUME })),
      setupOutputAnalysis,
      setVolume: vi.fn(),
      setOutputDevice: vi.fn(() => Promise.resolve()),
      cleanup: vi.fn(),
    }));

    try {
      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
        ...(workletPaths ? { workletPaths } : {}),
      });

      const onTrackSubscribed = handlers.get("trackSubscribed");
      expect(onTrackSubscribed).toBeDefined();

      await onTrackSubscribed?.(
        { kind: "audio", mediaStreamTrack: { id: "agent-track" } },
        {},
        { identity: "agent-abc" }
      );

      expect(setupOutputAnalysis).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.any(Function),
        workletPaths
      );

      connection.close();
    } finally {
      // Restore the default web adapter for any later test in this file.
      setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
    }
  });

  describe("avatar", () => {
    const agent = { identity: "agent_123", attributes: {} };
    const avatar = {
      identity: "avatar-anam",
      attributes: { "lk.publish_on_behalf": "agent_123" },
    };
    const unnamed = {
      identity: "avatar-other",
      attributes: { "lk.publish_on_behalf": "agent_123" },
    };
    const agentAudio = { kind: "audio", mediaStreamTrack: { id: "agent" } };
    const avatarAudio = { kind: "audio", mediaStreamTrack: { id: "avatar" } };
    const avatarVideo = { kind: "video", mediaStreamTrack: { id: "video" } };

    const createAdapter = () => ({
      attachRemoteTrack: vi.fn((_track: unknown) => Promise.resolve()),
      setupInputAnalysis: vi.fn(() => ({ volumeProvider: NO_VOLUME })),
      setupOutputAnalysis: vi.fn((_track: unknown) =>
        Promise.resolve({ volumeProvider: NO_VOLUME })
      ),
      setVolume: vi.fn(),
      setOutputDevice: vi.fn(() => Promise.resolve()),
      cleanup: vi.fn(),
    });

    let mockRoom: any;
    let handlers: Map<string, (...args: any[]) => any>;
    let adapter: ReturnType<typeof createAdapter>;
    let connection: WebRTCConnection;
    let videoTracks: unknown[];
    let modes: string[];

    const subscribe = (track: unknown, participant: unknown) =>
      handlers.get("trackSubscribed")?.(track, {}, participant);
    const unsubscribe = (track: unknown, participant: unknown) =>
      handlers.get("trackUnsubscribed")?.(track, {}, participant);
    const speakers = (...participants: unknown[]) =>
      handlers.get("activeSpeakersChanged")?.(participants);
    const capturedTracks = () =>
      adapter.setupOutputAnalysis.mock.calls.map(([track]) => track);

    beforeEach(async () => {
      mockRoom = new Room() as any;
      mockRoom.metadata = JSON.stringify({
        avatar: { participant_identity: avatar.identity },
      });
      handlers = new Map();
      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: (...args: any[]) => any) => {
          handlers.set(event, callback);
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
      adapter = createAdapter();
      setWebRTCAudioAdapterFactory(() => adapter);

      connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });
      videoTracks = [];
      onAvatarVideoTrack({ connection } as unknown as Conversation, track =>
        videoTracks.push(track)
      );
      modes = [];
      connection.onModeChange(mode => modes.push(mode));
      await subscribe(agentAudio, agent);
    });

    afterEach(() => {
      connection.close();
      delete mockRoom.metadata;
      setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
    });

    it("plays the avatar and shows its video", async () => {
      await subscribe(avatarVideo, avatar);
      await subscribe(avatarAudio, avatar);

      expect(videoTracks).toEqual([null, avatarVideo.mediaStreamTrack]);
      expect(adapter.attachRemoteTrack.mock.lastCall?.[0]).toBe(avatarAudio);
    });

    it("ignores a participant the room metadata does not name", async () => {
      await subscribe(avatarVideo, unnamed);
      await subscribe(avatarAudio, unnamed);

      expect(videoTracks).toEqual([null]);
      expect(adapter.attachRemoteTrack.mock.calls).toHaveLength(1);
    });

    it("keeps following the agent until the avatar speaks", async () => {
      await subscribe(avatarVideo, avatar);
      await subscribe(avatarAudio, avatar);
      await speakers(agent);

      expect(modes).toEqual(["speaking"]);
      expect(capturedTracks()).toEqual([agentAudio]);

      await speakers(avatar);

      expect(modes).toEqual(["speaking", "speaking"]);
      expect(capturedTracks()).toEqual([agentAudio, avatarAudio]);
    });

    it("falls back to the agent when the avatar leaves", async () => {
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);
      await subscribe(avatarVideo, avatar);
      await subscribe(avatarAudio, avatar);
      await speakers(avatar);

      unsubscribe(avatarAudio, avatar);
      unsubscribe(avatarVideo, avatar);
      handlers.get("participantDisconnected")?.(avatar);
      await speakers(agent);

      expect(videoTracks).toEqual([null, avatarVideo.mediaStreamTrack, null]);
      expect(onDisconnect).not.toHaveBeenCalled();
      expect(modes).toEqual(["speaking", "listening", "speaking"]);
      expect(capturedTracks()).toEqual([agentAudio, avatarAudio, agentAudio]);
    });

    it("starts no capture for tracks that drop after close", async () => {
      await subscribe(avatarAudio, avatar);
      await speakers(avatar);

      connection.close();
      unsubscribe(avatarAudio, avatar);
      unsubscribe(agentAudio, agent);
      handlers.get("participantDisconnected")?.(avatar);

      expect(capturedTracks()).toEqual([agentAudio, avatarAudio]);
    });
  });

  describe("conversation initiation payload", () => {
    let mockRoom: any;

    beforeEach(() => {
      mockRoom = new Room() as any;

      (mockRoom.once as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "signalConnected") {
            queueMicrotask(callback);
          }
        }
      );
      (
        mockRoom.localParticipant.getTrackPublication as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(undefined);
    });

    it("fails setup when the initiation payload cannot be published", async () => {
      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "connected") {
            queueMicrotask(callback);
          }
        }
      );
      (
        mockRoom.localParticipant.publishData as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("publish failed"));

      await expect(
        WebRTCConnection.create({
          conversationToken: "test-token",
          connectionType: "webrtc",
        })
      ).rejects.toThrow("publish failed");

      // create()'s catch must tear the room down so the caller does not keep
      // a live room and microphone for a conversation that never started.
      expect(mockRoom.disconnect).toHaveBeenCalled();
    });

    it("fails setup when the room disconnects before the payload is sent", async () => {
      let connectionStateChanged: ((state: string) => void) | undefined;

      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: (state?: unknown) => void) => {
          if (event === "connected") {
            queueMicrotask(callback);
          }
          if (event === "connectionStateChanged") {
            connectionStateChanged = callback as (state: string) => void;
          }
        }
      );

      // create() reads the microphone publication immediately before sending
      // the initiation payload, so dropping the room here lands the
      // connection in the state the send has to reject on.
      (
        mockRoom.localParticipant.getTrackPublication as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation(() => {
        connectionStateChanged?.("disconnected");
        return undefined;
      });

      await expect(
        WebRTCConnection.create({
          conversationToken: "test-token",
          connectionType: "webrtc",
        })
      ).rejects.toThrow("room not connected");

      expect(mockRoom.localParticipant.publishData).not.toHaveBeenCalled();
    });

    it("keeps mid-session sends best effort when publishing fails", async () => {
      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "connected") {
            queueMicrotask(callback);
          }
        }
      );

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      (
        mockRoom.localParticipant.publishData as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("publish failed"));

      const message: PongEvent = { type: "pong", event_id: 1 };
      await expect(connection.sendMessage(message)).resolves.toBeUndefined();

      connection.close();
    });

    // Opting in is module-wide and can't be undone, so this runs last.
    it("asks for avatar video only once the app opts in", async () => {
      (mockRoom.on as ReturnType<typeof vi.fn>).mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "connected") {
            queueMicrotask(callback);
          }
        }
      );
      const publishedPayload = () => {
        const [data] = (
          mockRoom.localParticipant.publishData as ReturnType<typeof vi.fn>
        ).mock.calls.at(-1) as [Uint8Array];
        return JSON.parse(new TextDecoder().decode(data));
      };

      const before = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });
      expect(publishedPayload()).not.toHaveProperty("avatar_video");
      before.close();

      enableAvatarVideo();

      const after = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });
      expect(publishedPayload()).toMatchObject({
        type: "conversation_initiation_client_data",
        avatar_video: true,
      });
      after.close();
    });
  });

  describe("waiting for the agent to join", () => {
    type Handler = (...args: unknown[]) => void;
    let mockRoom: any;
    let handlers: Map<string, Handler>;

    beforeEach(() => {
      mockRoom = new Room() as any;
      handlers = new Map();
      mockRoom.remoteParticipants.clear();
      mockRoom.on.mockImplementation((event: string, callback: Handler) => {
        handlers.set(event, callback);
        if (event === "connected") queueMicrotask(() => callback());
      });
      mockRoom.once.mockImplementation((event: string, callback: Handler) => {
        if (event === "signalConnected") queueMicrotask(() => callback());
      });
      mockRoom.localParticipant.getTrackPublication.mockReturnValue(undefined);
    });

    afterEach(() => {
      vi.useRealTimers();
      mockRoom.remoteParticipants.set("agent-test", {
        identity: "agent-test",
      });
    });

    const create = (webRtc?: { waitForAgent?: boolean }) =>
      WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
        webRtc,
      });

    it("does not send initiation data until the agent joins", async () => {
      const connection = create();

      await vi.waitFor(() =>
        expect(handlers.has("participantConnected")).toBe(true)
      );
      handlers.get("participantConnected")?.({ identity: "user-1" });
      await Promise.resolve();
      expect(mockRoom.localParticipant.publishData).not.toHaveBeenCalled();

      handlers.get("participantConnected")?.({ identity: "agent-1" });
      (await connection).close();
      expect(mockRoom.localParticipant.publishData).toHaveBeenCalledOnce();
    });

    it("sends immediately when the agent is already in the room", async () => {
      mockRoom.remoteParticipants.set("agent-1", { identity: "agent-1" });

      (await create()).close();
      expect(mockRoom.localParticipant.publishData).toHaveBeenCalledOnce();
    });

    it("sends immediately when waitForAgent is false", async () => {
      (await create({ waitForAgent: false })).close();
      expect(mockRoom.localParticipant.publishData).toHaveBeenCalledOnce();
    });

    it("rejects when the agent does not join in time", async () => {
      vi.useFakeTimers();
      const result = expect(create()).rejects.toThrow(
        "Timeout waiting for agent to join the room"
      );
      await vi.advanceTimersByTimeAsync(30_000);
      await result;
      expect(mockRoom.localParticipant.publishData).not.toHaveBeenCalled();
    });

    it("rejects when the room disconnected before the wait started", async () => {
      mockRoom.state = "disconnected";
      try {
        await expect(create()).rejects.toThrow(
          "Disconnected while waiting for agent to join"
        );
      } finally {
        delete mockRoom.state;
      }
    });

    it("releases audio resources when the wait fails", async () => {
      const cleanup = vi.fn();
      const track = { mediaStreamTrack: { id: "mic", kind: "audio" } };
      mockRoom.localParticipant.getTrackPublication.mockReturnValue({ track });
      const spy = vi
        .spyOn(WebRTCConnection.prototype as any, "setupInputAnalyser")
        .mockImplementation(function (this: any) {
          this.audioAdapter = { cleanup };
        });
      vi.useFakeTimers();
      try {
        const result = expect(create()).rejects.toThrow("Timeout");
        await vi.advanceTimersByTimeAsync(30_000);
        await result;
        expect(cleanup).toHaveBeenCalledOnce();
      } finally {
        spy.mockRestore();
      }
    });

    it("rejects when the room disconnects while waiting", async () => {
      const result = expect(create()).rejects.toThrow(
        "Disconnected while waiting for agent to join"
      );
      await vi.waitFor(() =>
        expect(handlers.has("participantConnected")).toBe(true)
      );
      handlers.get("disconnected")?.();
      await result;
    });
  });

  describe("overlapping input device switches", () => {
    type MockTrack = {
      mediaStreamTrack: { id: string; kind: string };
      mute: ReturnType<typeof vi.fn>;
      unmute: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };

    function createMockTrack(id: string): MockTrack {
      return {
        mediaStreamTrack: { id, kind: "audio" },
        mute: vi.fn(() => Promise.resolve()),
        unmute: vi.fn(() => Promise.resolve()),
        stop: vi.fn(),
      };
    }

    function useAnalyserSpy() {
      const setupInputAnalysis = vi.fn(() => ({
        volumeProvider: NO_VOLUME,
      }));
      setWebRTCAudioAdapterFactory(() => ({
        attachRemoteTrack: vi.fn(() => Promise.resolve()),
        setupInputAnalysis,
        setupOutputAnalysis: vi.fn(() =>
          Promise.resolve({ volumeProvider: NO_VOLUME })
        ),
        setVolume: vi.fn(),
        setOutputDevice: vi.fn(() => Promise.resolve()),
        cleanup: vi.fn(),
      }));
      return setupInputAnalysis;
    }

    let mockRoom: any;
    let connection: WebRTCConnection | undefined;
    let publishedTracks: unknown[];
    let micPublication: { track: unknown } | undefined;
    let pendingCaptures: Map<
      string,
      {
        resolve: () => void;
        reject: (error: Error) => void;
        track: MockTrack;
      }
    >;

    async function createConnectionWithMic() {
      mockRoom = new Room() as any;
      publishedTracks = [];
      micPublication = undefined;
      pendingCaptures = new Map();

      const oldTrack = createMockTrack("old-track");
      publishedTracks.push(oldTrack);
      micPublication = { track: oldTrack };

      (
        mockRoom.localParticipant.getTrackPublication as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation(() => micPublication);
      // Model livekit-client 2.21.0: unpublishTrack drops the publication
      // from its maps before its first await.
      (
        mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
      ).mockImplementation((track: unknown) => {
        publishedTracks = publishedTracks.filter(
          published => published !== track
        );
        if (micPublication?.track === track) {
          micPublication = undefined;
        }
        return Promise.resolve();
      });
      (
        mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
      ).mockImplementation((track: unknown) => {
        publishedTracks.push(track);
        micPublication = { track };
        return Promise.resolve();
      });
      (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockImplementation(
        (options: { deviceId: { exact: string } }) => {
          const deviceId = options.deviceId.exact;
          const track = createMockTrack(`track-${deviceId}`);
          let resolveCapture!: () => void;
          let rejectCapture!: (error: Error) => void;
          const capture = new Promise<MockTrack>((resolve, reject) => {
            resolveCapture = () => resolve(track);
            rejectCapture = reject;
          });
          pendingCaptures.set(deviceId, {
            resolve: resolveCapture,
            reject: rejectCapture,
            track,
          });
          return capture;
        }
      );
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

      connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });
      return { oldTrack };
    }

    afterEach(() => {
      connection?.close();
      connection = undefined;
      if (mockRoom) {
        (
          mockRoom.localParticipant.getTrackPublication as ReturnType<
            typeof vi.fn
          >
        ).mockReset();
        (
          mockRoom.localParticipant.unpublishTrack as ReturnType<typeof vi.fn>
        ).mockReset();
        (
          mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
        ).mockReset();
      }
      (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockReset();
    });

    it("rejects the second overlapping switch and publishes only the first device", async () => {
      const { oldTrack } = await createConnectionWithMic();

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      const secondSwitch = connection!.setAudioInputDevice("device-b");
      pendingCaptures.get("device-a")!.resolve();
      pendingCaptures.get("device-b")?.resolve();

      const [first, second] = await Promise.allSettled([
        firstSwitch,
        secondSwitch,
      ]);

      expect(first.status).toBe("fulfilled");
      expect(second.status).toBe("rejected");
      expect((second as PromiseRejectedResult).reason).toMatchObject({
        message: "Input device is already being set",
      });

      // The rejected call never captured a device, so the older request
      // cannot win and no second track can be published.
      expect(createLocalAudioTrack).toHaveBeenCalledTimes(1);
      expect(createLocalAudioTrack).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: { exact: "device-a" } })
      );
      expect(publishedTracks).toEqual([pendingCaptures.get("device-a")!.track]);
      expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith(
        oldTrack
      );
    });

    it("mutes the only published track after an overlapping switch attempt", async () => {
      await createConnectionWithMic();

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      const secondSwitch = connection!.setAudioInputDevice("device-b");
      pendingCaptures.get("device-a")!.resolve();
      pendingCaptures.get("device-b")?.resolve();
      await Promise.allSettled([firstSwitch, secondSwitch]);

      await connection!.input.setMuted(true);

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-a")!.track);
      expect((publishedTracks[0] as MockTrack).mute).toHaveBeenCalled();
      expect(connection!.input.isMuted()).toBe(true);
    });

    it("releases the guard after a publish failure so the next switch can run", async () => {
      const { oldTrack } = await createConnectionWithMic();

      (
        mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new Error("publish failed"));

      const failedSwitch = connection!.setAudioInputDevice("device-a");
      pendingCaptures.get("device-a")!.resolve();
      await expect(failedSwitch).rejects.toThrow("publish failed");

      expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith(
        oldTrack
      );
      expect(publishedTracks).toEqual([]);
      expect(pendingCaptures.get("device-a")!.track.stop).toHaveBeenCalled();

      const retrySwitch = connection!.setAudioInputDevice("device-b");
      pendingCaptures.get("device-b")!.resolve();
      await retrySwitch;

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-b")!.track);
    });

    it("rejects the startup microphone publish while a switch is in progress", async () => {
      await createConnectionWithMic();

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      await expect(
        (
          connection as unknown as {
            enableMicrophone: (deviceId: string) => Promise<void>;
          }
        ).enableMicrophone("device-c")
      ).rejects.toThrow("Input device is already being set");
      expect(pendingCaptures.has("device-c")).toBe(false);

      pendingCaptures.get("device-a")!.resolve();
      await firstSwitch;

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-a")!.track);
    });

    it("rejects a switch while the startup microphone publish is in progress", async () => {
      const { oldTrack } = await createConnectionWithMic();

      const startupPublish = (
        connection as unknown as {
          enableMicrophone: (deviceId: string) => Promise<void>;
        }
      ).enableMicrophone("device-c");
      await expect(connection!.setAudioInputDevice("device-a")).rejects.toThrow(
        "Input device is already being set"
      );
      expect(pendingCaptures.has("device-a")).toBe(false);

      pendingCaptures.get("device-c")!.resolve();
      await startupPublish;

      const retrySwitch = connection!.setAudioInputDevice("device-a");
      pendingCaptures.get("device-a")!.resolve();
      await retrySwitch;

      expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith(
        pendingCaptures.get("device-c")!.track
      );
      expect(publishedTracks).toEqual([
        oldTrack,
        pendingCaptures.get("device-a")!.track,
      ]);
    });

    it("does not let setMuted publish a second track during a switch", async () => {
      await createConnectionWithMic();
      const microphoneEnabledCalls = (globalThis as Record<string, unknown>)
        .__mockCalls__ as { setMicrophoneEnabled: boolean[] };
      const callsBefore = microphoneEnabledCalls.setMicrophoneEnabled.length;

      let resolvePublish!: () => void;
      const publishGate = new Promise<void>(resolve => {
        resolvePublish = resolve;
      });
      (
        mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
      ).mockImplementationOnce(() =>
        publishGate.then(() => {
          publishedTracks.push(pendingCaptures.get("device-a")!.track);
          micPublication = { track: pendingCaptures.get("device-a")!.track };
        })
      );

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      pendingCaptures.get("device-a")!.resolve();
      await vi.waitFor(() =>
        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
      );

      await connection!.input.setMuted(true);

      expect(microphoneEnabledCalls.setMicrophoneEnabled.length).toBe(
        callsBefore
      );
      expect(connection!.input.isMuted()).toBe(true);

      resolvePublish();
      await firstSwitch;

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-a")!.track);
      expect((publishedTracks[0] as MockTrack).mute).toHaveBeenCalled();
    });

    it("unmutes the new track when setMuted(false) runs during a muted switch", async () => {
      await createConnectionWithMic();
      await connection!.input.setMuted(true);

      let resolvePublish!: () => void;
      const publishGate = new Promise<void>(resolve => {
        resolvePublish = resolve;
      });
      (
        mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
      ).mockImplementationOnce(() =>
        publishGate.then(() => {
          publishedTracks.push(pendingCaptures.get("device-a")!.track);
          micPublication = { track: pendingCaptures.get("device-a")!.track };
        })
      );

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      pendingCaptures.get("device-a")!.resolve();
      await vi.waitFor(() =>
        expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
      );

      // The new track was already muted before publishing, and setMuted
      // skips the (unpublished) old track while the switch is in progress,
      // so this unmute must be applied by the switch itself.
      await connection!.input.setMuted(false);

      resolvePublish();
      await firstSwitch;

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-a")!.track);
      expect((publishedTracks[0] as MockTrack).mute).toHaveBeenCalled();
      expect((publishedTracks[0] as MockTrack).unmute).toHaveBeenCalled();
      expect(connection!.input.isMuted()).toBe(false);
    });

    it("falls back to setMicrophoneEnabled when muting the old track fails during capture", async () => {
      const { oldTrack } = await createConnectionWithMic();
      const setMicrophoneEnabled = mockRoom.localParticipant
        .setMicrophoneEnabled as ReturnType<typeof vi.fn>;
      setMicrophoneEnabled.mockClear();

      oldTrack.mute.mockRejectedValueOnce(new Error("mute unsupported"));

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      await connection!.input.setMuted(true);

      // The old track is still published while the new device is being
      // captured, so the participant-level fallback toggles that track
      // instead of leaving it live while the session reports muted.
      expect(setMicrophoneEnabled).toHaveBeenCalledTimes(1);
      expect(setMicrophoneEnabled).toHaveBeenCalledWith(false);
      expect(publishedTracks).toEqual([oldTrack]);

      pendingCaptures.get("device-a")!.resolve();
      await firstSwitch;

      expect(publishedTracks).toEqual([pendingCaptures.get("device-a")!.track]);
      expect(connection!.input.isMuted()).toBe(true);
    });

    it("does not fail a published switch when the post-publish mute fails", async () => {
      const setupInputAnalysis = useAnalyserSpy();
      try {
        await createConnectionWithMic();
        setupInputAnalysis.mockClear();

        let resolvePublish!: () => void;
        const publishGate = new Promise<void>(resolve => {
          resolvePublish = resolve;
        });
        (
          mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() =>
          publishGate.then(() => {
            publishedTracks.push(pendingCaptures.get("device-a")!.track);
            micPublication = { track: pendingCaptures.get("device-a")!.track };
          })
        );

        const firstSwitch = connection!.setAudioInputDevice("device-a");
        pendingCaptures.get("device-a")!.resolve();
        await vi.waitFor(() =>
          expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
        );

        await connection!.input.setMuted(true);
        pendingCaptures
          .get("device-a")!
          .track.mute.mockRejectedValueOnce(new Error("mute unsupported"));

        resolvePublish();
        await expect(firstSwitch).resolves.toBeUndefined();

        const newTrack = pendingCaptures.get("device-a")!.track;
        expect(publishedTracks).toEqual([newTrack]);
        expect(setupInputAnalysis).toHaveBeenCalledWith(
          newTrack.mediaStreamTrack
        );
        expect(connection!.input.isMuted()).toBe(true);
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });

    it("does not fail a published switch when the post-publish unmute fails", async () => {
      const setupInputAnalysis = useAnalyserSpy();
      try {
        await createConnectionWithMic();
        await connection!.input.setMuted(true);
        setupInputAnalysis.mockClear();

        let resolvePublish!: () => void;
        const publishGate = new Promise<void>(resolve => {
          resolvePublish = resolve;
        });
        (
          mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() =>
          publishGate.then(() => {
            publishedTracks.push(pendingCaptures.get("device-a")!.track);
            micPublication = { track: pendingCaptures.get("device-a")!.track };
          })
        );

        const firstSwitch = connection!.setAudioInputDevice("device-a");
        pendingCaptures.get("device-a")!.resolve();
        await vi.waitFor(() =>
          expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
        );

        await connection!.input.setMuted(false);
        pendingCaptures
          .get("device-a")!
          .track.unmute.mockRejectedValueOnce(new Error("unmute unsupported"));

        resolvePublish();
        await expect(firstSwitch).resolves.toBeUndefined();

        const newTrack = pendingCaptures.get("device-a")!.track;
        expect(publishedTracks).toEqual([newTrack]);
        expect(setupInputAnalysis).toHaveBeenCalledWith(
          newTrack.mediaStreamTrack
        );
        expect(connection!.input.isMuted()).toBe(false);
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });

    it("does not enable the microphone when the old track is unpublished while its unmute is in flight", async () => {
      const setupInputAnalysis = useAnalyserSpy();
      try {
        const { oldTrack } = await createConnectionWithMic();
        setupInputAnalysis.mockClear();
        const setMicrophoneEnabled = mockRoom.localParticipant
          .setMicrophoneEnabled as ReturnType<typeof vi.fn>;
        setMicrophoneEnabled.mockClear();

        let resolvePublish!: () => void;
        const publishGate = new Promise<void>(resolve => {
          resolvePublish = resolve;
        });
        (
          mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() =>
          publishGate.then(() => {
            publishedTracks.push(pendingCaptures.get("device-a")!.track);
            micPublication = { track: pendingCaptures.get("device-a")!.track };
          })
        );

        // Hold the old track's unmute open so the switch can unpublish the
        // track before the mute fallback runs.
        let rejectUnmute!: (error: Error) => void;
        const unmuteGate = new Promise<void>((_resolve, reject) => {
          rejectUnmute = reject;
        });
        oldTrack.unmute.mockImplementationOnce(() => unmuteGate);

        const firstSwitch = connection!.setAudioInputDevice("device-a");
        const setMutedPromise = connection!.input.setMuted(false);
        await vi.waitFor(() => expect(oldTrack.unmute).toHaveBeenCalled());

        pendingCaptures.get("device-a")!.resolve();
        await vi.waitFor(() =>
          expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
        );

        rejectUnmute(new Error("unmute unsupported"));
        await setMutedPromise;

        // Enabling the microphone with no publication would publish a
        // default track alongside the switch, so the fallback must stay
        // silent until the switch publishes the new track.
        expect(setMicrophoneEnabled).not.toHaveBeenCalled();

        resolvePublish();
        await expect(firstSwitch).resolves.toBeUndefined();

        expect(publishedTracks).toEqual([
          pendingCaptures.get("device-a")!.track,
        ]);
        expect(setupInputAnalysis).toHaveBeenCalledWith(
          pendingCaptures.get("device-a")!.track.mediaStreamTrack
        );
        expect(connection!.input.isMuted()).toBe(false);
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });

    it("falls back to setMicrophoneEnabled when the post-publish mute fails", async () => {
      const setupInputAnalysis = useAnalyserSpy();
      try {
        await createConnectionWithMic();
        setupInputAnalysis.mockClear();
        const setMicrophoneEnabled = mockRoom.localParticipant
          .setMicrophoneEnabled as ReturnType<typeof vi.fn>;
        setMicrophoneEnabled.mockClear();

        let resolvePublish!: () => void;
        const publishGate = new Promise<void>(resolve => {
          resolvePublish = resolve;
        });
        (
          mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() =>
          publishGate.then(() => {
            publishedTracks.push(pendingCaptures.get("device-a")!.track);
            micPublication = { track: pendingCaptures.get("device-a")!.track };
          })
        );

        const firstSwitch = connection!.setAudioInputDevice("device-a");
        pendingCaptures.get("device-a")!.resolve();
        await vi.waitFor(() =>
          expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
        );

        await connection!.input.setMuted(true);
        pendingCaptures
          .get("device-a")!
          .track.mute.mockRejectedValueOnce(new Error("mute unsupported"));

        resolvePublish();
        await expect(firstSwitch).resolves.toBeUndefined();

        const newTrack = pendingCaptures.get("device-a")!.track;
        expect(publishedTracks).toEqual([newTrack]);
        // The new track is published, so the participant-level fallback
        // toggles it instead of leaving the live mic unmuted.
        expect(setMicrophoneEnabled).toHaveBeenCalledTimes(1);
        expect(setMicrophoneEnabled).toHaveBeenCalledWith(false);
        expect(setupInputAnalysis).toHaveBeenCalledWith(
          newTrack.mediaStreamTrack
        );
        expect(connection!.input.isMuted()).toBe(true);
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });

    it("falls back to setMicrophoneEnabled when the post-publish unmute fails", async () => {
      const setupInputAnalysis = useAnalyserSpy();
      try {
        await createConnectionWithMic();
        await connection!.input.setMuted(true);
        setupInputAnalysis.mockClear();
        const setMicrophoneEnabled = mockRoom.localParticipant
          .setMicrophoneEnabled as ReturnType<typeof vi.fn>;
        setMicrophoneEnabled.mockClear();

        let resolvePublish!: () => void;
        const publishGate = new Promise<void>(resolve => {
          resolvePublish = resolve;
        });
        (
          mockRoom.localParticipant.publishTrack as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(() =>
          publishGate.then(() => {
            publishedTracks.push(pendingCaptures.get("device-a")!.track);
            micPublication = { track: pendingCaptures.get("device-a")!.track };
          })
        );

        const firstSwitch = connection!.setAudioInputDevice("device-a");
        pendingCaptures.get("device-a")!.resolve();
        await vi.waitFor(() =>
          expect(mockRoom.localParticipant.publishTrack).toHaveBeenCalled()
        );

        await connection!.input.setMuted(false);
        pendingCaptures
          .get("device-a")!
          .track.unmute.mockRejectedValueOnce(new Error("unmute unsupported"));

        resolvePublish();
        await expect(firstSwitch).resolves.toBeUndefined();

        const newTrack = pendingCaptures.get("device-a")!.track;
        expect(publishedTracks).toEqual([newTrack]);
        // The new track is published, so the participant-level fallback
        // toggles it instead of leaving the live mic muted.
        expect(setMicrophoneEnabled).toHaveBeenCalledTimes(1);
        expect(setMicrophoneEnabled).toHaveBeenCalledWith(true);
        expect(setupInputAnalysis).toHaveBeenCalledWith(
          newTrack.mediaStreamTrack
        );
        expect(connection!.input.isMuted()).toBe(false);
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });

    it("allows a switch once the previous switch finishes", async () => {
      await createConnectionWithMic();

      const firstSwitch = connection!.setAudioInputDevice("device-a");
      pendingCaptures.get("device-a")!.resolve();
      await firstSwitch;

      const secondSwitch = connection!.setAudioInputDevice("device-b");
      pendingCaptures.get("device-b")!.resolve();
      await secondSwitch;

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-b")!.track);
      expect(mockRoom.localParticipant.unpublishTrack).toHaveBeenCalledWith(
        pendingCaptures.get("device-a")!.track
      );
    });

    it("releases the guard after a failed capture so the next switch can run", async () => {
      const { oldTrack } = await createConnectionWithMic();

      const failedSwitch = connection!.setAudioInputDevice("device-a");
      pendingCaptures.get("device-a")!.reject(new Error("device unavailable"));
      await expect(failedSwitch).rejects.toThrow("device unavailable");

      expect(publishedTracks).toEqual([oldTrack]);
      expect(mockRoom.localParticipant.unpublishTrack).not.toHaveBeenCalled();

      const retrySwitch = connection!.setAudioInputDevice("device-b");
      pendingCaptures.get("device-b")!.resolve();
      await retrySwitch;

      expect(publishedTracks).toHaveLength(1);
      expect(publishedTracks[0]).toBe(pendingCaptures.get("device-b")!.track);
    });
  });
});
