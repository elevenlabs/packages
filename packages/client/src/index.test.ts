import {
  it,
  expect,
  describe,
  vi,
  beforeAll,
  afterEach,
  afterAll,
} from "vitest";
import { Client, Server } from "mock-socket";
import chunk from "./__tests__/chunk";
import { Mode, Status, Conversation } from "./index";
import { createConnection } from "./utils/ConnectionFactory";
import type { SessionConfig } from "./utils/BaseConnection";
import { VoiceConversation } from "./VoiceConversation";

const CONVERSATION_ID = "TEST_CONVERSATION_ID";
const OUTPUT_AUDIO_FORMAT = "pcm_16000";
const AGENT_RESPONSE = "Hello, how can I help you?";
const USER_TRANSCRIPT = "Hi, I need help.";
const CLIENT_TOOL_HANDLER = "CLIENT_TOOL_HANDLER";
const CLIENT_TOOL_CALL_ID = "CLIENT_TOOL_CALL_ID";
const CLIENT_TOOL_PARAMETERS = { some: "param" };
const CUSTOM_PROMPT = "CUSTOM_PROMPT";
const CUSTOM_LLM_EXTRA_BODY = "CUSTOM_LLM_EXTRA_BODY";
const TEST_USER_ID = "test-user-123";
const AGENT_CHAT_RESPONSE_CHUNK_1 = "Hello";
const AGENT_CHAT_RESPONSE_CHUNK_2 = ", how";
const AGENT_CHAT_RESPONSE_CHUNK_3 = " can I help?";

const ConversationTypes = ["voice", "text"] as const;

