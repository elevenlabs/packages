import { createConnection } from "./utils/ConnectionFactory.js";
import type { BaseConnection } from "./utils/BaseConnection.js";
import { applyDelay } from "./utils/applyDelay.js";
import { BaseConversation, type PartialOptions } from "./BaseConversation.js";

const EMPTY_FREQUENCY_DATA = new Uint8Array(0);

export class TextConversation extends BaseConversation {
  readonly type = "text";

  protected override async handlePause(): Promise<() => Promise<void>> {
    throw new Error("pause is not supported in text conversations");
  }

  protected override shouldHandleAudio(): boolean {
    return false;
  }

  public setVolume(): void {
    throw new Error("setVolume is not supported in text conversations");
  }

  public setMicMuted(): void {
    throw new Error("setMicMuted is not supported in text conversations");
  }

  public getInputByteFrequencyData(): Uint8Array {
    return EMPTY_FREQUENCY_DATA;
  }

  public getOutputByteFrequencyData(): Uint8Array {
    return EMPTY_FREQUENCY_DATA;
  }

  public getInputVolume(): number {
    return 0;
  }

  public getOutputVolume(): number {
    return 0;
  }

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
    let conversation: TextConversation | null = null;
    try {
      await applyDelay(fullOptions.connectionDelay);
      connection = await createConnection(fullOptions);
      conversation = new TextConversation(fullOptions, connection);
      fullOptions.onConversationCreated?.(conversation);
      conversation.markConnected();
      fullOptions.onConnect?.({ conversationId: connection.conversationId });
      return conversation;
    } catch (error) {
      if (conversation) {
        await conversation.endSession().catch(() => {});
      } else {
        fullOptions.onStatusChange?.({ status: "disconnected" });
        connection?.close();
      }
      throw error;
    }
  }
}
