import type {
  AudioEventAlignment,
  ClientToolCallClientEvent,
  McpToolCallClientEvent,
  McpConnectionStatusClientEvent,
  AgentToolRequestClientEvent,
  AgentToolResponseClientEvent,
  AgentToolResponseFullPayloadClientEvent,
  ConversationMetadata,
  AsrInitiationMetadataEvent,
  Interruption,
  AgentResponseCorrection,
  AgentChatResponsePartClientEvent,
} from "@elevenlabs/types";

/**
 * Role in the conversation
 */
export type Role = "user" | "agent";

export type AudioAlignmentEvent = AudioEventAlignment;

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
  event_id?: number;
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
    params: ClientToolCallClientEvent["client_tool_call"]
  ) => void;
  onVadScore?: (props: { vadScore: number }) => void;
  onMCPToolCall?: (props: McpToolCallClientEvent["mcp_tool_call"]) => void;
  onMCPConnectionStatus?: (
    props: McpConnectionStatusClientEvent["mcp_connection_status"]
  ) => void;
  onAgentToolRequest?: (
    props: AgentToolRequestClientEvent["agent_tool_request"]
  ) => void;
  onAgentToolResponse?: (
    props:
      | AgentToolResponseClientEvent["agent_tool_response"]
      | AgentToolResponseFullPayloadClientEvent["agent_tool_response_full_payload"]
  ) => void;
  onConversationMetadata?: (
    props: ConversationMetadata["conversation_initiation_metadata_event"]
  ) => void;
  onAsrInitiationMetadata?: (
    props: AsrInitiationMetadataEvent["asr_initiation_metadata_event"]
  ) => void;
  onInterruption?: (props: Interruption["interruption_event"]) => void;
  onAgentResponseCorrection?: (
    props: AgentResponseCorrection["agent_response_correction_event"]
  ) => void;
  onAgentChatResponsePart?: (
    props: AgentChatResponsePartClientEvent["text_response_part"]
  ) => void;
  onGuardrailTriggered?: () => void;
  onAudioAlignment?: (props: AudioAlignmentEvent) => void;
  // internal debug events, not to be used
  onDebug?: (props: any) => void;
};

/**
 * Runtime array of all keys in `Callbacks`, kept in sync with the type above.
 * Used by the React SDK to pre-initialize listener maps for callback composition.
 */
export const CALLBACK_KEYS = [
  "onConnect",
  "onDisconnect",
  "onError",
  "onMessage",
  "onAudio",
  "onModeChange",
  "onStatusChange",
  "onCanSendFeedbackChange",
  "onUnhandledClientToolCall",
  "onVadScore",
  "onMCPToolCall",
  "onMCPConnectionStatus",
  "onAgentToolRequest",
  "onAgentToolResponse",
  "onConversationMetadata",
  "onAsrInitiationMetadata",
  "onInterruption",
  "onAgentResponseCorrection",
  "onAgentChatResponsePart",
  "onAudioAlignment",
  "onGuardrailTriggered",
  "onDebug",
] as const satisfies readonly (keyof Callbacks)[];
