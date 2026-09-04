import { describe, it, expect, vi, afterEach } from "vitest";

import {
  BaseConversation,
  Options,
  PartialOptions,
} from "./BaseConversation.js";
import type { BaseConnection } from "./utils/BaseConnection.js";

const noopConnection = {
  conversationId: "test-conversation-id",
  onMessage: () => {},
  onOutgoingMessage: () => {},
  onDisconnect: () => {},
  onModeChange: () => {},
  close: () => {},
  sendMessage: () => {},
} as unknown as BaseConnection;

class TestConversation extends BaseConversation {
  public static getFullOptions(partialOptions: PartialOptions): Options {
    return super.getFullOptions(partialOptions);
  }

  public static create(
    options: Partial<Options> & { origin?: string } = {},
    connection: BaseConnection = noopConnection
  ): TestConversation {
    const fullOptions = TestConversation.getFullOptions({
      agentId: "test-agent-id",
      connectionType: "webrtc",
      ...options,
    } as PartialOptions);
    return new TestConversation(fullOptions, connection);
  }

  constructor(options: Options, connection: BaseConnection) {
    super(options, connection);
  }

  public setVolume(): void {}
  public setMicMuted(): void {}
  public setOnHold(): void {}
  public isOnHold(): boolean {
    return false;
  }
  public getInputByteFrequencyData(): Uint8Array {
    return new Uint8Array(0);
  }
  public getOutputByteFrequencyData(): Uint8Array {
    return new Uint8Array(0);
  }
  public getInputVolume(): number {
    return 0;
  }
  public getOutputVolume(): number {
    return 0;
  }

  public receiveMessage(
    event: Parameters<Parameters<BaseConnection["onMessage"]>[0]>[0]
  ) {
    return this["onMessage"](event);
  }

  public connect(currentEventId = 1) {
    this.currentEventId = currentEventId;
    this.markConnected();
  }

  public setStatus(status: Parameters<TestConversation["updateStatus"]>[0]) {
    this.updateStatus(status);
  }

  public getCanSendFeedback() {
    return this.canSendFeedback;
  }
}

