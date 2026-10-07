import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketRealtimeConnection } from "./WebSocketRealtimeConnection.js";
import { createConnection } from "./ConnectionFactory.js";
import { RealtimeUnsupportedFeatureError } from "./realtimeProtocol.js";
import type { RealtimeSessionConfig } from "./BaseConnection.js";
import type { IncomingSocketEvent } from "./events.js";

type EventHandler = (event: any) => void;

const config: RealtimeSessionConfig = {
  connectionType: "websocket-realtime",
  clientSecret: "ek_test",
  realtime: { instructions: "Be brief." },
};

const effectiveSession = {
  type: "realtime",
  id: "sess_123",
  audio: {
    input: {
      format: { type: "audio/pcm", rate: 24000 },
      turn_detection: { type: "semantic_vad", interrupt_response: true },
    },
    output: { format: { type: "audio/pcm", rate: 24000 }, voice: "marin" },
  },
};

describe("WebSocketRealtimeConnection", () => {
  let listeners: Map<string, EventHandler[]>;
  let mockSocket: Record<string, any>;

  beforeEach(() => {
    listeners = new Map();
    mockSocket = {
      addEventListener: vi.fn((type: string, handler: EventHandler) => {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type)!.push(handler);
      }),
      send: vi.fn(),
      close: vi.fn(),
    };
    vi.stubGlobal(
      "WebSocket",
      vi.fn(function WebSocket() {
        return mockSocket;
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function emit(type: string, event: any) {
    for (const handler of listeners.get(type) ?? []) {
      handler(event);
    }
  }

  function serverEvent(event: Record<string, unknown>) {
    emit("message", { data: JSON.stringify(event) });
  }

  function sentEvents() {
    return mockSocket.send.mock.calls.map(([data]: [string]) =>
      JSON.parse(data)
    );
  }

  async function connect(
    sessionConfig: RealtimeSessionConfig = config
  ): Promise<WebSocketRealtimeConnection> {
    const promise = WebSocketRealtimeConnection.create(sessionConfig);
    emit("open", {});
    serverEvent({
      type: "session.created",
      session: { type: "realtime", id: "sess_123" },
    });
    serverEvent({ type: "session.updated", session: effectiveSession });
    return promise;
  }

  it("authenticates with the client secret subprotocol", async () => {
    await connect();

    expect(globalThis.WebSocket).toHaveBeenCalledWith(
      expect.stringMatching(
        /^wss:\/\/api\.elevenlabs\.io\/v1\/convai\/realtime\?source=.+&version=.+$/
      ),
      ["realtime", "openai-insecure-api-key.ek_test"]
    );
  });

  it("uses a custom origin", async () => {
    await connect({
      ...config,
      origin: "wss://api.eu.residency.elevenlabs.io",
    });

    expect(vi.mocked(globalThis.WebSocket).mock.calls[0][0]).toMatch(
      /^wss:\/\/api\.eu\.residency\.elevenlabs\.io\/v1\/convai\/realtime\?/
    );
  });

  it("configures the session after session.created", async () => {
    const promise = WebSocketRealtimeConnection.create(config);
    expect(mockSocket.send).not.toHaveBeenCalled();

    serverEvent({
      type: "session.created",
      session: { type: "realtime", id: "sess_123" },
    });
    expect(sentEvents()).toEqual([
      expect.objectContaining({
        type: "session.update",
        session: expect.objectContaining({ instructions: "Be brief." }),
      }),
    ]);

    serverEvent({ type: "session.updated", session: effectiveSession });
    const connection = await promise;

    expect(connection.conversationId).toBe("sess_123");
    expect(connection.inputFormat).toEqual({
      format: "pcm",
      sampleRate: 24000,
    });
    expect(connection.outputFormat).toEqual({
      format: "pcm",
      sampleRate: 24000,
    });
  });

  it("synthesizes conversation initiation metadata", async () => {
    const connection = await connect();
    const events: IncomingSocketEvent[] = [];
    connection.onMessage(event => events.push(event));
    await Promise.resolve();

    expect(events).toEqual([
      {
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "sess_123",
          agent_output_audio_format: "pcm_24000",
          user_input_audio_format: "pcm_24000",
        },
      },
    ]);
  });

  it("rejects when the server refuses the session configuration", async () => {
    const promise = WebSocketRealtimeConnection.create(config);
    serverEvent({ type: "session.created", session: { id: "sess_123" } });
    serverEvent({
      type: "error",
      error: {
        type: "invalid_request_error",
        message: "server_vad is not supported",
      },
    });

    await expect(promise).rejects.toThrow("server_vad is not supported");
    expect(mockSocket.close).toHaveBeenCalled();
  });

  it("explains the feature-flag close code", async () => {
    const promise = WebSocketRealtimeConnection.create(config);
    emit("close", { type: "close", code: 4003, reason: "" });

    await expect(promise).rejects.toThrow(
      "The Realtime API is not enabled for this workspace."
    );
  });

  it("rejects unsupported options before opening a socket", async () => {
    await expect(
      WebSocketRealtimeConnection.create({
        ...config,
        dynamicVariables: { name: "Ada" },
      } as never)
    ).rejects.toThrow("do not support: dynamicVariables");
    expect(globalThis.WebSocket).not.toHaveBeenCalled();
  });

  it("translates server events into native events", async () => {
    const connection = await connect();
    const events: IncomingSocketEvent[] = [];
    connection.onMessage(event => events.push(event));
    await Promise.resolve();

    serverEvent({
      type: "conversation.item.input_audio_transcription.completed",
      item_id: "item_1",
      transcript: "Hello?",
    });

    expect(events.at(-1)).toEqual({
      type: "user_transcript",
      user_transcription_event: { user_transcript: "Hello?", event_id: 1 },
    });
  });

  it("forwards agent audio to output listeners", async () => {
    const connection = await connect();
    const listener = vi.fn();
    connection.addListener(listener);

    serverEvent({
      type: "response.output_audio.delta",
      response_id: "resp_1",
      item_id: "item_1",
      content_index: 0,
      delta: "AAAA",
    });

    expect(listener).toHaveBeenCalledWith({ audio_base_64: "AAAA" });
  });

  it("encodes outgoing native events and reports them", async () => {
    const connection = await connect();
    const onOutgoing = vi.fn();
    connection.onOutgoingMessage(onOutgoing);
    mockSocket.send.mockClear();

    connection.sendMessage({ user_audio_chunk: "AAAA" });

    expect(sentEvents()).toEqual([
      { type: "input_audio_buffer.append", audio: "AAAA" },
    ]);
    expect(onOutgoing).toHaveBeenCalledWith({ user_audio_chunk: "AAAA" });
  });

  it("throws for unsupported outgoing events without reporting them", async () => {
    const connection = await connect();
    const onOutgoing = vi.fn();
    connection.onOutgoingMessage(onOutgoing);
    mockSocket.send.mockClear();

    expect(() =>
      connection.sendMessage({ type: "contextual_update", text: "context" })
    ).toThrow(RealtimeUnsupportedFeatureError);
    expect(mockSocket.send).not.toHaveBeenCalled();
    expect(onOutgoing).not.toHaveBeenCalled();
  });

  it("is created by the connection factory", async () => {
    const promise = createConnection(config);
    await Promise.resolve();
    serverEvent({ type: "session.created", session: { id: "sess_123" } });
    serverEvent({ type: "session.updated", session: effectiveSession });

    await expect(promise).resolves.toBeInstanceOf(WebSocketRealtimeConnection);
  });
});
