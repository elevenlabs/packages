import type {
  SessionConfig,
  ClientToolsConfig,
  InputConfig,
  AudioWorkletConfig,
  OutputConfig,
  FormatConfig,
  Callbacks,
  ConversationLifecycleOptions,
  Location,
} from "@elevenlabs/client";

export type ClientToolResult = string | number | void;

export type ClientTool<
  Parameters extends Record<string, unknown> = Record<string, unknown>,
  Result extends ClientToolResult = ClientToolResult,
> = (parameters: Parameters) => Promise<Result> | Result;

export type ClientTools = Record<string, ClientTool>;

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
  | "onAgentResponseCorrection"
  | "onAudioAlignment"
  | "onGuardrailTriggered"
>;

export type HookOptions = Partial<
  SessionConfig &
    HookCallbacks &
    ConversationLifecycleOptions &
    ClientToolsConfig &
    InputConfig &
    OutputConfig &
    AudioWorkletConfig &
    FormatConfig & {
      serverLocation?: Location | string;
    }
>;
