import { setSourceInfo } from "@elevenlabs/client/internal";
import { PACKAGE_VERSION } from "./version";

// Identify as react_native_sdk
setSourceInfo({ name: "react_native_sdk", version: PACKAGE_VERSION });

// Conversation context API
export {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationStatus,
  useConversationInput,
  useConversationMode,
  useConversationFeedback,
  useRawConversation,
  useConversation,
  type UseConversationOptions,
  type ConversationControlsValue,
  type ConversationInputValue,
  type ConversationStatus,
  type ConversationStatusValue,
  type ConversationModeValue,
  type ConversationFeedbackValue,
  type ConversationProviderProps,
  type HookOptions,
  type HookCallbacks,
} from "@elevenlabs/react";
