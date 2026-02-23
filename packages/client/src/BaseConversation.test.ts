import { describe, it, expect, vi } from "vitest";

import { BaseConversation, Options, PartialOptions } from "./BaseConversation";
import type { BaseConnection } from "./utils/BaseConnection";
import type { ConversationConfigUpdateAppliedEvent } from "./utils/events";

function createMockConnection(
  overrides: Partial<BaseConnection> = {}
): BaseConnection {
  const mock = {
    conversationId: "test-conv-id",
    inputFormat: { format: "pcm" as const, sampleRate: 16000 },
    outputFormat: { format: "pcm" as const, sampleRate: 16000 },
    close: vi.fn(),
    sendMessage: vi.fn(),
    setMicMuted: vi.fn(() => Promise.resolve()),
    onMessage: vi.fn(),
    onDisconnect: vi.fn(),
    onModeChange: vi.fn(),
    ...overrides,
  };
  return mock as unknown as BaseConnection;
}

class TestConversation extends BaseConversation {
  public static getFullOptions(partialOptions: PartialOptions): Options {
    return super.getFullOptions(partialOptions);
  }

  public static create(options: Options, connection: BaseConnection) {
    return new TestConversation(options, connection);
  }

  public triggerConversationConfigUpdateApplied(
    event: ConversationConfigUpdateAppliedEvent
  ) {
    this.handleConversationConfigUpdateApplied(event);
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

  describe("conversation_config_update_applied", () => {
    it("calls onConversationModeChange with payload when event has mode voice", () => {
      const onConversationModeChange = vi.fn();
      const options = TestConversation.getFullOptions({
        agentId: "test-agent",
        connectionType: "webrtc",
      });
      options.onConversationModeChange = onConversationModeChange;

      const connection = createMockConnection();
      const conversation = TestConversation.create(options, connection);

      conversation.triggerConversationConfigUpdateApplied({
        type: "conversation_config_update_applied",
        conversation_config_update_applied_event: { mode: "voice" },
      });

      expect(onConversationModeChange).toHaveBeenCalledTimes(1);
      expect(onConversationModeChange).toHaveBeenCalledWith({ mode: "voice" });
    });

    it("calls onConversationModeChange with payload when event has mode text", () => {
      const onConversationModeChange = vi.fn();
      const options = TestConversation.getFullOptions({
        agentId: "test-agent",
        connectionType: "webrtc",
      });
      options.onConversationModeChange = onConversationModeChange;

      const connection = createMockConnection();
      const conversation = TestConversation.create(options, connection);

      conversation.triggerConversationConfigUpdateApplied({
        type: "conversation_config_update_applied",
        conversation_config_update_applied_event: { mode: "text" },
      });

      expect(onConversationModeChange).toHaveBeenCalledTimes(1);
      expect(onConversationModeChange).toHaveBeenCalledWith({ mode: "text" });
    });

    it("does not throw when onConversationModeChange is not set", () => {
      const options = TestConversation.getFullOptions({
        agentId: "test-agent",
        connectionType: "webrtc",
      });
      const connection = createMockConnection();
      const conversation = TestConversation.create(options, connection);

      expect(() =>
        conversation.triggerConversationConfigUpdateApplied({
          type: "conversation_config_update_applied",
          conversation_config_update_applied_event: { mode: "voice" },
        })
      ).not.toThrow();
    });
  });
});
