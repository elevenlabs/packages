import { BaseConversation, type PartialOptions } from "./BaseConversation";
import { TextConversation } from "./TextConversation";
import { VoiceConversation } from "./VoiceConversation";

export type { PartialOptions } from "./BaseConversation";

export class Conversation extends BaseConversation {
  public static startSession(options: PartialOptions): Promise<Conversation> {
    return options.textOnly
      ? TextConversation.startSession(options)
      : VoiceConversation.startSession(options);
  }
}
