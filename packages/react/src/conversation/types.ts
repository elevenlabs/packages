import type {
  SessionConfig,
  ClientToolResult,
  ClientToolsConfig,
  InputConfig,
  AudioWorkletConfig,
  OutputConfig,
  FormatConfig,
  Callbacks,
  ConversationLifecycleOptions,
  Location,
} from "@elevenlabs/client";

/**
 * Re-exported so the hook API and `@elevenlabs/client` agree on what a client
 * tool may return. This used to be declared here as `string | number | void`,
 * which was narrower than the coercion in `BaseConversation` accepts.
 */
export type { ClientToolResult };

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
  | "onAgentReasoningResponsePart"
  | "onAgentResponseCorrection"
  | "onRichContent"
  | "onAudioAlignment"
  | "onGuardrailTriggered"
  | "onAgentTyping"
  | "onExternalAgentConnected"
  | "onExternalAgentDisconnected"
  | "onPing"
  | "onContextUsage"
  | "onIncomingEvent"
  | "onOutgoingEvent"
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
