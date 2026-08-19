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
import { setWebRTCAudioAdapterFactory } from "../WebRTCAudioAdapter.js";
import { WebAudioAdapter } from "../platform/web/webAudioAdapter.js";
import { NO_VOLUME } from "./volumeProvider.js";
import type { PongEvent } from "./events.js";

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

      eventHandlers.get("disconnected")?.("client_initiated");

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: { type: "close", reason: "client_initiated" },
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

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: { type: "close", reason: "agent disconnected" },
      });
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
  });

  describe("device option parity with the WebSocket path", () => {
    function mockConnectedRoom() {
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

    it("rejects a sampleRate change on the input device, even alongside a device id", async () => {
      mockConnectedRoom();
      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      await expect(
        connection.input.setDevice({
          sampleRate: 16000,
          inputDeviceId: "mic-2",
        })
      ).rejects.toThrow(/sampleRate or format/);

      expect(createLocalAudioTrack).not.toHaveBeenCalled();

      connection.close();
    });

    it("rejects a format change on the input device", async () => {
      mockConnectedRoom();
      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      await expect(
        connection.input.setDevice({ format: "ulaw" })
      ).rejects.toThrow(/sampleRate or format/);

      connection.close();
    });

    it("switches the input device when the negotiated sampleRate and format are re-passed unchanged", async () => {
      const mockRoom = mockConnectedRoom();
      (
        mockRoom.localParticipant.getTrackPublication as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(undefined);
      (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValue({
        mediaStreamTrack: { id: "new-track", kind: "audio" },
      });

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      // WebRTC always negotiates pcm_48000 (see connectionType: "webrtc"
      // handling in create()), so re-sending that same pair is not a change
      // request, and callers do this routinely alongside a device id.
      await expect(
        connection.input.setDevice({
          sampleRate: 48000,
          format: "pcm",
          inputDeviceId: "mic-2",
        })
      ).resolves.toBeUndefined();

      expect(createLocalAudioTrack).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: { exact: "mic-2" } })
      );

      connection.close();
    });

    it("switches the input device when only preferHeadphonesForIosDevices is also passed", async () => {
      const mockRoom = mockConnectedRoom();
      (
        mockRoom.localParticipant.getTrackPublication as ReturnType<
          typeof vi.fn
        >
      ).mockReturnValue(undefined);
      (createLocalAudioTrack as ReturnType<typeof vi.fn>).mockResolvedValue({
        mediaStreamTrack: { id: "new-track", kind: "audio" },
      });

      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      await expect(
        connection.input.setDevice({
          preferHeadphonesForIosDevices: true,
          inputDeviceId: "mic-2",
        })
      ).resolves.toBeUndefined();

      expect(createLocalAudioTrack).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: { exact: "mic-2" } })
      );

      connection.close();
    });

    it("stays a no-op when only preferHeadphonesForIosDevices is passed", async () => {
      mockConnectedRoom();
      const connection = await WebRTCConnection.create({
        conversationToken: "test-token",
        connectionType: "webrtc",
      });

      await expect(
        connection.input.setDevice({ preferHeadphonesForIosDevices: true })
      ).resolves.toBeUndefined();

      expect(createLocalAudioTrack).not.toHaveBeenCalled();

      connection.close();
    });

    it("rejects a sampleRate or format change on the output device, even alongside a device id", async () => {
      mockConnectedRoom();
      const setOutputDevice = vi.fn(() => Promise.resolve());
      setWebRTCAudioAdapterFactory(() => ({
        attachRemoteTrack: vi.fn(() => Promise.resolve()),
        setupInputAnalysis: vi.fn(() => ({ volumeProvider: NO_VOLUME })),
        setupOutputAnalysis: vi.fn(() =>
          Promise.resolve({ volumeProvider: NO_VOLUME })
        ),
        setVolume: vi.fn(),
        setOutputDevice,
        cleanup: vi.fn(),
      }));

      try {
        const connection = await WebRTCConnection.create({
          conversationToken: "test-token",
          connectionType: "webrtc",
        });

        await expect(
          connection.output.setDevice({
            sampleRate: 16000,
            format: "pcm",
            outputDeviceId: "speaker-2",
          })
        ).rejects.toThrow(/sampleRate or format/);

        expect(setOutputDevice).not.toHaveBeenCalled();

        connection.close();
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });

    it("switches the output device when the negotiated sampleRate and format are re-passed unchanged", async () => {
      mockConnectedRoom();
      const setOutputDevice = vi.fn(() => Promise.resolve());
      setWebRTCAudioAdapterFactory(() => ({
        attachRemoteTrack: vi.fn(() => Promise.resolve()),
        setupInputAnalysis: vi.fn(() => ({ volumeProvider: NO_VOLUME })),
        setupOutputAnalysis: vi.fn(() =>
          Promise.resolve({ volumeProvider: NO_VOLUME })
        ),
        setVolume: vi.fn(),
        setOutputDevice,
        cleanup: vi.fn(),
      }));

      try {
        const connection = await WebRTCConnection.create({
          conversationToken: "test-token",
          connectionType: "webrtc",
        });

        await expect(
          connection.output.setDevice({
            sampleRate: 48000,
            format: "pcm",
            outputDeviceId: "speaker-2",
          })
        ).resolves.toBeUndefined();

        expect(setOutputDevice).toHaveBeenCalledWith("speaker-2");

        connection.close();
      } finally {
        setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());
      }
    });
  });
});
