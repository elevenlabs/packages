import { describe, it, expect, vi } from "vitest";

import { BaseConversation, Options, PartialOptions } from "./BaseConversation";

class TestConversation extends BaseConversation {
  public static getFullOptions(partialOptions: PartialOptions): Options {
    return super.getFullOptions(partialOptions);
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
});
