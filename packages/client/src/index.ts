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
} from "./BaseConversation";
export { CALLBACK_KEYS } from "./BaseConversation";
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
export { mergeOptions } from "./utils/mergeOptions";
export { createConnection } from "./utils/ConnectionFactory";
export { WebSocketConnection } from "./utils/WebSocketConnection";
export { WebRTCConnection } from "./utils/WebRTCConnection";
export { postOverallFeedback } from "./utils/postOverallFeedback";
export { SessionConnectionError } from "./utils/errors";
export {
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
} from "./utils/location";
export type { Location } from "./utils/location";
export { VoiceConversation } from "./VoiceConversation";
export { TextConversation } from "./TextConversation";
export { setSetupStrategy } from "./platform/VoiceSessionSetup";
export type {
  VoiceSessionSetupStrategy,
  VoiceSessionSetupResult,
} from "./platform/VoiceSessionSetup";

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

export const Conversation = {
  startSession(options: PartialOptions): Promise<Conversation> {
    return isTextOnly(options)
      ? TextConversation.startSession(options)
      : VoiceConversation.startSession(options);
  },
};
