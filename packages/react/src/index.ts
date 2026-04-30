import { setSourceInfo } from "@elevenlabs/client/internal";
import { PACKAGE_VERSION } from "./version.js";

setSourceInfo({ name: "react_sdk", version: PACKAGE_VERSION });

export * from "@elevenlabs/client";

// Scribe exports
export {
  useScribe,
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
} from "./scribe.js";
export type {
  ScribeStatus,
  TranscriptSegment,
  WordTimestamp,
  ScribeCallbacks,
  ScribeHookOptions,
  UseScribeReturn,
  RealtimeConnection,
} from "./scribe.js";

// Conversation context API
export { ConversationProvider } from "./conversation/ConversationProvider.js";
export { useConversationControls } from "./conversation/ConversationControls.js";
export { useConversationStatus } from "./conversation/ConversationStatus.js";
export { useConversationInput } from "./conversation/ConversationInput.js";
export { useConversationAudioStream } from "./conversation/ConversationAudioStream.js";
export { useConversationMode } from "./conversation/ConversationMode.js";
export { useConversationFeedback } from "./conversation/ConversationFeedback.js";
export { useRawConversation } from "./conversation/ConversationContext.js";
export { useConversation } from "./conversation/useConversation.js";
export { useConversationClientTool } from "./conversation/ConversationClientTools.js";
export type { UseConversationOptions } from "./conversation/useConversation.js";
export type { ConversationControlsValue } from "./conversation/ConversationControls.js";
export type { ConversationInputValue } from "./conversation/ConversationInput.js";
export type { ConversationAudioStreamValue } from "./conversation/ConversationAudioStream.js";
export type {
  ConversationStatus,
  ConversationStatusValue,
} from "./conversation/ConversationStatus.js";
export type { ConversationModeValue } from "./conversation/ConversationMode.js";
export type { ConversationFeedbackValue } from "./conversation/ConversationFeedback.js";
export type { ConversationProviderProps } from "./conversation/ConversationProvider.js";
export type {
  HookOptions,
  HookCallbacks,
  ClientTool,
  ClientTools,
  ClientToolResult,
} from "./conversation/types.js";
