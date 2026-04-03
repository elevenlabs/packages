import { isTextOnly, type PartialOptions } from "./BaseConversation";
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
  AudioWorkletConfig,
  MultimodalMessageInput,
} from "./BaseConversation";
export type { InputController, InputDeviceConfig } from "./InputController";
export type { OutputController, OutputDeviceConfig } from "./OutputController";
export type { InputConfig } from "./utils/input";
export type { OutputConfig } from "./utils/output";
export type {
  IncomingSocketEvent,
  VadScoreEvent,
  AudioAlignmentEvent,
} from "./utils/events";
export type {
  SessionConfig,
  BaseSessionConfig,
  DisconnectionDetails,
  Language,
  ConnectionType,
  FormatConfig,
} from "./utils/BaseConnection";
export { createConnection } from "./utils/ConnectionFactory";
export { WebSocketConnection } from "./utils/WebSocketConnection";
export { WebRTCConnection } from "./utils/WebRTCConnection";
export { postOverallFeedback } from "./utils/postOverallFeedback";
export { SessionConnectionError } from "./utils/errors";
export type { Location } from "./utils/location";
export { VoiceConversation } from "./VoiceConversation";
export { TextConversation } from "./TextConversation";

// Scribe exports
export {
  Scribe,
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
  RealtimeConnection,
} from "./scribe";
export type {
  AudioOptions,
  MicrophoneOptions,
  WebSocketMessage,
  PartialTranscriptMessage,
  CommittedTranscriptMessage,
  CommittedTranscriptWithTimestampsMessage,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
  ScribeQuotaExceededErrorMessage,
  ScribeCommitThrottledErrorMessage,
  ScribeTranscriberErrorMessage,
  ScribeUnacceptedTermsErrorMessage,
  ScribeRateLimitedErrorMessage,
  ScribeInputErrorMessage,
  ScribeQueueOverflowErrorMessage,
  ScribeResourceExhaustedErrorMessage,
  ScribeSessionTimeLimitExceededErrorMessage,
  ScribeChunkSizeExceededErrorMessage,
  ScribeInsufficientAudioActivityErrorMessage,
} from "./scribe";

export type Conversation = TextConversation | VoiceConversation;

interface ConversationNamespace {
  startSession<T extends PartialOptions>(
    options: T
  ): T extends { textOnly: true }
    ? Promise<TextConversation>
    : T extends { textOnly: false }
      ? Promise<VoiceConversation>
      : Promise<TextConversation | VoiceConversation>;
}

export const Conversation: ConversationNamespace = {
  startSession(options: PartialOptions) {
    return isTextOnly(options)
      ? TextConversation.startSession(options)
      : VoiceConversation.startSession(options);
  },
} as ConversationNamespace;
