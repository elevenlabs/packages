// Export the main Scribe class (renamed from ScribeRealtime)
export { ScribeRealtime as Scribe } from "./scribe";

// Export connection class
export { RealtimeConnection } from "./connection";

// Export enums
export { AudioFormat, CommitStrategy } from "./scribe";
export { RealtimeEvents } from "./connection";
export type { RealtimeEventMap } from "./connection";

// Export types
export type { AudioOptions, MicrophoneOptions } from "./scribe";
export type {
  WebSocketMessage,
  SessionStartedMessage,
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
} from "./connection";
