import { createConnection } from "./utils/ConnectionFactory";
import type { BaseConnection } from "./utils/BaseConnection";
import { applyDelay } from "./utils/applyDelay";
import { BaseConversation, type PartialOptions } from "./BaseConversation";

const EMPTY_FREQUENCY_DATA = new Uint8Array(0);

export class TextConversation extends BaseConversation {
  public setVolume(): void {}

  public setMicMuted(): void {}

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
}
