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

function createConnection(overrides: Partial<BaseConnection> = {}) {
  return {
    ...noopConnection,
    ...overrides,
  } as unknown as BaseConnection;
}

class TestConversation extends BaseConversation {
  public pauseCount = 0;
  public resumeCount = 0;

  public static getFullOptions(partialOptions: PartialOptions): Options {
    return super.getFullOptions(partialOptions);
  }

  public static create(
    options: { origin?: string } = {},
    connection = noopConnection
  ): TestConversation {
    const fullOptions = TestConversation.getFullOptions({
      agentId: "test-agent-id",
      connectionType: "webrtc",
      ...options,
    });
    return new TestConversation(fullOptions, connection);
  }

  constructor(options: Options, connection: BaseConnection) {
    super(options, connection);
  }

  protected override async handlePause(): Promise<void> {
    this.pauseCount++;
  }

  protected override async handleResume(): Promise<void> {
    this.resumeCount++;
  }

  protected override shouldHandleAudio(): boolean {
    return true;
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

  describe("pause and resume", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("reports pause state", async () => {
      vi.useFakeTimers();
      const conversation = TestConversation.create(
        {},
        createConnection({ sendMessage: vi.fn() })
      );

      expect(conversation.isPaused()).toBe(false);

      await conversation.pause();
      expect(conversation.isPaused()).toBe(true);

      await conversation.resume();
      expect(conversation.isPaused()).toBe(false);
    });

    it("sends user activity while paused and stops after resume", async () => {
      vi.useFakeTimers();
      const sendMessage = vi.fn();
      const conversation = TestConversation.create(
        {},
        createConnection({ sendMessage })
      );

      await conversation.pause();

      expect(conversation.pauseCount).toBe(1);
      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenLastCalledWith({ type: "user_activity" });

      vi.advanceTimersByTime(1000);
      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage).toHaveBeenLastCalledWith({ type: "user_activity" });

      await conversation.resume();
      expect(conversation.resumeCount).toBe(1);

      vi.advanceTimersByTime(1000);
      expect(sendMessage).toHaveBeenCalledTimes(2);
    });

    it("is idempotent", async () => {
      vi.useFakeTimers();
      const conversation = TestConversation.create(
        {},
        createConnection({ sendMessage: vi.fn() })
      );

      await conversation.pause();
      await conversation.pause();
      await conversation.resume();
      await conversation.resume();

      expect(conversation.pauseCount).toBe(1);
      expect(conversation.resumeCount).toBe(1);
    });

    it("clears paused activity when the session ends", async () => {
      vi.useFakeTimers();
      const sendMessage = vi.fn();
      const conversation = TestConversation.create(
        {},
        createConnection({ sendMessage })
      );

      await conversation.pause();
      await conversation.endSession();

      vi.advanceTimersByTime(1000);
      expect(sendMessage).toHaveBeenCalledTimes(1);
    });
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
});
