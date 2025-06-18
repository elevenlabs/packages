import { ConnectionFactory } from "./utils/ConnectionFactory";
import { BaseConnection } from "./utils/BaseConnection";
import { applyDelay } from "./utils/applyDelay";
import { BaseConversation, PartialOptions } from "./BaseConversation";

export class TextConversation extends BaseConversation {
  public static async startSession(
    options: PartialOptions
  ): Promise<TextConversation> {
    const fullOptions = BaseConversation.getFullOptions(options);

    fullOptions.onStatusChange({ status: "connecting" });
    fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });

    let connection: BaseConnection | null = null;
    try {
      await applyDelay(fullOptions.connectionDelay);
      connection = await ConnectionFactory.create(options);
      return new TextConversation(fullOptions, connection);
    } catch (error) {
      fullOptions.onStatusChange({ status: "disconnected" });
      connection?.close();
      throw error;
    }
  }
}
