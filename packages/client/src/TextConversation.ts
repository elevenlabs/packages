import { Connection } from "./utils/connection";
import { applyDelay } from "./utils/applyDelay";
import { BaseConversation, PartialOptions } from "./BaseConversation";

export class TextConversation extends BaseConversation {
  public static async startSession(
    options: PartialOptions
  ): Promise<TextConversation> {
    const fullOptions = BaseConversation.getFullOptions(options);

    fullOptions.onStatusChange({ status: "connecting" });
    fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });

    let connection: Connection | null = null;
    try {
      await applyDelay(fullOptions.connectionDelay);
      connection = await Connection.create(options);
      return new TextConversation(fullOptions, connection);
    } catch (error) {
      fullOptions.onStatusChange({ status: "disconnected" });
      connection?.close();
      throw error;
    }
  }
}
