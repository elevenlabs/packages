// Export the main Scribe class (renamed from ScribeRealtime)
export { ScribeRealtime as Scribe } from "./scribe.js";

// Export connection class
export { RealtimeConnection } from "./connection.js";

// Export enums
export { AudioFormat, CommitStrategy } from "./scribe.js";
export { RealtimeEvents } from "./connection.js";
export type { RealtimeEventMap } from "./connection.js";

// Export types
export type {
  AudioOptions,
  MicrophoneOptions,
  EntityDetectionCategory,
  EntityDetectionOption,
} from "./scribe.js";
export type {
  WebSocketMessage,
  SessionStartedMessage,
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
} from "./connection.js";
