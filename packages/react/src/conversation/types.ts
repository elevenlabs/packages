import type {
  SessionConfig,
  ClientToolsConfig,
  InputConfig,
  AudioWorkletConfig,
  OutputConfig,
  FormatConfig,
  Callbacks,
} from "@elevenlabs/client";
import type { Location } from "@elevenlabs/client/internal";

export type HookCallbacks = Pick<
  Callbacks,
  | "onConnect"
  | "onDisconnect"
  | "onError"
  | "onMessage"
  | "onAudio"
  | "onModeChange"
  | "onStatusChange"
  | "onCanSendFeedbackChange"
  | "onDebug"
  | "onUnhandledClientToolCall"
  | "onVadScore"
  | "onInterruption"
  | "onAgentToolResponse"
  | "onAgentToolRequest"
  | "onConversationMetadata"
  | "onMCPToolCall"
  | "onMCPConnectionStatus"
  | "onAsrInitiationMetadata"
  | "onAgentChatResponsePart"
  | "onAudioAlignment"
>;

export type HookOptions = Partial<
  SessionConfig &
    HookCallbacks &
    ClientToolsConfig &
    InputConfig &
    OutputConfig &
    AudioWorkletConfig &
    FormatConfig & {
      serverLocation?: Location | string;
    }
>;