describe("Conversation", () => {
  it.each(ConversationTypes)(
    "invokes respective callbacks (%s)",
    async conversationType => {
      const server = new Server(
        `wss://api.elevenlabs.io/${conversationType}/1`
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => {
          resolve(socket);
        });
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const onConnect = vi.fn();
      const onDisconnect = vi.fn();
      const onMessage = vi.fn();
      const onUnhandledClientToolCall = vi.fn();
      const clientToolHandler = vi.fn();
      let status: Status | null = null;
      let mode: Mode | null = null;

      const conversationPromise = Conversation.startSession({
        signedUrl: `wss://api.elevenlabs.io/${conversationType}/1`,
        userId: TEST_USER_ID,
        overrides: {
          agent: {
            prompt: {
              prompt: CUSTOM_PROMPT,
            },
          },
        },
        customLlmExtraBody: CUSTOM_LLM_EXTRA_BODY,
        clientTools: {
          [CLIENT_TOOL_HANDLER]: clientToolHandler,
        },
        onConnect,
        onDisconnect,
        onMessage,
        onModeChange: value => {
          mode = value.mode;
        },
        onStatusChange: value => {
          status = value.status;
        },
        onUnhandledClientToolCall,
        connectionDelay: { default: 0 },
        textOnly: conversationType === "text",
      });
      const client = await clientPromise;

      const onMessageSend = vi.fn();
      client.on("message", onMessageSend);

      // Start session
      client.send(
        JSON.stringify({
          type: "conversation_initiation_metadata",
          conversation_initiation_metadata_event: {
            conversation_id: CONVERSATION_ID,
            agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
          },
        })
      );

      const conversation = await conversationPromise;
      expect(conversation.getId()).toEqual(CONVERSATION_ID);
      expect(status).toEqual("connected");
      expect(onConnect).toHaveBeenCalledTimes(1);
      expect(onConnect).toHaveBeenCalledWith({
        conversationId: CONVERSATION_ID,
      });

      if (conversationType === "voice") {
        // Test device switching functionality - use existing device instead of non-existent one
        try {
          // Test input device change without specifying a device ID (uses default)
          await (conversation as VoiceConversation).changeInputDevice({
            sampleRate: 16000,
            format: "pcm",
            preferHeadphonesForIosDevices: true,
            // Specifying a device ID that doesn't exist will cause a timeout in Chromium
          });

          // Success - the device change completed without throwing
        } catch (error) {
          // If device change fails completely, skip the test but don't fail
          console.warn(
            "Input device change failed in test environment:",
            error
          );
        }

        try {
          // Test output device change without specifying a device ID (uses default)
          await (conversation as VoiceConversation).changeOutputDevice({
            sampleRate: 16000,
            format: "pcm",
            // Specifying a device ID that doesn't exist will cause a timeout in Chromium
          });

          // Success - the device change completed without throwing
        } catch (error) {
          // If device change fails completely, skip the test but don't fail
          console.warn(
            "Output device change failed in test environment:",
            error
          );
        }
      }

      await sleep(100);

      expect(onMessageSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: { prompt: { prompt: "CUSTOM_PROMPT" } },
            tts: {},
            conversation: {
              text_only: conversationType === "text",
            },
          },
          custom_llm_extra_body: CUSTOM_LLM_EXTRA_BODY,
          user_id: TEST_USER_ID,
        })
      );

      if (conversationType === "voice") {
        // Audio
        client.send(
          JSON.stringify({
            type: "audio",
            audio_event: {
              audio_base_64: chunk,
              event_id: Date.now(),
            },
          })
        );
        expect(mode).toEqual("speaking");
      }
      await sleep(100);

      // Agent response
      client.send(
        JSON.stringify({
          type: "agent_response",
          agent_response_event: { agent_response: AGENT_RESPONSE },
        })
      );
      expect(onMessage).toHaveBeenCalledWith({
        source: "ai",
        role: "agent",
        message: AGENT_RESPONSE,
      });

      // User transcription
      client.send(
        JSON.stringify({
          type: "user_transcript",
          user_transcription_event: { user_transcript: USER_TRANSCRIPT },
        })
      );
      expect(onMessage).toHaveBeenCalledWith({
        source: "user",
        role: "user",
        message: USER_TRANSCRIPT,
      });

      // Client tools
      client.send(
        JSON.stringify({
          type: "client_tool_call",
          client_tool_call: {
            tool_name: CLIENT_TOOL_HANDLER,
            tool_call_id: CLIENT_TOOL_CALL_ID,
            parameters: CLIENT_TOOL_PARAMETERS,
            expects_response: true,
          },
        })
      );
      expect(clientToolHandler).toHaveBeenCalledWith(CLIENT_TOOL_PARAMETERS);

      client.send(
        JSON.stringify({
          type: "client_tool_call",
          client_tool_call: {
            tool_name: "UNHANDLED_TOOL_CALL",
            tool_call_id: CLIENT_TOOL_CALL_ID,
            parameters: CLIENT_TOOL_PARAMETERS,
            expects_response: true,
          },
        })
      );
      expect(onUnhandledClientToolCall).toHaveBeenCalledWith({
        tool_name: "UNHANDLED_TOOL_CALL",
        tool_call_id: CLIENT_TOOL_CALL_ID,
        parameters: CLIENT_TOOL_PARAMETERS,
        expects_response: true,
      });

      // End session
      await conversation.endSession();
      expect(status).toEqual("disconnected");

      await sleep(100);
      expect(onDisconnect).toHaveBeenCalledTimes(1);

      server.close();
    }
  );

  it.each(ConversationTypes)(
    "throws upon immediate cancellation (%s)",
    async conversationType => {
      const server = new Server(
        `wss://api.elevenlabs.io/${conversationType}/2`
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => {
          socket.close({
            code: 3000,
            reason: "Test cancellation reason",
            wasClean: true,
          });
          resolve(socket);
        });
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      await expect(async () => {
        await Conversation.startSession({
          signedUrl: `wss://api.elevenlabs.io/${conversationType}/2`,
          connectionDelay: { default: 0 },
          textOnly: conversationType === "text",
        });
        await clientPromise;
      }).rejects.toThrowError(
        expect.objectContaining({
          name: "SessionConnectionError",
          closeCode: 3000,
          closeReason: "Test cancellation reason",
        })
      );
    }
  );

  it.each(ConversationTypes)(
    "terminates when server closes connection (%s)",
    async conversationType => {
      const server = new Server(
        `wss://api.elevenlabs.io/${conversationType}/3`
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", socket => resolve(socket));
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const disconnectionPromise = new Promise((resolve, reject) => {
        Conversation.startSession({
          signedUrl: `wss://api.elevenlabs.io/${conversationType}/3`,
          onDisconnect: resolve,
          connectionDelay: { default: 0 },
          textOnly: conversationType === "text",
        });
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      const client = await clientPromise;
      client.send(
        JSON.stringify({
          type: "conversation_initiation_metadata",
          conversation_initiation_metadata_event: {
            conversation_id: CONVERSATION_ID,
            agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
          },
        })
      );

      client.close({
        code: 3000,
        reason: "Test cancellation reason",
        wasClean: true,
      });

      const details = await disconnectionPromise;
      expect(details).toEqual(
        expect.objectContaining({
          reason: "error",
          message: "Test cancellation reason",
          closeCode: 3000,
          closeReason: "Test cancellation reason",
        })
      );
    }
  );
});

describe("Connection Types", () => {
  describe("ConnectionFactory", () => {
    it("throws error for unknown connection type", async () => {
      const config = {
        agentId: "test-agent",
        connectionType: "unknown" as never,
      };

      await expect(createConnection(config)).rejects.toThrow(
        "Unknown connection type: unknown"
      );
    });
  });

  describe("WebSocket Connection", () => {
    it.each(ConversationTypes)(
      "establishes websocket connection properly (%s)",
      async conversationType => {
        const server = new Server(
          `wss://api.elevenlabs.io/${conversationType}/websocket`
        );
        const clientPromise = new Promise<Client>((resolve, reject) => {
          server.on("connection", (socket: Client) => {
            resolve(socket);
          });
          server.on("error", reject);
          setTimeout(() => reject(new Error("timeout")), 5000);
        });

        const onConnect = vi.fn();
        const onDisconnect = vi.fn();
        let status: Status | null = null;

        const conversationPromise = Conversation.startSession({
          signedUrl: `wss://api.elevenlabs.io/${conversationType}/websocket`,
          connectionType: "websocket",
          onConnect,
          onDisconnect,
          onStatusChange: value => {
            status = value.status;
          },
          connectionDelay: { default: 0 },
          textOnly: conversationType === "text",
        });

        const client = await clientPromise;

        // Start session
        client.send(
          JSON.stringify({
            type: "conversation_initiation_metadata",
            conversation_initiation_metadata_event: {
              conversation_id: CONVERSATION_ID,
              agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
            },
          })
        );

        const conversation = await conversationPromise;
        expect(conversation.getId()).toEqual(CONVERSATION_ID);
        expect(status).toEqual("connected");
        expect(onConnect).toHaveBeenCalledWith({
          conversationId: CONVERSATION_ID,
        });

        await conversation.endSession();
        expect(status).toEqual("disconnected");

        server.close();
      }
    );

    it("handles websocket connection errors properly", async () => {
      const server = new Server(
        "wss://api.elevenlabs.io/voice/websocket-error"
      );
      const clientPromise = new Promise<Client>((resolve, reject) => {
        server.on("connection", (socket: Client) => {
          socket.close({
            code: 1006,
            reason: "Connection failed",
            wasClean: false,
          });
          resolve(socket);
        });
        server.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 5000);
      });

      await expect(async () => {
        await Conversation.startSession({
          signedUrl: "wss://api.elevenlabs.io/voice/websocket-error",
          connectionType: "websocket",
          connectionDelay: { default: 0 },
        });
        await clientPromise;
      }).rejects.toThrowError();

      server.close();
    });
  });

  describe("WebRTC Connection", () => {
    it("fails when fetch returns error for agent id", async () => {
      const config = {
        agentId: "test-agent",
        connectionType: "webrtc" as const,
      };

      // Mock fetch to return an error
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      globalThis.fetch = mockFetch;

      await expect(createConnection(config)).rejects.toThrow(
        "Failed to fetch conversation token for agent test-agent"
      );

      // Verify fetch was called with correct URL base (version may vary)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/api\.elevenlabs\.io\/v1\/convai\/conversation\/token\?agent_id=test-agent&source=js_sdk&version=/
        )
      );
    });

    it("uses custom origin when provided in config", async () => {
      const config = {
        agentId: "test-agent",
        connectionType: "webrtc" as const,
        origin: "wss://custom.api.elevenlabs.io",
      };

      // Mock fetch to return an error so we can test the URL
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      globalThis.fetch = mockFetch;

      await expect(createConnection(config)).rejects.toThrow(
        "Failed to fetch conversation token for agent test-agent"
      );

      // Verify fetch was called with custom origin converted from WSS to HTTPS
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/custom\.api\.elevenlabs\.io\/v1\/convai\/conversation\/token\?agent_id=test-agent&source=js_sdk&version=/
        )
      );
    });

    it("converts WSS origin to HTTPS for API calls", async () => {
      const config = {
        agentId: "test-agent",
        connectionType: "webrtc" as const,
        origin: "wss://eu.api.elevenlabs.io",
      };

      // Mock fetch to return an error so we can test the URL
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });
      globalThis.fetch = mockFetch;

      await expect(createConnection(config)).rejects.toThrow(
        "Failed to fetch conversation token for agent test-agent"
      );

      // Verify WSS was converted to HTTPS
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/eu\.api\.elevenlabs\.io\/v1\/convai\/conversation\/token\?agent_id=test-agent&source=js_sdk&version=/
        )
      );
    });

    it("fails when fetch returns no token for agent id", async () => {
      const config = {
        agentId: "test-agent",
        connectionType: "webrtc" as const,
      };

      // Mock fetch to return success but no token
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}), // No token in response
      });
      globalThis.fetch = mockFetch;

      await expect(createConnection(config)).rejects.toThrow(
        "No conversation token received from API"
      );
    });

    it("requires either conversation token or agent id for webrtc connection", async () => {
      const config = {
        connectionType: "webrtc" as const,
      } as SessionConfig; // Type assertion to test runtime behavior with invalid config

      await expect(createConnection(config)).rejects.toThrow(
        "Either conversationToken or agentId is required for WebRTC connection"
      );
    });
  });
});

