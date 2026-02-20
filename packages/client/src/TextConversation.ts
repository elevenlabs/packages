import { createConnection } from "./utils/ConnectionFactory";
import type { BaseConnection } from "./utils/BaseConnection";
import { applyDelay } from "./utils/applyDelay";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation";
import {
  ELEVENLABS_CONVERSATION_SYMBOL,
  type ElevenLabsConversationAPI,
} from "@elevenlabs/types";

export class TextConversation extends BaseConversation {
  public static async startSession(
    options: PartialOptions
  ): Promise<TextConversation> {
    const fullOptions = BaseConversation.getFullOptions(options);

    if (fullOptions.onStatusChange) {
      fullOptions.onStatusChange({ status: "connecting" });
    }
    if (fullOptions.onCanSendFeedbackChange) {
      fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });
    }
    if (fullOptions.onModeChange) {
      fullOptions.onModeChange({ mode: "listening" });
    }
    if (fullOptions.onCanSendFeedbackChange) {
      fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });
    }

    let connection: BaseConnection | null = null;
    try {
      await applyDelay(fullOptions.connectionDelay);
      connection = await createConnection(options);
      return new TextConversation(fullOptions, connection);
    } catch (error) {
      if (fullOptions.onStatusChange) {
        fullOptions.onStatusChange({ status: "disconnected" });
      }
      connection?.close();
      throw error;
    }
  }

  protected constructor(options: Options, connection: BaseConnection) {
    super(options, connection);
    if (this.options.debug) {
      this.exposeGlobalAPI();
    }
  }

  private exposeGlobalAPI() {
    if (typeof window === "undefined") return;

    const self = this;
    const api: ElevenLabsConversationAPI = {
      get status() {
        return self.status;
      },
      get conversationId() {
        return self.connection.conversationId;
      },
      get inputFormat() {
        return self.connection.inputFormat;
      },
      sendUserMessage(text: string) {
        self.sendUserMessage(text);
      },
      sendAudio() {
        return Promise.reject(
          new Error("sendAudio is not available for text-only conversations")
        );
      },
    };

    (window as any)[ELEVENLABS_CONVERSATION_SYMBOL] = api;
  }

  protected override async handleEndSession() {
    if (typeof window !== "undefined" && this.options.debug) {
      delete (window as any)[ELEVENLABS_CONVERSATION_SYMBOL];
    }
    await super.handleEndSession();
  }
}