describe("BaseConversation", () => {
  describe("textOnly option", () => {
    describe.each([true, false, undefined])("textOnly: %s", textOnly => {
      it("should propagate top-level textOnly option into overrides", () => {
        const fullOptions = TestConversation.getFullOptions({
          agentId: "test-agent-id",
          connectionType: "webrtc",
          textOnly,
        });
        expect(fullOptions.textOnly).toBe(textOnly);
        expect(fullOptions.overrides?.conversation?.textOnly).toBe(textOnly);
      });

      it("should propagate overrides.conversation.textOnly option into top-level textOnly", () => {
        const fullOptions = TestConversation.getFullOptions({
          agentId: "test-agent-id",
          connectionType: "webrtc",
          overrides: {
            conversation: {
              textOnly,
            },
          },
        });
        expect(fullOptions.textOnly).toBe(textOnly);
        expect(fullOptions.overrides?.conversation?.textOnly).toBe(textOnly);
      });
    });

    it.each([true, false])(
      "should warn if both top-level (%s) and overrides.conversation.textOnly are provided and are different",
      textOnly => {
        const consoleWarnSpy = vi.spyOn(console, "warn");
        TestConversation.getFullOptions({
          agentId: "test-agent-id",
          connectionType: "webrtc",
          textOnly,
          overrides: {
            conversation: {
              textOnly: !textOnly,
            },
          },
        });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          `Conflicting textOnly options provided: ${textOnly} via options.textOnly (will be used) and ${!textOnly} via options.overrides.conversation.textOnly (will be ignored)`
        );
      }
    );
  });

  describe("uploadFile", () => {
    let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>;

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    function mockFetchSuccess() {
      fetchSpy = vi.fn<typeof fetch>().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ file_id: "test-file-id" }),
      } as Response);
      vi.stubGlobal("fetch", fetchSpy);
    }

    function getUploadedFilename(): string {
      const formData = fetchSpy.mock.calls[0]![1]!.body as FormData;
      return (formData.get("file") as File).name;
    }

    it("converts wss:// origin to https://", async () => {
      mockFetchSuccess();
      const conversation = TestConversation.create({
        origin: "wss://api.elevenlabs.io",
      });

      await conversation.uploadFile(new Blob(["test"]));

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://api.elevenlabs.io/"),
        expect.anything()
      );
    });

    it("converts ws:// origin to http://", async () => {
      mockFetchSuccess();
      const conversation = TestConversation.create({
        origin: "ws://localhost:8080",
      });

      await conversation.uploadFile(new Blob(["test"]));

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:8080/"),
        expect.anything()
      );
    });

    it("strips +suffix from MIME subtype for filename", async () => {
      mockFetchSuccess();
      const conversation = TestConversation.create();

      await conversation.uploadFile(
        new Blob(["<svg/>"], { type: "image/svg+xml" })
      );

      expect(getUploadedFilename()).toBe("upload.svg");
    });

    it("throws for self-hosted orchestrator sessions instead of calling the cloud API", async () => {
      mockFetchSuccess();
      const conversation = TestConversation.create({
        orchestrator: {
          url: "wss://orchestrator.internal/convai",
        },
      } as Partial<Options>);

      await expect(conversation.uploadFile(new Blob(["test"]))).rejects.toThrow(
        "not supported for self-hosted orchestrator sessions"
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("agent_response events", () => {
    it("forwards attachments to onMessage when present", async () => {
      const onMessage = vi.fn();
      const conversation = TestConversation.create({ onMessage });

      await conversation.receiveMessage({
        type: "agent_response",
        agent_response_event: {
          agent_response: "Here is the file you asked for.",
          event_id: 3,
          attachments: [
            {
              url: "https://example.com/invoice.pdf",
              name: "invoice.pdf",
              mime_type: "application/pdf",
            },
          ],
        },
      });

      expect(onMessage).toHaveBeenCalledWith({
        source: "ai",
        role: "agent",
        message: "Here is the file you asked for.",
        event_id: 3,
        attachments: [
          {
            url: "https://example.com/invoice.pdf",
            name: "invoice.pdf",
            mime_type: "application/pdf",
          },
        ],
      });
    });

    it("leaves attachments undefined when the event has none", async () => {
      const onMessage = vi.fn();
      const conversation = TestConversation.create({ onMessage });

      await conversation.receiveMessage({
        type: "agent_response",
        agent_response_event: {
          agent_response: "Hello there",
          event_id: 4,
        },
      });

      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Hello there",
          attachments: undefined,
        })
      );
    });
  });

  describe("agent_response_correction events", () => {
    it("calls onAgentResponseCorrection with the correction payload", async () => {
      const onAgentResponseCorrection = vi.fn();
      const onDebug = vi.fn();
      const conversation = TestConversation.create({
        onAgentResponseCorrection,
        onDebug,
      });

      await conversation.receiveMessage({
        type: "agent_response_correction",
        agent_response_correction_event: {
          original_agent_response: "The weather is sunny and warm.",
          corrected_agent_response: "The weather is sunny",
          event_id: 42,
        },
      });

      expect(onAgentResponseCorrection).toHaveBeenCalledWith({
        original_agent_response: "The weather is sunny and warm.",
        corrected_agent_response: "The weather is sunny",
        event_id: 42,
      });
      expect(onDebug).not.toHaveBeenCalled();
    });
  });

  describe("agent_reasoning_response_part events", () => {
    it("calls onAgentReasoningResponsePart with the reasoning payload", async () => {
      const onAgentReasoningResponsePart = vi.fn();
      const onDebug = vi.fn();
      const conversation = TestConversation.create({
        onAgentReasoningResponsePart,
        onDebug,
      });

      await conversation.receiveMessage({
        type: "agent_reasoning_response_part",
        reasoning_response_part: {
          text: "Let me think about this...",
          type: "delta",
          event_id: "123",
        },
      });

      expect(onAgentReasoningResponsePart).toHaveBeenCalledWith({
        text: "Let me think about this...",
        type: "delta",
        event_id: "123",
      });
      expect(onDebug).not.toHaveBeenCalled();
    });

    it("handles start, delta, and stop types", async () => {
      const onAgentReasoningResponsePart = vi.fn();
      const conversation = TestConversation.create({
        onAgentReasoningResponsePart,
      });

      await conversation.receiveMessage({
        type: "agent_reasoning_response_part",
        reasoning_response_part: {
          text: "",
          type: "start",
          event_id: "1",
        },
      });

      await conversation.receiveMessage({
        type: "agent_reasoning_response_part",
        reasoning_response_part: {
          text: "Analyzing the request...",
          type: "delta",
          event_id: "1",
        },
      });

      await conversation.receiveMessage({
        type: "agent_reasoning_response_part",
        reasoning_response_part: {
          text: "",
          type: "stop",
          event_id: "1",
        },
      });

      expect(onAgentReasoningResponsePart).toHaveBeenCalledTimes(3);
      expect(onAgentReasoningResponsePart).toHaveBeenNthCalledWith(1, {
        text: "",
        type: "start",
        event_id: "1",
      });
      expect(onAgentReasoningResponsePart).toHaveBeenNthCalledWith(2, {
        text: "Analyzing the request...",
        type: "delta",
        event_id: "1",
      });
      expect(onAgentReasoningResponsePart).toHaveBeenNthCalledWith(3, {
        text: "",
        type: "stop",
        event_id: "1",
      });
    });

    it("does not throw when no callback is provided", async () => {
      const conversation = TestConversation.create({});

      await expect(
        conversation.receiveMessage({
          type: "agent_reasoning_response_part",
          reasoning_response_part: {
            text: "Thinking...",
            type: "delta",
            event_id: "42",
          },
        })
      ).resolves.toBeUndefined();
    });
  });

  describe("rich_content events", () => {
    const richContentEvent = {
      type: "rich_content" as const,
      rich_content: {
        rich_content_id: "show_rich_content_8c0948a3",
        component: "item_card",
        props: { id: "item_1", title: "Item Title" },
        event_id: 2,
      },
    };

    it("calls onRichContent with the component payload", async () => {
      const onRichContent = vi.fn();
      const onDebug = vi.fn();
      const conversation = TestConversation.create({
        onRichContent,
        onDebug,
      });

      await conversation.receiveMessage(richContentEvent);

      expect(onRichContent).toHaveBeenCalledWith({
        rich_content_id: "show_rich_content_8c0948a3",
        component: "item_card",
        props: { id: "item_1", title: "Item Title" },
        event_id: 2,
      });
      expect(onDebug).not.toHaveBeenCalled();
    });

    it("sends nothing back, unlike a client tool call", async () => {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      const conversation = TestConversation.create(
        { onRichContent: vi.fn() },
        connection
      );

      await conversation.receiveMessage(richContentEvent);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it("does not throw when no callback is provided", async () => {
      const conversation = TestConversation.create({});

      await expect(
        conversation.receiveMessage(richContentEvent)
      ).resolves.toBeUndefined();
    });
  });

  describe("sendUserMessage", () => {
    function conversationSending() {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      return {
        sendMessage,
        conversation: TestConversation.create({}, connection),
      };
    }

    it("attributes a tap to the row its button came from", () => {
      const { sendMessage, conversation } = conversationSending();

      conversation.sendUserMessage("Can you track my order?", {
        richContentId: "first_message",
      });

      expect(sendMessage).toHaveBeenCalledWith({
        type: "user_message",
        text: "Can you track my order?",
        rich_content_id: "first_message",
      });
    });

    it("omits the attribution entirely for a typed message", () => {
      const { sendMessage, conversation } = conversationSending();

      conversation.sendUserMessage("Where is my order?");

      // Assert the wire form, not the object: both transports JSON.stringify,
      // which drops undefined but keeps null. A server predating the field must
      // see exactly the payload it saw before, so an explicit null would be a
      // regression while an undefined property is harmless.
      const payload = sendMessage.mock.calls[0][0];
      expect(JSON.parse(JSON.stringify(payload))).toEqual({
        type: "user_message",
        text: "Where is my order?",
      });
    });
  });

  describe("sendMultimodalMessage", () => {
    function conversationSending() {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      return {
        sendMessage,
        conversation: TestConversation.create({}, connection),
      };
    }

    it("dual-sends file and files when fileId is set", () => {
      const { sendMessage, conversation } = conversationSending();

      conversation.sendMultimodalMessage({
        text: "What is this?",
        fileId: "file_a",
      });

      expect(JSON.parse(JSON.stringify(sendMessage.mock.calls[0][0]))).toEqual({
        type: "multimodal_message",
        text: { type: "user_message", text: "What is this?" },
        file: { type: "file_input", file_id: "file_a" },
        files: [{ type: "file_input", file_id: "file_a" }],
      });
    });

    it("dual-sends file and files when fileIds is set", () => {
      const { sendMessage, conversation } = conversationSending();

      conversation.sendMultimodalMessage({ fileIds: ["file_a", "file_b"] });

      expect(JSON.parse(JSON.stringify(sendMessage.mock.calls[0][0]))).toEqual({
        type: "multimodal_message",
        file: { type: "file_input", file_id: "file_a" },
        files: [
          { type: "file_input", file_id: "file_a" },
          { type: "file_input", file_id: "file_b" },
        ],
      });
    });

    it("prefers fileIds when both fileId and fileIds are set", () => {
      const { sendMessage, conversation } = conversationSending();

      conversation.sendMultimodalMessage({
        fileId: "ignored",
        fileIds: ["file_a", "file_b"],
      });

      expect(JSON.parse(JSON.stringify(sendMessage.mock.calls[0][0]))).toEqual({
        type: "multimodal_message",
        file: { type: "file_input", file_id: "file_a" },
        files: [
          { type: "file_input", file_id: "file_a" },
          { type: "file_input", file_id: "file_b" },
        ],
      });
    });

    it("omits file fields for text-only messages", () => {
      const { sendMessage, conversation } = conversationSending();

      conversation.sendMultimodalMessage({ text: "Hello" });

      expect(JSON.parse(JSON.stringify(sendMessage.mock.calls[0][0]))).toEqual({
        type: "multimodal_message",
        text: { type: "user_message", text: "Hello" },
      });
    });
  });

  describe("ping events", () => {
    it("replies with a pong and forwards the payload to onPing", async () => {
      const onPing = vi.fn();
      const onDebug = vi.fn();
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      const conversation = TestConversation.create(
        { onPing, onDebug },
        connection
      );

      await conversation.receiveMessage({
        type: "ping",
        ping_event: {
          event_id: 99,
          ping_ms: 42,
        },
      });

      expect(sendMessage).toHaveBeenCalledWith({
        type: "pong",
        event_id: 99,
      });
      expect(onPing).toHaveBeenCalledWith({
        event_id: 99,
        ping_ms: 42,
      });
      expect(onDebug).not.toHaveBeenCalled();
    });

    it("still replies with a pong when no onPing callback is provided", async () => {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      const conversation = TestConversation.create({}, connection);

      await conversation.receiveMessage({
        type: "ping",
        ping_event: {
          event_id: 7,
        },
      });

      expect(sendMessage).toHaveBeenCalledWith({
        type: "pong",
        event_id: 7,
      });
    });
  });

  describe("context_usage events", () => {
    const contextUsageEvent = {
      type: "context_usage" as const,
      context_usage_event: {
        event_id: 12,
        model: "gemini-2.0-flash-001",
        context_tokens: 4321,
        context_limit_tokens: 1048576,
      },
    };

    it("calls onContextUsage with the usage payload", async () => {
      const onContextUsage = vi.fn();
      const onDebug = vi.fn();
      const conversation = TestConversation.create({
        onContextUsage,
        onDebug,
      });

      await conversation.receiveMessage(contextUsageEvent);

      expect(onContextUsage).toHaveBeenCalledWith({
        event_id: 12,
        model: "gemini-2.0-flash-001",
        context_tokens: 4321,
        context_limit_tokens: 1048576,
      });
      expect(onDebug).not.toHaveBeenCalled();
    });

    it("sends nothing back to the server", async () => {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      const conversation = TestConversation.create(
        { onContextUsage: vi.fn() },
        connection
      );

      await conversation.receiveMessage(contextUsageEvent);

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it("does not throw when no callback is provided", async () => {
      const conversation = TestConversation.create({});

      await expect(
        conversation.receiveMessage(contextUsageEvent)
      ).resolves.toBeUndefined();
    });
  });

  describe("agent_tool_response_full_payload events", () => {
    const basePayload = {
      tool_name: "lookup_kb",
      tool_call_id: "call_1",
      tool_type: "webhook",
      is_error: false,
      is_blocked: false,
      is_called: true,
      event_id: 7,
      full_tool_result: '{"sources":[{"url":"https://example.com/a"}]}',
      truncated: false,
    };

    it("forwards the full JSON tool_result to onAgentToolResponse", async () => {
      const onAgentToolResponse = vi.fn();
      const onDebug = vi.fn();
      const conversation = TestConversation.create({
        onAgentToolResponse,
        onDebug,
      });

      await conversation.receiveMessage({
        type: "agent_tool_response_full_payload",
        agent_tool_response_full_payload: basePayload,
      });

      expect(onAgentToolResponse).toHaveBeenCalledWith(basePayload);
      expect(onDebug).not.toHaveBeenCalled();
    });

    it("forwards non-JSON full_tool_result strings verbatim", async () => {
      const onAgentToolResponse = vi.fn();
      const conversation = TestConversation.create({
        onAgentToolResponse,
      });

      const nonJson = {
        ...basePayload,
        is_error: true,
        full_tool_result: "internal server error 500",
      };

      await conversation.receiveMessage({
        type: "agent_tool_response_full_payload",
        agent_tool_response_full_payload: nonJson,
      });

      expect(onAgentToolResponse).toHaveBeenCalledWith(nonJson);
    });

    it("forwards truncated payloads with the truncated flag set", async () => {
      const onAgentToolResponse = vi.fn();
      const conversation = TestConversation.create({
        onAgentToolResponse,
      });

      // The server caps at 64 KB and tags `truncated: true`. The SDK forwards
      // the already-truncated string verbatim — it does not re-truncate.
      const truncatedBody =
        '{"sources":[' + "a".repeat(64_000) + "[truncated +500 characters]";
      const truncated = {
        ...basePayload,
        full_tool_result: truncatedBody,
        truncated: true,
      };

      await conversation.receiveMessage({
        type: "agent_tool_response_full_payload",
        agent_tool_response_full_payload: truncated,
      });

      const received = onAgentToolResponse.mock.calls[0]![0];
      expect(received.truncated).toBe(true);
      expect(received.full_tool_result).toBe(truncatedBody);
      expect(received.full_tool_result.length).toBeGreaterThan(64_000);
    });
  });

  describe("disconnection context", () => {
    // endSessionWithDetails is async and fire-and-forget, so we need to flush
    // microtasks after receiving the message.
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("disconnects with end_call context on agent_tool_response", async () => {
      const onDisconnect = vi.fn();
      const conversation = TestConversation.create({ onDisconnect });

      await conversation.receiveMessage({
        type: "agent_tool_response",
        agent_tool_response: {
          tool_name: "end_call",
          tool_call_id: "call_end",
          tool_type: "system",
          is_error: false,
          is_called: true,
          event_id: 1,
        },
      });
      await flush();

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: { type: "end_call", reason: "Agent ended the call" },
      });
    });

    it("disconnects with end_call context on agent_tool_response_full_payload", async () => {
      const onDisconnect = vi.fn();
      const conversation = TestConversation.create({ onDisconnect });

      await conversation.receiveMessage({
        type: "agent_tool_response_full_payload",
        agent_tool_response_full_payload: {
          tool_name: "end_call",
          tool_call_id: "call_end",
          tool_type: "system",
          is_error: false,
          is_blocked: false,
          is_called: true,
          event_id: 1,
          full_tool_result: "",
          truncated: false,
        },
      });
      await flush();

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "agent",
        context: { type: "end_call", reason: "Agent ended the call" },
      });
    });

    it("disconnects with max_duration_exceeded context on error event", async () => {
      const onDisconnect = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const conversation = TestConversation.create({ onDisconnect });

      await conversation.receiveMessage({
        type: "error",
        error_event: {
          code: 1000 as const,
          error_type: "max_duration_exceeded",
          message: "Maximum duration exceeded",
        },
      });
      await flush();

      expect(onDisconnect).toHaveBeenCalledWith({
        reason: "error",
        message: "Maximum duration exceeded",
        context: { type: "max_duration_exceeded" },
      });
    });

    it("still reaches disconnected and fires onDisconnect if teardown throws", async () => {
      const onDisconnect = vi.fn();
      const onStatusChange = vi.fn();
      const throwingConnection = {
        ...noopConnection,
        close: () => {
          throw new Error("teardown boom");
        },
      } as unknown as BaseConnection;
      const conversation = TestConversation.create(
        { onDisconnect, onStatusChange },
        throwingConnection
      );
      conversation.connect();

      await expect(conversation.endSession()).rejects.toThrow("teardown boom");

      expect(onStatusChange).toHaveBeenCalledWith({ status: "disconnected" });
      expect(onDisconnect).toHaveBeenCalledWith({ reason: "user" });
    });
  });

  describe("error events", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("surfaces a non-terminal server error via onError", async () => {
      const onError = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const conversation = TestConversation.create({ onError });

      await conversation.receiveMessage({
        type: "error",
        error_event: {
          code: 1008 as const,
          error_type: "override_error",
          message: "Override not allowed",
        },
      });

      expect(onError).toHaveBeenCalledWith(
        "Server error: Override not allowed",
        {
          errorType: "override_error",
          code: 1008,
          debugMessage: undefined,
          details: undefined,
        }
      );
    });

    it("does not throw when the error message has no error_event payload", async () => {
      const onError = vi.fn();
      vi.spyOn(console, "error").mockImplementation(() => {});
      const conversation = TestConversation.create({ onError });

      // The orchestrator can emit an `error` message without a populated
      // `error_event`. This must surface via onError, not throw a TypeError
      // ("Cannot read properties of undefined (reading 'error_type')") that
      // escapes the message dispatcher and crashes the consumer.
      const malformedError = { type: "error" } as unknown as Parameters<
        typeof conversation.receiveMessage
      >[0];

      await expect(
        conversation.receiveMessage(malformedError)
      ).resolves.toBeUndefined();

      expect(onError).toHaveBeenCalledWith("Server error: Unknown error", {
        errorType: undefined,
        code: undefined,
        debugMessage: undefined,
        details: undefined,
      });
    });
  });

  describe("sendFeedback", () => {
    function createWithSpy() {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      const conversation = TestConversation.create({}, connection);
      return { conversation, sendMessage };
    }

    it("warns and does not send when not connected", () => {
      const { conversation, sendMessage } = createWithSpy();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(conversation.getCanSendFeedback()).toBe(false);
      conversation.sendFeedback(true);

      expect(sendMessage).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    });

    it("targets the current turn when eventId is omitted", () => {
      const { conversation, sendMessage } = createWithSpy();
      conversation.connect(5);

      conversation.sendFeedback(true);

      expect(sendMessage).toHaveBeenCalledWith({
        type: "feedback",
        score: "like",
        event_id: 5,
      });
    });

    it("advances the default target as agent responses arrive", async () => {
      const { conversation, sendMessage } = createWithSpy();
      conversation.connect();

      await conversation.receiveMessage({
        type: "agent_response",
        agent_response_event: {
          agent_response: "Hello there",
          event_id: 7,
        },
      });
      conversation.sendFeedback(true);

      expect(sendMessage).toHaveBeenCalledWith({
        type: "feedback",
        score: "like",
        event_id: 7,
      });
    });

    it("targets an explicit past message", () => {
      const { conversation, sendMessage } = createWithSpy();
      conversation.connect(5);

      conversation.sendFeedback(false, 2);

      expect(sendMessage).toHaveBeenCalledWith({
        type: "feedback",
        score: "dislike",
        event_id: 2,
      });
    });

    it("clears feedback when null is passed", () => {
      const { conversation, sendMessage } = createWithSpy();
      conversation.connect(5);

      conversation.sendFeedback(null, 2);

      expect(sendMessage).toHaveBeenCalledWith({
        type: "feedback",
        score: null,
        event_id: 2,
      });
    });

    it("clears feedback for the current turn when eventId is omitted", () => {
      const { conversation, sendMessage } = createWithSpy();
      conversation.connect(5);

      conversation.sendFeedback(null);

      expect(sendMessage).toHaveBeenCalledWith({
        type: "feedback",
        score: null,
        event_id: 5,
      });
    });

    it("can send repeatedly while connected", () => {
      const { conversation, sendMessage } = createWithSpy();
      conversation.connect(5);

      conversation.sendFeedback(true, 2);
      conversation.sendFeedback(true, 5);

      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(conversation.getCanSendFeedback()).toBe(true);
    });

    it("notifies onCanSendFeedbackChange on connect and disconnect", () => {
      const onCanSendFeedbackChange = vi.fn();
      const conversation = TestConversation.create({ onCanSendFeedbackChange });

      conversation.connect(1);
      expect(onCanSendFeedbackChange).toHaveBeenLastCalledWith({
        canSendFeedback: true,
      });

      conversation.setStatus("disconnected");
      expect(onCanSendFeedbackChange).toHaveBeenLastCalledWith({
        canSendFeedback: false,
      });
    });
  });

  describe("message events", () => {
    it("calls onIncomingEvent with the incoming message payload", async () => {
      const onIncomingEvent = vi.fn();
      const conversation = TestConversation.create({
        onIncomingEvent,
      });

      const message = {
        type: "ping",
        ping_event: {
          event_id: 1,
        },
      } as const;

      await conversation.receiveMessage(message);

      expect(onIncomingEvent).toHaveBeenCalledWith(message);
    });
  });
  describe("onMCPToolApprovalRequest", () => {
    type ToolCallState = "loading" | "success" | "failure";

    function awaitingApproval(toolCallId: string, toolName = "search_docs") {
      return {
        type: "mcp_tool_call",
        mcp_tool_call: {
          service_id: "service-1",
          tool_call_id: toolCallId,
          tool_name: toolName,
          tool_description: "Searches the docs",
          parameters: { query: "refunds" },
          timestamp: "2026-01-01T00:00:00Z",
          state: "awaiting_approval",
          approval_timeout_secs: 30,
        },
      } as const;
    }

    function inState(toolCallId: string, state: ToolCallState) {
      const base = {
        service_id: "service-1",
        tool_call_id: toolCallId,
        tool_name: "search_docs",
        parameters: { query: "refunds" },
        timestamp: "2026-01-01T00:00:01Z",
      };
      const payload =
        state === "success"
          ? { ...base, state, result: [{ text: "ok" }] }
          : state === "failure"
            ? { ...base, state, error_message: "boom" }
            : { ...base, state };
      return { type: "mcp_tool_call", mcp_tool_call: payload } as Parameters<
        TestConversation["receiveMessage"]
      >[0];
    }

    function deferred<T>() {
      let resolve!: (value: T) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    function createWithSpy(options: Partial<Options> = {}) {
      const sendMessage = vi.fn();
      const connection = {
        ...noopConnection,
        sendMessage,
      } as unknown as BaseConnection;
      const conversation = TestConversation.create(options, connection);
      return { conversation, sendMessage };
    }

    it("runs the handler and sends the approval result", async () => {
      const onMCPToolApprovalRequest = vi.fn().mockResolvedValue(true);
      const onMCPToolCall = vi.fn();
      const { conversation, sendMessage } = createWithSpy({
        onMCPToolApprovalRequest,
        onMCPToolCall,
      });

      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(onMCPToolApprovalRequest).toHaveBeenCalledTimes(1);
      expect(onMCPToolApprovalRequest.mock.calls[0][0]).toMatchObject({
        tool_call_id: "call-1",
        tool_name: "search_docs",
        state: "awaiting_approval",
      });
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith({
        type: "mcp_tool_approval_result",
        tool_call_id: "call-1",
        is_approved: true,
      });
      // The observability callback keeps firing for the same event.
      expect(onMCPToolCall).toHaveBeenCalledTimes(1);
    });

    it("sends a denial when the handler resolves false", async () => {
      const { conversation, sendMessage } = createWithSpy({
        onMCPToolApprovalRequest: () => false,
      });

      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(sendMessage).toHaveBeenCalledWith({
        type: "mcp_tool_approval_result",
        tool_call_id: "call-1",
        is_approved: false,
      });
    });

    it("leaves the existing onMCPToolCall-only flow untouched when no handler is configured", async () => {
      const onMCPToolCall = vi.fn();
      const { conversation, sendMessage } = createWithSpy({ onMCPToolCall });

      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(onMCPToolCall).toHaveBeenCalledTimes(1);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it.each(["loading", "success", "failure"] as const)(
      "does not ask for approval in the %s state",
      async state => {
        const onMCPToolApprovalRequest = vi.fn().mockResolvedValue(true);
        const onMCPToolCall = vi.fn();
        const { conversation, sendMessage } = createWithSpy({
          onMCPToolApprovalRequest,
          onMCPToolCall,
        });

        await conversation.receiveMessage(inState("call-1", state));

        expect(onMCPToolApprovalRequest).not.toHaveBeenCalled();
        expect(sendMessage).not.toHaveBeenCalled();
        expect(onMCPToolCall).toHaveBeenCalledTimes(1);
      }
    );

    it("denies and reports when the handler rejects", async () => {
      const onError = vi.fn();
      const { conversation, sendMessage } = createWithSpy({
        onError,
        onMCPToolApprovalRequest: () => Promise.reject(new Error("no UI")),
      });

      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(onError).toHaveBeenCalledWith(
        "MCP tool approval handler failed: no UI",
        {
          toolCallId: "call-1",
          toolName: "search_docs",
          serviceId: "service-1",
        }
      );
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith({
        type: "mcp_tool_approval_result",
        tool_call_id: "call-1",
        is_approved: false,
      });
    });

    it("denies and reports when the handler resolves to a non-boolean", async () => {
      const onError = vi.fn();
      const { conversation, sendMessage } = createWithSpy({
        onError,
        onMCPToolApprovalRequest: () =>
          undefined as unknown as Promise<boolean>,
      });

      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(onError).toHaveBeenCalledWith(
        "MCP tool approval handler must resolve to a boolean, received undefined",
        {
          toolCallId: "call-1",
          toolName: "search_docs",
          serviceId: "service-1",
        }
      );
      expect(sendMessage).toHaveBeenCalledWith({
        type: "mcp_tool_approval_result",
        tool_call_id: "call-1",
        is_approved: false,
      });
    });

    it("runs the handler once when the same tool call is asked twice", async () => {
      const onError = vi.fn();
      const gate = deferred<boolean>();
      const onMCPToolApprovalRequest = vi.fn(() => gate.promise);
      const { conversation, sendMessage } = createWithSpy({
        onError,
        onMCPToolApprovalRequest,
      });

      const first = conversation.receiveMessage(awaitingApproval("call-1"));
      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(onMCPToolApprovalRequest).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        "Ignored a repeated approval request for MCP tool call call-1, which has already been handled",
        {
          toolCallId: "call-1",
          toolName: "search_docs",
          serviceId: "service-1",
        }
      );

      gate.resolve(true);
      await first;

      expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it("does not ask again once a decision has been sent", async () => {
      const onMCPToolApprovalRequest = vi.fn().mockResolvedValue(true);
      const { conversation, sendMessage } = createWithSpy({
        onMCPToolApprovalRequest,
      });

      await conversation.receiveMessage(awaitingApproval("call-1"));
      await conversation.receiveMessage(awaitingApproval("call-1"));

      expect(onMCPToolApprovalRequest).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    it("drops a decision that arrives after the server moved the call on", async () => {
      const onError = vi.fn();
      const gate = deferred<boolean>();
      const { conversation, sendMessage } = createWithSpy({
        onError,
        onMCPToolApprovalRequest: () => gate.promise,
      });

      const pending = conversation.receiveMessage(awaitingApproval("call-1"));
      await conversation.receiveMessage(inState("call-1", "failure"));

      gate.resolve(true);
      await pending;

      expect(sendMessage).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(
        "Discarded an approval decision for MCP tool call call-1, which is no longer awaiting approval",
        {
          toolCallId: "call-1",
          toolName: "search_docs",
          serviceId: "service-1",
        }
      );
    });

    it("aborts the handler's signal when the call stops awaiting approval", async () => {
      const gate = deferred<boolean>();
      const seen: { aborted?: boolean } = {};
      const { conversation } = createWithSpy({
        onMCPToolApprovalRequest: (_toolCall, { signal }) => {
          expect(signal.aborted).toBe(false);
          return gate.promise.then(value => {
            seen.aborted = signal.aborted;
            return value;
          });
        },
      });

      const pending = conversation.receiveMessage(awaitingApproval("call-1"));
      await conversation.receiveMessage(inState("call-1", "success"));

      gate.resolve(true);
      await pending;

      expect(seen.aborted).toBe(true);
    });

    it("drops a decision that arrives after the session ended", async () => {
      const gate = deferred<boolean>();
      const signals: AbortSignal[] = [];
      const { conversation, sendMessage } = createWithSpy({
        onMCPToolApprovalRequest: (_toolCall, { signal }) => {
          signals.push(signal);
          return gate.promise;
        },
      });
      conversation.connect();

      const pending = conversation.receiveMessage(awaitingApproval("call-1"));
      await conversation.endSession();

      gate.resolve(true);
      await pending;

      expect(signals[0].aborted).toBe(true);
      expect(sendMessage).not.toHaveBeenCalled();
    });

    it("sends exactly one result for each concurrent approval, bound to its own tool call", async () => {
      // Two approvals are outstanding; the second is answered first, and the
      // first only resolves after its call has already moved on. Each id must
      // end with at most one terminal result, and never the other id's.
      const first = deferred<boolean>();
      const second = deferred<boolean>();
      const gates: Record<string, Promise<boolean>> = {
        "call-1": first.promise,
        "call-2": second.promise,
      };
      const { conversation, sendMessage } = createWithSpy({
        onError: vi.fn(),
        onMCPToolApprovalRequest: toolCall => gates[toolCall.tool_call_id],
      });

      const pendingFirst = conversation.receiveMessage(
        awaitingApproval("call-1")
      );
      const pendingSecond = conversation.receiveMessage(
        awaitingApproval("call-2", "delete_docs")
      );

      second.resolve(false);
      await pendingSecond;

      await conversation.receiveMessage(inState("call-1", "failure"));
      first.resolve(true);
      await pendingFirst;

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith({
        type: "mcp_tool_approval_result",
        tool_call_id: "call-2",
        is_approved: false,
      });
    });

    it.each(["disconnecting", "disconnected"] as const)(
      "does not ask for approval when the session is already %s",
      async status => {
        const onError = vi.fn();
        const onMCPToolApprovalRequest = vi.fn().mockResolvedValue(true);
        const { conversation, sendMessage } = createWithSpy({
          onError,
          onMCPToolApprovalRequest,
        });
        conversation.connect();
        conversation.setStatus(status);

        await conversation.receiveMessage(awaitingApproval("call-1"));

        expect(onMCPToolApprovalRequest).not.toHaveBeenCalled();
        expect(sendMessage).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(
          "Ignored an approval request for MCP tool call call-1, which arrived after the session ended",
          {
            toolCallId: "call-1",
            toolName: "search_docs",
            serviceId: "service-1",
          }
        );
      }
    );

    it("keeps distinct tool calls independent", async () => {
      const { conversation, sendMessage } = createWithSpy({
        onMCPToolApprovalRequest: toolCall =>
          toolCall.tool_call_id === "call-1",
      });

      await conversation.receiveMessage(awaitingApproval("call-1"));
      await conversation.receiveMessage(awaitingApproval("call-2"));

      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage).toHaveBeenNthCalledWith(1, {
        type: "mcp_tool_approval_result",
        tool_call_id: "call-1",
        is_approved: true,
      });
      expect(sendMessage).toHaveBeenNthCalledWith(2, {
        type: "mcp_tool_approval_result",
        tool_call_id: "call-2",
        is_approved: false,
      });
    });
  });
});