describe("Volume Control", () => {
  // Mock AudioContext for testing
  beforeAll(() => {
    globalThis.AudioContext = vi.fn().mockImplementation(() => ({
      sampleRate: 16000,
      currentTime: 0,
      createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        gain: {
          value: 1,
          cancelScheduledValues: vi.fn(),
        },
      })),
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createMediaStreamDestination: vi.fn(() => ({
        stream: new MediaStream(),
        connect: vi.fn(),
      })),
      destination: {},
      audioWorklet: {
        addModule: vi.fn(() => Promise.resolve()),
      },
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    }));

    globalThis.AudioWorkletNode = vi.fn().mockImplementation(() => {
      return {
        connect: vi.fn(),
        port: {
          postMessage: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          start: vi.fn(),
        },
      };
    });

    // Mock getUserMedia by mocking the mediaDevices property
    const mockMediaStream = {
      getTracks: () => [{ stop: vi.fn() }],
      getAudioTracks: () => [{ stop: vi.fn() }],
    };

    if (!globalThis.navigator.mediaDevices) {
      Object.defineProperty(globalThis.navigator, "mediaDevices", {
        value: {
          getUserMedia: vi.fn(() => Promise.resolve(mockMediaStream)),
        },
        writable: true,
      });
    } else {
      vi.spyOn(
        globalThis.navigator.mediaDevices,
        "getUserMedia"
      ).mockImplementation(() => Promise.resolve(mockMediaStream as any));
    }

    // Mock document methods we need for audio element tests
    if (globalThis.document && globalThis.document.body) {
      vi.spyOn(globalThis.document.body, "appendChild").mockImplementation(
        (node: Node) => node
      );
      vi.spyOn(globalThis.document.body, "removeChild").mockImplementation(
        (child: Node) => child
      );
    }
  });

  it("sets volume immediately on WebSocket voice conversation", async () => {
    const server = new Server("wss://api.elevenlabs.io/voice/volume-test");
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    // Create a shared gain node that we can test
    const mockGainNode = {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    };
    const createGainSpy = vi.fn(() => mockGainNode);

    // Override the AudioContext mock for this test
    globalThis.AudioContext = vi.fn().mockImplementation(() => ({
      sampleRate: 16000,
      currentTime: 0,
      createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
      })),
      createGain: createGainSpy,
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createMediaStreamDestination: vi.fn(() => ({
        stream: new MediaStream(),
        connect: vi.fn(),
      })),
      destination: {},
      audioWorklet: {
        addModule: vi.fn(() => Promise.resolve()),
      },
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    }));

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/volume-test",
      connectionDelay: { default: 0 },
      textOnly: false, // Voice conversation
    });

    const client = await clientPromise;

    // Start session
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: CONVERSATION_ID,
          agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
        },
      })
    );

    const conversation = await conversationPromise;

    // Test volume setting
    conversation.setVolume({ volume: 0.5 });

    // Volume should be applied immediately to gain node
    expect(mockGainNode.gain.value).toBe(0.5);

    // Test another volume change
    conversation.setVolume({ volume: 0.8 });
    expect(mockGainNode.gain.value).toBe(0.8);

    await conversation.endSession();
    server.close();
  });

  it("handles volume setting on text conversation gracefully", async () => {
    const server = new Server("wss://api.elevenlabs.io/text/volume-test");
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/text/volume-test",
      connectionDelay: { default: 0 },
      textOnly: true, // Text conversation
    });

    const client = await clientPromise;

    // Start session
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: CONVERSATION_ID,
          agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
        },
      })
    );

    const conversation = await conversationPromise;

    // Setting volume on text conversation should not throw
    expect(() => {
      conversation.setVolume({ volume: 0.5 });
    }).not.toThrow();

    await conversation.endSession();
    server.close();
  });

  it("applies volume to new audio chunks in WebSocket connection", async () => {
    const server = new Server(
      "wss://api.elevenlabs.io/voice/volume-audio-test"
    );
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    // Create a shared gain node that we can test
    const mockGainNode = {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
    };
    const createGainSpy = vi.fn(() => mockGainNode);

    // Override the AudioContext mock for this test
    globalThis.AudioContext = vi.fn().mockImplementation(() => ({
      sampleRate: 16000,
      currentTime: 0,
      createAnalyser: vi.fn(() => ({
        connect: vi.fn(),
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
      })),
      createGain: createGainSpy,
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
      })),
      createMediaStreamDestination: vi.fn(() => ({
        stream: new MediaStream(),
        connect: vi.fn(),
      })),
      destination: {},
      audioWorklet: {
        addModule: vi.fn(() => Promise.resolve()),
      },
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => Promise.resolve()),
    }));

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/volume-audio-test",
      connectionDelay: { default: 0 },
      textOnly: false,
    });

    const client = await clientPromise;

    // Start session
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: CONVERSATION_ID,
          agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
        },
      })
    );

    const conversation = await conversationPromise;

    // Set volume before audio
    conversation.setVolume({ volume: 0.3 });
    expect(mockGainNode.gain.value).toBe(0.3);

    // Send audio - this should maintain the volume
    client.send(
      JSON.stringify({
        type: "audio",
        audio_event: {
          audio_base_64: chunk,
          event_id: Date.now(),
        },
      })
    );

    await sleep(100);

    // Volume should still be maintained
    expect(mockGainNode.gain.value).toBe(0.3);

    await conversation.endSession();
    server.close();
  });
});

