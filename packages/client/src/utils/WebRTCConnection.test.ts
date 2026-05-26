import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

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

  describe("serverUrl resolution", () => {
    function setupRoomEvents(mockRoom: { on: Mock; once: Mock }) {
      mockRoom.on.mockImplementation((event: string, callback: () => void) => {
        if (event === "connected") queueMicrotask(callback);
      });
      mockRoom.once.mockImplementation(
        (event: string, callback: () => void) => {
          if (event === "signalConnected") queueMicrotask(callback);
        }
      );
    }

    function mockTokenFetch() {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ token: "mock-livekit-token" }),
      } as Response);
      vi.stubGlobal("fetch", fetchMock);
      return fetchMock;
    }

    it("fetches token from serverUrl origin and connects LiveKit to wss equivalent", async () => {
      const mockRoom = new Room() as any;
      setupRoomEvents(mockRoom);
      const fetchMock = mockTokenFetch();

      await WebRTCConnection.create({
        agentId: "test-agent",
        serverUrl: "https://bridge.vpc.example.com",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://bridge.vpc.example.com/v1/convai/conversation/token"
        )
      );
      expect(mockRoom.connect).toHaveBeenCalledWith(
        "wss://bridge.vpc.example.com",
        "mock-livekit-token"
      );
    });

    it("converts http:// serverUrl to ws:// for LiveKit and keeps http:// for token", async () => {
      const mockRoom = new Room() as any;
      setupRoomEvents(mockRoom);
      const fetchMock = mockTokenFetch();

      await WebRTCConnection.create({
        agentId: "test-agent",
        serverUrl: "http://localhost:7880",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "http://localhost:7880/v1/convai/conversation/token"
        )
      );
      expect(mockRoom.connect).toHaveBeenCalledWith(
        "ws://localhost:7880",
        "mock-livekit-token"
      );
    });

    it("converts ws:// serverUrl to http:// for token and keeps ws:// for LiveKit", async () => {
      const mockRoom = new Room() as any;
      setupRoomEvents(mockRoom);
      const fetchMock = mockTokenFetch();

      await WebRTCConnection.create({
        agentId: "test-agent",
        serverUrl: "ws://localhost:7880",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "http://localhost:7880/v1/convai/conversation/token"
        )
      );
      expect(mockRoom.connect).toHaveBeenCalledWith(
        "ws://localhost:7880",
        "mock-livekit-token"
      );
    });

    it("explicit origin takes precedence over serverUrl for token fetch", async () => {
      const mockRoom = new Room() as any;
      setupRoomEvents(mockRoom);
      const fetchMock = mockTokenFetch();

      await WebRTCConnection.create({
        agentId: "test-agent",
        serverUrl: "https://bridge.vpc.example.com",
        origin: "https://custom-origin.example.com",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://custom-origin.example.com/v1/convai/conversation/token"
        )
      );
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining("bridge.vpc.example.com")
      );
    });

    it("explicit livekitUrl takes precedence over serverUrl for LiveKit connection", async () => {
      const mockRoom = new Room() as any;
      setupRoomEvents(mockRoom);
      mockTokenFetch();

      await WebRTCConnection.create({
        agentId: "test-agent",
        serverUrl: "https://bridge.vpc.example.com",
        livekitUrl: "wss://custom-livekit.example.com",
      });

      expect(mockRoom.connect).toHaveBeenCalledWith(
        "wss://custom-livekit.example.com",
        "mock-livekit-token"
      );
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
});
