import type * as Generated from "../generated/types/asyncapi-types";

/**
 * Role in the conversation
 */
export type Role = "user" | "agent";

export type AudioAlignmentEvent = Generated.AudioEventAlignment;

/**
 * Current mode of the conversation
 */
export type Mode = "speaking" | "listening";

/**
 * Connection status of the conversation
 */
export type Status =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

/**
 * Reason for the disconnection
 */
export type DisconnectionDetails =
  | {
      reason: "error";
      message: string;
      context: Event;
      closeCode?: number;
      closeReason?: string;
    }
  | {
      reason: "agent";
      context?: CloseEvent;
      closeCode?: number;
      closeReason?: string;
    }
  | {
      reason: "user";
    };

export interface MessagePayload {
  message: string;
  /**
   * @deprecated use {@link role} instead.
   */
  source: "user" | "ai";
  role: Role;
}

/**
 * Shared Callbacks, ensures all callbacks are implemented across all SDKs
 */
export type Callbacks = {
  onConnect?: (props: { conversationId: string }) => void;
  onDisconnect?: (details: DisconnectionDetails) => void;
  onError?: (message: string, context?: any) => void;
  onMessage?: (props: MessagePayload) => void;
  onAudio?: (base64Audio: string) => void;
  onModeChange?: (prop: { mode: Mode }) => void;
  onStatusChange?: (prop: { status: Status }) => void;
  onCanSendFeedbackChange?: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (
    params: Generated.ClientToolCallClientEvent["client_tool_call"]
  ) => void;
  onVadScore?: (props: { vadScore: number }) => void;
  onMCPToolCall?: (
    props: Generated.McpToolCallClientEvent["mcp_tool_call"]
  ) => void;
  onMCPConnectionStatus?: (
    props: Generated.McpConnectionStatusClientEvent["mcp_connection_status"]
  ) => void;
  onAgentToolRequest?: (
    props: Generated.AgentToolRequestClientEvent["agent_tool_request"]
  ) => void;
  onAgentToolResponse?: (
    props: Generated.AgentToolResponseClientEvent["agent_tool_response"]
  ) => void;
  onConversationMetadata?: (
    props: Generated.ConversationMetadata["conversation_initiation_metadata_event"]
  ) => void;
  onAsrInitiationMetadata?: (
    props: Generated.AsrInitiationMetadataEvent["asr_initiation_metadata_event"]
  ) => void;
  onInterruption?: (
    props: Generated.Interruption["interruption_event"]
  ) => void;
  onAgentChatResponsePart?: (
    props: Generated.AgentChatResponsePartClientEvent["text_response_part"]
  ) => void;
  onAudioAlignment?: (props: AudioAlignmentEvent) => void;
  // internal debug events, not to be used
  onDebug?: (props: any) => void;
};

/**
 * The well-known symbol used to store the active conversation on `window`.
 * Exposed by the SDK when `debug: true` is set in the session options.
 *
 * @example
 * ```ts
 * const api = window[Symbol.for("ElevenLabs.SDK.CurrentAgentConversation")];
 * api?.sendUserMessage("hello");
 * ```
 */
export const ELEVENLABS_CONVERSATION_SYMBOL = Symbol.for(
  "ElevenLabs.SDK.CurrentAgentConversation"
);

/**
 * Shape of the object stored at {@link ELEVENLABS_CONVERSATION_SYMBOL} on
 * `window`. Provides a transport-agnostic interface for any JavaScript
 * running on the page to interact with an active conversation.
 */
export interface ElevenLabsConversationAPI {
  readonly status: Status;
  readonly conversationId: string;
  readonly inputFormat: { sampleRate: number; format: string };
  sendUserMessage(text: string): void;
  /**
   * Injects base64-encoded PCM audio into the conversation as user input.
   * Works identically for both WebSocket and WebRTC connections.
   * Returns a cancel function that stops the injection and restores state.
   */
  sendAudio(
    base64Audio: string,
    sampleRate?: number
  ): Promise<{ cancel: () => void }>;
}