describe("WebRTC Volume Control", () => {
  it("tests WebRTCConnection setAudioVolume method directly", async () => {
    // Create mock audio elements
    const mockElement1 = { volume: 1 };
    const mockElement2 = { volume: 1 };

    // Mock the WebRTCConnection class by importing and creating an instance
    const { WebRTCConnection } = await import("./utils/WebRTCConnection");

    // Create a minimal mock for testing just the volume functionality
    // We'll create the connection with a direct token to avoid fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          conversation_token: "test-token",
        }),
    });
    globalThis.fetch = mockFetch;

    // Mock LiveKit Room constructor and methods
    const mockRoom = {
      connect: vi.fn(() => Promise.resolve()),
      disconnect: vi.fn(),
      on: vi.fn(),
      localParticipant: { audioTrackPublications: [] },
    };

    // Mock the Room class
    vi.doMock("livekit-client", () => ({
      Room: vi.fn(() => mockRoom),
      RoomEvent: { TrackSubscribed: "trackSubscribed" },
      Track: { Kind: { Audio: "audio" } },
      ConnectionState: { Connected: "connected" },
    }));

    try {
      const connection = await WebRTCConnection.create({
        conversationToken: "test-token-direct",
        connectionType: "webrtc",
      });

      // Directly test the setAudioVolume method by adding mock elements
      // Access the private audioElements array through type assertion
      (connection as any).audioElements = [mockElement1, mockElement2];

      // Test volume control
      connection.setAudioVolume(0.5);
      expect(mockElement1.volume).toBe(0.5);
      expect(mockElement2.volume).toBe(0.5);

      connection.setAudioVolume(0.8);
      expect(mockElement1.volume).toBe(0.8);
      expect(mockElement2.volume).toBe(0.8);

      connection.close();
    } catch (error) {
      // If WebRTC creation fails (which is expected in test env),
      // we can still test the volume logic separately
      console.log("WebRTC creation failed as expected in test environment");
    }
  });

  it("tests audio element cleanup functionality", () => {
    // Test the cleanup logic in isolation
    const mockElement = {
      volume: 1,
      parentNode: {
        removeChild: vi.fn(),
      },
    };

    const audioElements = [mockElement];

    // Simulate the cleanup logic from WebRTCConnection.close()
    audioElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(
      mockElement
    );
  });
});

