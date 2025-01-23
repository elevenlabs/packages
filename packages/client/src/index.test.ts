import { it, expect, describe, vi } from "vitest";
import { Conversation, Mode, Status } from ".";
import { Client, Server } from "mock-socket";
import chunk from "./__tests__/chunk";

const CONVERSATION_ID = "TEST_CONVERSATION_ID";
const OUTPUT_AUDIO_FORMAT = "pcm_16000";
const AGENT_RESPONSE = "Hello, how can I help you?";
const USER_TRANSCRIPT = "Hi, I need help.";
const CLIENT_TOOL_HANDLER = "CLIENT_TOOL_HANDLER";
const CLIENT_TOOL_CALL_ID = "CLIENT_TOOL_CALL_ID";
const CLIENT_TOOL_PARAMETERS = { some: "param" };
const CUSTOM_PROMPT = "CUSTOM_PROMPT";
const CUSTOM_LLM_EXTRA_BODY = "CUSTOM_LLM_EXTRA_BODY";

describe("Conversation", () => {
  it("invokes respective callbacks", async () => {
    const server = new Server("wss://api.elevenlabs.io/1");
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
      signedUrl: "wss://api.elevenlabs.io/1",
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
        },
        custom_llm_extra_body: CUSTOM_LLM_EXTRA_BODY,
      })
    );

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
  });

  it("throws upon immediate cancellation", async () => {
    const server = new Server("wss://api.elevenlabs.io/2");
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
        signedUrl: "wss://api.elevenlabs.io/2",
      });
      await clientPromise;
    }).rejects.toThrowError(
      expect.objectContaining({
        code: 3000,
        reason: "Test cancellation reason",
      })
    );
  });

  it("terminates when server closes connection", async () => {
    const server = new Server("wss://api.elevenlabs.io/3");
    const clientPromise = new Promise<Client>((resolve, reject) => {
      server.on("connection", socket => resolve(socket));
      server.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    const disconnectionPromise = new Promise((resolve, reject) => {
      Conversation.startSession({
        signedUrl: "wss://api.elevenlabs.io/3",
        onDisconnect: resolve,
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
  });
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
