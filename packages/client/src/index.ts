import { isTextOnly, type PartialOptions } from "./BaseConversation.js";
import { assertRuntimeCompatibility } from "./runtime.js";
import { TextConversation } from "./TextConversation.js";
import { VoiceConversation } from "./VoiceConversation.js";

export type {
  Mode,
  Role,
  Options,
  PartialOptions,
  ClientToolsConfig,
  MCPToolApprovalConfig,
  MCPToolApprovalHandler,
  MCPToolApprovalRequest,
  MCPToolApprovalRequestContext,
  Callbacks,
  Status,
  AudioWorkletConfig,
  MultimodalMessageInput,
  UploadFileResult,
  ConversationCreatedCallback,
  ConversationLifecycleOptions,
  ContextualUpdateOptions,
  SendUserMessageOptions,
} from "./BaseConversation.js";
export type {
  InputController,
  InputDeviceConfig,
  InputConfig,
} from "./InputController.js";
export { DEFAULT_INPUT_CHUNK_DURATION_MS } from "./InputController.js";
export type {
  OutputController,
  OutputDeviceConfig,
  OutputConfig,
} from "./OutputController.js";
export type {
  IncomingSocketEvent,
  VadScoreEvent,
  PingEvent,
  ContextUsageEvent,
  AudioAlignmentEvent,
} from "./utils/events.js";
export type {
  SessionConfig,
  BaseSessionConfig,
  DisconnectionContext,
  DisconnectionDetails,
  Language,
  ConnectionType,
  FormatConfig,
  OrchestratorConfig,
  OrchestratorSessionConfig,
  PostCallWebhookConfig,
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
  EntityDetectionCategory,
  EntityDetectionOption,
  WebSocketMessage,
  PartialTranscriptMessage,
  FinalTranscriptMessage,
  FinalTranscriptWithTimestampsMessage,
  Word,
  WordType,
  CommittedTranscriptMessage,
  CommittedTranscriptWithTimestampsMessage,
  CommittedTranscriptEntitiesMessage,
  DetectedEntity,
  TranscriptCharacter,
  ScribeErrorMessage,
  ScribeAuthErrorMessage,
  ScribeQuotaExceededErrorMessage,
  ScribeCommitThrottledErrorMessage,
  ScribeTranscriberErrorMessage,
  ScribeUnacceptedTermsErrorMessage,
  ScribeRateLimitedErrorMessage,
  ScribeInputErrorMessage,
  ScribeInvalidRequestErrorMessage,
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
  async startSession(options: PartialOptions) {
    assertRuntimeCompatibility();
    return isTextOnly(options)
      ? TextConversation.startSession(options)
      : VoiceConversation.startSession(options);
  },
} as ConversationNamespace;
