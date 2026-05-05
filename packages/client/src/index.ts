import { isTextOnly, type PartialOptions } from "./BaseConversation.js";
import { TextConversation } from "./TextConversation.js";
import { VoiceConversation } from "./VoiceConversation.js";

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
  UploadFileResult,
  ConversationCreatedCallback,
  ConversationLifecycleOptions,
  ContextualUpdateOptions,
} from "./BaseConversation.js";
export type { InputController, InputDeviceConfig } from "./InputController.js";
export type {
  OutputController,
  OutputDeviceConfig,
} from "./OutputController.js";
export type { InputConfig } from "./utils/input.js";
export type { OutputConfig } from "./utils/output.js";
export type {
  IncomingSocketEvent,
  VadScoreEvent,
  AudioAlignmentEvent,
} from "./utils/events.js";
export type {
  SessionConfig,
  BaseSessionConfig,
  DisconnectionDetails,
  Language,
  ConnectionType,
  FormatConfig,
} from "./utils/BaseConnection.js";
export { createConnection } from "./utils/ConnectionFactory.js";
export { WebSocketConnection } from "./utils/WebSocketConnection.js";
export { WebRTCConnection } from "./utils/WebRTCConnection.js";
export type { VolumeProvider } from "./utils/volumeProvider.js";
export { postOverallFeedback } from "./utils/postOverallFeedback.js";
export { SessionConnectionError } from "./utils/errors.js";
export type { Location } from "./utils/location.js";
export { VoiceConversation } from "./VoiceConversation.js";
export { TextConversation } from "./TextConversation.js";

// Scribe exports
export {
  Scribe,
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
  RealtimeConnection,
} from "./scribe/index.js";
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
} from "./scribe/index.js";

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
