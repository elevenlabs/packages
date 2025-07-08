// ElevenLabs React Native SDK
// Main entry point for the React Native SDK

// EXPORT WORKING CONVERSATION CLASS WITH EXPO PERMISSIONS FIX
export { Conversation } from "./conversation";

// Core types from client SDK pattern
export type {
  Role,
  Mode,
  Status,
  Language,
  Options,
  PartialOptions,
  Callbacks,
  ClientToolsConfig,
  ReactNativeSessionConfig,
  DisconnectionDetails,
  ClientToolCallEvent,
} from "./types";

// Enhanced audio types
export type {
  AudioQualitySettings,
  AudioRouting,
  IOSAudioSessionConfig,
  AndroidAudioConfig,
  ConnectionQuality,
  ConnectionDiagnostics,
  AudioMetrics,
  PerformanceConfig,
  PerformanceMetrics,
} from "./types";

// Legacy type aliases for backward compatibility
export type {
  ConversationConfig,
  ConversationStatus,
  ConversationMode,
  ConversationMessage,
  ConversationError,
  ClientTools,
} from "./types";

// Error classes
export {
  ConversationError as ConversationErrorClass,
  ErrorCodes,
} from "./errors";

// Note: Users should import Livekit utilities directly from @livekit/react-native:
// import { registerGlobals, AudioSession } from "@livekit/react-native";
// This follows the official Livekit React Native Expo example pattern
