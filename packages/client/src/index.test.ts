import { it, expect, describe, vi } from "vitest";
import { Client, Server } from "mock-socket";
import chunk from "./__tests__/chunk";
import { Mode, Status, Conversation } from "./index";
import { createConnection } from "./utils/ConnectionFactory";
import type { SessionConfig } from "./utils/BaseConnection";

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

      await sleep(100);

      expect(onMessageSend).toHaveBeenCalledWith(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: { prompt: { prompt: "CUSTOM_PROMPT" } },
            tts: {},
            conversation: {},
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
          code: 3000,
          reason: "Test cancellation reason",
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