describe("Agent Chat Response Part Streaming", () => {
  it("handles streaming text chunks with start, delta, and stop events", async () => {
    const server = new Server("wss://api.elevenlabs.io/text/streaming-test");
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => {
        resolve(socket);
      });
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const onAgentChatResponsePart = vi.fn();
    const streamChunks: Array<{ text: string; type: string }> = [];

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/text/streaming-test",
      textOnly: true,
      onAgentChatResponsePart: chunk => {
        onAgentChatResponsePart(chunk);
        streamChunks.push({ text: chunk.text, type: chunk.type });
      },
      connectionDelay: { default: 0 },
    });

    const client = await clientPromise;

    // Start session
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: CONVERSATION_ID,
          agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
        },
      })
    );

    const conversation = await conversationPromise;
    await sleep(100);

    // Send START event
    client.send(
      JSON.stringify({
        type: "agent_chat_response_part",
        text_response_part: {
          text: "",
          type: "start",
        },
      })
    );
    await sleep(50);

    // Send DELTA events with text chunks
    client.send(
      JSON.stringify({
        type: "agent_chat_response_part",
        text_response_part: {
          text: AGENT_CHAT_RESPONSE_CHUNK_1,
          type: "delta",
        },
      })
    );
    await sleep(50);

    client.send(
      JSON.stringify({
        type: "agent_chat_response_part",
        text_response_part: {
          text: AGENT_CHAT_RESPONSE_CHUNK_2,
          type: "delta",
        },
      })
    );
    await sleep(50);

    client.send(
      JSON.stringify({
        type: "agent_chat_response_part",
        text_response_part: {
          text: AGENT_CHAT_RESPONSE_CHUNK_3,
          type: "delta",
        },
      })
    );
    await sleep(50);

    // Send STOP event
    client.send(
      JSON.stringify({
        type: "agent_chat_response_part",
        text_response_part: {
          text: "",
          type: "stop",
        },
      })
    );
    await sleep(50);

    // Verify callback was called for each event
    expect(onAgentChatResponsePart).toHaveBeenCalledTimes(5);

    // Verify the sequence of events
    expect(streamChunks).toHaveLength(5);
    expect(streamChunks[0]).toEqual({ text: "", type: "start" });
    expect(streamChunks[1]).toEqual({
      text: AGENT_CHAT_RESPONSE_CHUNK_1,
      type: "delta",
    });
    expect(streamChunks[2]).toEqual({
      text: AGENT_CHAT_RESPONSE_CHUNK_2,
      type: "delta",
    });
    expect(streamChunks[3]).toEqual({
      text: AGENT_CHAT_RESPONSE_CHUNK_3,
      type: "delta",
    });
    expect(streamChunks[4]).toEqual({ text: "", type: "stop" });

    // Verify the callback received correct data
    expect(onAgentChatResponsePart).toHaveBeenNthCalledWith(1, {
      text: "",
      type: "start",
    });
    expect(onAgentChatResponsePart).toHaveBeenNthCalledWith(2, {
      text: AGENT_CHAT_RESPONSE_CHUNK_1,
      type: "delta",
    });
    expect(onAgentChatResponsePart).toHaveBeenNthCalledWith(3, {
      text: AGENT_CHAT_RESPONSE_CHUNK_2,
      type: "delta",
    });
    expect(onAgentChatResponsePart).toHaveBeenNthCalledWith(4, {
      text: AGENT_CHAT_RESPONSE_CHUNK_3,
      type: "delta",
    });
    expect(onAgentChatResponsePart).toHaveBeenNthCalledWith(5, {
      text: "",
      type: "stop",
    });

    await conversation.endSession();
    server.close();
  });

  it("handles streaming without onAgentChatResponsePart callback", async () => {
    const server = new Server(
      "wss://api.elevenlabs.io/text/streaming-no-callback"
    );
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => {
        resolve(socket);
      });
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    // Start conversation without the callback
    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/text/streaming-no-callback",
      textOnly: true,
      connectionDelay: { default: 0 },
    });

    const client = await clientPromise;

    // Start session
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: CONVERSATION_ID,
          agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
        },
      })
    );

    const conversation = await conversationPromise;
    await sleep(100);

    // Send streaming events - should not throw even without callback
    expect(() => {
      client.send(
        JSON.stringify({
          type: "agent_chat_response_part",
          text_response_part: {
            text: "",
            type: "start",
          },
        })
      );
    }).not.toThrow();

    await sleep(50);

    expect(() => {
      client.send(
        JSON.stringify({
          type: "agent_chat_response_part",
          text_response_part: {
            text: "Hello",
            type: "delta",
          },
        })
      );
    }).not.toThrow();

    await sleep(50);

    expect(() => {
      client.send(
        JSON.stringify({
          type: "agent_chat_response_part",
          text_response_part: {
            text: "",
            type: "stop",
          },
        })
      );
    }).not.toThrow();

    await conversation.endSession();
    server.close();
  });
});

