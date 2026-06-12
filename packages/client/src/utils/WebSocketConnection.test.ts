import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketConnection } from "./WebSocketConnection.js";

type EventHandler = (event: any) => void;

describe("WebSocketConnection", () => {
  let listeners: Map<string, EventHandler[]>;
  let mockSocket: Record<string, any>;

  beforeEach(() => {
    listeners = new Map();
    mockSocket = {
      addEventListener: vi.fn((type: string, handler: EventHandler) => {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type)!.push(handler);
      }),
      removeEventListener: vi.fn(),
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

  async function createConnection(): Promise<WebSocketConnection> {
    const promise = WebSocketConnection.create({
      agentId: "test-agent",
      connectionType: "websocket",
    });

    // Simulate the WebSocket handshake: open → config message
    emit("open", {});
    emit("message", {
      data: JSON.stringify({
        type: "conversation_initiation_metadata",
        conversation_initiation_metadata_event: {
          conversation_id: "test-conv-id",
          agent_output_audio_format: "pcm_16000",
          user_input_audio_format: "pcm_16000",
        },
      }),
    });

    return promise;
  }

  describe("disconnection context", () => {
    it("emits agent disconnect with context on normal close (code 1000)", async () => {
      const connection = await createConnection();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      emit("close", { type: "close", code: 1000, reason: "" });

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: { type: "close", code: 1000, reason: undefined },
        closeCode: 1000,
        closeReason: undefined,
      });
    });

    it("emits error disconnect with context on abnormal close", async () => {
      const connection = await createConnection();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      emit("close", { type: "close", code: 1006, reason: "Connection lost" });

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "error",
        message: "Connection lost",
        context: { type: "close", code: 1006, reason: "Connection lost" },
        closeCode: 1006,
        closeReason: "Connection lost",
      });
    });

    it("emits error disconnect with default message when close has no reason", async () => {
      const connection = await createConnection();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      emit("close", { type: "close", code: 1006, reason: "" });

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "error",
        message: "The connection was closed by the server.",
        context: { type: "close", code: 1006, reason: undefined },
        closeCode: 1006,
        closeReason: undefined,
      });
    });

    it("emits error disconnect with context on socket error (no close event)", async () => {
      vi.useFakeTimers();
      const connection = await createConnection();
      const onDisconnect = vi.fn();
      connection.onDisconnect(onDisconnect);

      emit("error", { type: "error" });
      vi.runAllTimers();

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "error",
        message: "The connection was closed due to a socket error.",
        context: { type: "error" },
      });

      vi.useRealTimers();
    });
  });

  it("buffers audio events until a listener is attached", async () => {
    const connection = await createConnection();
    const listener = vi.fn();

    emit("message", {
      data: JSON.stringify({
        type: "audio",
        audio_event: {
          audio_base_64: "dGVzdA==",
          event_id: 1,
        },
      }),
    });

    expect(listener).not.toHaveBeenCalled();

    connection.addListener(listener);

    expect(listener).toHaveBeenCalledWith({
      audio_base_64: "dGVzdA==",
    });
  });

  it("clears buffered audio when the connection closes", async () => {
    const connection = await createConnection();
    const listener = vi.fn();

    emit("message", {
      data: JSON.stringify({
        type: "audio",
        audio_event: {
          audio_base_64: "dGVzdA==",
          event_id: 1,
        },
      }),
    });

    connection.close();
    connection.addListener(listener);

    expect(listener).not.toHaveBeenCalled();
  });
});
