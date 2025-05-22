import { BaseConversation, PartialOptions } from "./BaseConversation";
import { TextConversation } from "./TextConversation";
import { VoiceConversation } from "./VoiceConversation";

export type {
  Mode,
  Role,
  Options,
  PartialOptions,
  ClientToolsConfig,
  Callbacks,
  Status,
} from "./BaseConversation";
export type { InputConfig } from "./utils/input";
export type { IncomingSocketEvent } from "./utils/events";
export type {
  SessionConfig,
  DisconnectionDetails,
  Language,
} from "./utils/connection";
export { postOverallFeedback } from "./utils/postOverallFeedback";

export class Conversation extends BaseConversation {
  public static startSession(options: PartialOptions): Promise<Conversation> {
    return options.textOnly
      ? TextConversation.startSession(options)
      : VoiceConversation.startSession(options);
  }
}
