// Conversation context API
export {
  ConversationProvider,
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

// Override the source set by @elevenlabs/react
import { setClient } from "@elevenlabs/client/internal";
import { PACKAGE_VERSION } from "./version";

setClient({ name: "react_native_sdk", version: PACKAGE_VERSION });