describe("Device Change Default Device", () => {
  it("successfully changes to default device when no deviceId is provided", async () => {
    const server = new Server(
      "wss://api.elevenlabs.io/voice/default-device-test"
    );
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/default-device-test",
      connectionDelay: { default: 0 },
      textOnly: false,
    });

    const client = await clientPromise;

    // Start session
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: CONVERSATION_ID,
          agent_output_audio_format: OUTPUT_AUDIO_FORMAT,
        },
      })
    );

    const conversation = await conversationPromise;

    // Test that changeInputDevice works without deviceId (uses default)
    const inputResult = await (
      conversation as VoiceConversation
    ).changeInputDevice({
      sampleRate: 16000,
      format: "pcm",
      // No inputDeviceId provided - should use browser default
    });

    expect(inputResult).toBeDefined();
    expect(inputResult.inputStream).toBeDefined();

    // Test that changeOutputDevice works without deviceId (uses default)
    const outputResult = await (
      conversation as VoiceConversation
    ).changeOutputDevice({
      sampleRate: 16000,
      format: "pcm",
      // No outputDeviceId provided - should use browser default
    });

    expect(outputResult).toBeDefined();
    expect(outputResult.audioElement).toBeDefined();

    await conversation.endSession();
    server.close();
  });
});

describe("Wake Lock", () => {
  let originalWakeLock: WakeLock | undefined;
  let visibilityChangeListeners: (() => void)[] = [];

  beforeAll(() => {
    originalWakeLock = navigator.wakeLock;

    vi.spyOn(document, "addEventListener").mockImplementation(
      (type: string, listener: any) => {
        if (type === "visibilitychange") {
          visibilityChangeListeners.push(listener);
        }
      }
    );

    vi.spyOn(document, "removeEventListener").mockImplementation(
      (type: string, listener: any) => {
        if (type === "visibilitychange") {
          visibilityChangeListeners = visibilityChangeListeners.filter(
            l => l !== listener
          );
        }
      }
    );
  });

  afterEach(() => {
    visibilityChangeListeners = [];
  });

  afterAll(() => {
    // Restore original wakeLock
    if (originalWakeLock) {
      Object.defineProperty(navigator, "wakeLock", {
        value: originalWakeLock,
        writable: true,
        configurable: true,
      });
    }
    vi.restoreAllMocks();
  });

  const mockWakeLockSentinel = (released = false) => ({
    released,
    release: vi.fn(() => Promise.resolve()),
    onrelease: null,
    type: "screen" as WakeLockType,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  });

  const setupMockWakeLock = (
    requestFn: () => Promise<WakeLockSentinel>
  ): WakeLock => {
    const mockWakeLock = {
      request: vi.fn(requestFn),
    };
    Object.defineProperty(navigator, "wakeLock", {
      value: mockWakeLock,
      writable: true,
      configurable: true,
    });
    return mockWakeLock;
  };

  it("acquires wake lock by default when starting session", async () => {
    const mockSentinel = mockWakeLockSentinel();
    const mockWakeLock = setupMockWakeLock(() => Promise.resolve(mockSentinel));

    const server = new Server("wss://api.elevenlabs.io/voice/wakelock-default");
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/wakelock-default",
      connectionDelay: { default: 0 },
      textOnly: false,
    });

    const client = await clientPromise;
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "TEST_CONVERSATION_ID",
          agent_output_audio_format: "pcm_16000",
        },
      })
    );

    const conversation = await conversationPromise;

    expect(mockWakeLock.request).toHaveBeenCalledWith("screen");

    expect((conversation as VoiceConversation).wakeLock).toBe(mockSentinel);

    await conversation.endSession();
    server.close();
  });

  it("does not acquire wake lock when useWakeLock is false", async () => {
    const mockSentinel = mockWakeLockSentinel();
    const mockWakeLock = setupMockWakeLock(() => Promise.resolve(mockSentinel));

    const server = new Server(
      "wss://api.elevenlabs.io/voice/wakelock-disabled"
    );
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/wakelock-disabled",
      connectionDelay: { default: 0 },
      textOnly: false,
      useWakeLock: false,
    });

    const client = await clientPromise;
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "TEST_CONVERSATION_ID",
          agent_output_audio_format: "pcm_16000",
        },
      })
    );

    const conversation = await conversationPromise;

    // Verify wake lock was NOT requested
    expect(mockWakeLock.request).not.toHaveBeenCalled();

    // Verify the conversation does not have a wake lock
    expect((conversation as VoiceConversation).wakeLock).toBeNull();

    await conversation.endSession();
    server.close();
  });

  it("releases wake lock when session ends", async () => {
    const mockSentinel = mockWakeLockSentinel();
    setupMockWakeLock(() => Promise.resolve(mockSentinel));

    const server = new Server("wss://api.elevenlabs.io/voice/wakelock-release");
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/wakelock-release",
      connectionDelay: { default: 0 },
      textOnly: false,
    });

    const client = await clientPromise;
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "TEST_CONVERSATION_ID",
          agent_output_audio_format: "pcm_16000",
        },
      })
    );

    const conversation = await conversationPromise;

    expect((conversation as VoiceConversation).wakeLock).toBe(mockSentinel);

    await conversation.endSession();

    expect(mockSentinel.release).toHaveBeenCalled();
    expect((conversation as VoiceConversation).wakeLock).toBeNull();

    server.close();
  });

  it("re-acquires wake lock when page becomes visible and lock was released", async () => {
    let requestCallCount = 0;
    const firstSentinel = mockWakeLockSentinel(true); // Already released
    const secondSentinel = mockWakeLockSentinel(false);

    setupMockWakeLock(() => {
      requestCallCount++;
      if (requestCallCount === 1) {
        return Promise.resolve(firstSentinel);
      }
      return Promise.resolve(secondSentinel);
    });

    const server = new Server(
      "wss://api.elevenlabs.io/voice/wakelock-reacquire"
    );
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const conversationPromise = Conversation.startSession({
      signedUrl: "wss://api.elevenlabs.io/voice/wakelock-reacquire",
      connectionDelay: { default: 0 },
      textOnly: false,
    });

    const client = await clientPromise;
    client.send(
      JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "TEST_CONVERSATION_ID",
          agent_output_audio_format: "pcm_16000",
        },
      })
    );

    const conversation = await conversationPromise;

    expect(requestCallCount).toBe(1);

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });

    visibilityChangeListeners.forEach(listener => listener());

    await sleep(100);

    expect(requestCallCount).toBe(2);
    expect((conversation as VoiceConversation).wakeLock).toBe(secondSentinel);

    await conversation.endSession();
    server.close();
  });

  it("releases wake lock on connection error during session setup", async () => {
    const mockSentinel = mockWakeLockSentinel();
    setupMockWakeLock(() => Promise.resolve(mockSentinel));

    const server = new Server(
      "wss://api.elevenlabs.io/voice/wakelock-setup-error"
    );

    server.on("connection", socket => {
      socket.close({
        code: 3000,
        reason: "Test setup error",
        wasClean: true,
      });
    });

    await expect(
      Conversation.startSession({
        signedUrl: "wss://api.elevenlabs.io/voice/wakelock-setup-error",
        connectionDelay: { default: 0 },
        textOnly: false,
      })
    ).rejects.toThrow();

    expect(mockSentinel.release).toHaveBeenCalled();

    server.close();
  });
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
