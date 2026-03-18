import { setSourceInfo } from "@elevenlabs/client/internal";
import { PACKAGE_VERSION } from "./version";

setSourceInfo({ name: "react_sdk", version: PACKAGE_VERSION });

export * from "@elevenlabs/client";

// Scribe exports
export {
  useScribe,
  AudioFormat,
  CommitStrategy,
  RealtimeEvents,
} from "./scribe";
export type {
  ScribeStatus,
  TranscriptSegment,
  WordTimestamp,
  ScribeCallbacks,
  ScribeHookOptions,
  UseScribeReturn,
  RealtimeConnection,
} from "./scribe";

// Conversation context API
export { ConversationProvider } from "./conversation/ConversationProvider";
export { useConversationControls } from "./conversation/ConversationControls";
export { useConversationStatus } from "./conversation/ConversationStatus";
export { useConversationInput } from "./conversation/ConversationInput";
export { useConversationMode } from "./conversation/ConversationMode";
export { useConversationFeedback } from "./conversation/ConversationFeedback";
export { useRawConversation } from "./conversation/ConversationContext";
export { useConversation } from "./conversation/useConversation";
export { useConversationClientTool } from "./conversation/ConversationClientTools";
export type { UseConversationOptions } from "./conversation/useConversation";
export type { ConversationControlsValue } from "./conversation/ConversationControls";
export type { ConversationInputValue } from "./conversation/ConversationInput";
export type { ConversationStatusValue } from "./conversation/ConversationStatus";
export type { ConversationModeValue } from "./conversation/ConversationMode";
export type { ConversationFeedbackValue } from "./conversation/ConversationFeedback";
export type { ConversationProviderProps } from "./conversation/ConversationProvider";
export type {
  HookOptions,
  HookCallbacks,
  ClientTools,
  ClientToolResult,
} from "./conversation/types";
