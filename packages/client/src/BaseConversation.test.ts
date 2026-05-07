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
    options: Partial<Options> & { origin?: string } = {}
  ): TestConversation {
    const fullOptions = TestConversation.getFullOptions({
      agentId: "test-agent-id",
      connectionType: "webrtc",
      ...options,
    } as PartialOptions);
    return new TestConversation(fullOptions, noopConnection);
  }

  constructor(options: Options, connection: BaseConnection) {
    super(options, connection);
  }

  public setVolume(): void {}
  public setMicMuted(): void {}
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
    return this["onMessageHandler"](event);
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
});
