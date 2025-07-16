// Simplified ElevenLabs React Native SDK
export { ElevenLabsProvider, useConversation } from "./ElevenLabsProvider";

// Core types
export type {
  Role,
  Mode,
  ConversationStatus,
  Language,
  Callbacks,
  ClientToolsConfig,
} from "./types";

export {
  ConversationError as ConversationErrorClass,
  ErrorCodes,
} from "./errors";
