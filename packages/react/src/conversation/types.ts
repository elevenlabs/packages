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

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

/**
 * Options that apply to every start. `signal` is excluded because an
 * `AbortSignal` is one-shot: a reused signal that was aborted once would make
 * every later start a no-op. Pass it to `startSession()` instead.
 */
export type HookDefaultOptions = DistributiveOmit<HookOptions, "signal">;
