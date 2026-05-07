import type {
  AgentChatResponsePartClientEvent,
  AgentResponseCorrection,
  AgentToolRequestClientEvent,
  AgentToolResponseClientEvent,
  AsrInitiationMetadataEvent as AsrInitiationMetadataWireEvent,
  ClientToolCallClientEvent,
  ConversationMetadata,
  Interruption,
  McpConnectionStatusClientEvent,
  McpToolCallClientEvent,
} from "@elevenlabs/types";
import type { GeneratedEventMap } from "./generated/events.js";
import type {
  AudioAlignmentEvent,
  DisconnectionDetails,
  MessagePayload,
  Mode,
  Status,
} from "./types.js";

// ---------------------------------------------------------------------------
// Internally handled wire events — hand-written dispatch in BaseConversation
// ---------------------------------------------------------------------------

type InternalEventMap = {
  message: (props: MessagePayload) => void;
  audio: (base64Audio: string) => void;
  "unhandled-client-tool-call": (
    params: ClientToolCallClientEvent["client_tool_call"]
  ) => void;
  debug: (props: unknown) => void;
};

// ---------------------------------------------------------------------------
// Extra events not in the wire protocol
// ---------------------------------------------------------------------------

type ExtraEventMap = {
  connect: (props: { conversationId: string }) => void;
  disconnect: (details: DisconnectionDetails) => void;
  error: (message: string, context?: unknown) => void;
  "status-change": (prop: { status: Status }) => void;
  "mode-change": (prop: { mode: Mode }) => void;
  "can-send-feedback-change": (prop: { canSendFeedback: boolean }) => void;
  "audio-alignment": (props: AudioAlignmentEvent) => void;
};

// ---------------------------------------------------------------------------
// Full event map = generated + internal + extra
// ---------------------------------------------------------------------------

/**
 * Complete event map for conversation instances.
 *
 * Generated events use raw wire payload shapes, except `vad-score` which
 * is transformed to `{ vadScore }` for backward compatibility.
 */
export type ConversationEventMap = Omit<GeneratedEventMap, "vad-score"> & {
  "vad-score": (props: { vadScore: number }) => void;
} & InternalEventMap &
  ExtraEventMap;

// ---------------------------------------------------------------------------
// Callbacks — backward-compatible single-callback interface
// ---------------------------------------------------------------------------

/**
 * Shared Callbacks, ensures all callbacks are implemented across all SDKs
 */
export type Callbacks = {
  onConnect?: (props: { conversationId: string }) => void;
  onDisconnect?: (details: DisconnectionDetails) => void;
  onError?: (message: string, context?: unknown) => void;
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
    props: AgentToolResponseClientEvent["agent_tool_response"]
  ) => void;
  onConversationMetadata?: (
    props: ConversationMetadata["conversation_initiation_metadata_event"]
  ) => void;
  onAsrInitiationMetadata?: (
    props: AsrInitiationMetadataWireEvent["asr_initiation_metadata_event"]
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
  onDebug?: (props: unknown) => void;
};

/**
 * Runtime array of all keys in `Callbacks`, kept in sync with the type above.
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

// ---------------------------------------------------------------------------
// Callback key ↔ event name mapping
// ---------------------------------------------------------------------------

/**
 * Maps each callback key to its corresponding event name.
 * Hand-written because the mapping isn't a simple mechanical transform
 * (e.g. `onMCPToolCall` → `mcp-tool-call`, `onConversationMetadata` →
 * `conversation-initiation-metadata`).
 */
export const CALLBACK_KEY_TO_EVENT_NAME = {
  onConnect: "connect",
  onDisconnect: "disconnect",
  onError: "error",
  onMessage: "message",
  onAudio: "audio",
  onModeChange: "mode-change",
  onStatusChange: "status-change",
  onCanSendFeedbackChange: "can-send-feedback-change",
  onUnhandledClientToolCall: "unhandled-client-tool-call",
  onVadScore: "vad-score",
  onMCPToolCall: "mcp-tool-call",
  onMCPConnectionStatus: "mcp-connection-status",
  onAgentToolRequest: "agent-tool-request",
  onAgentToolResponse: "agent-tool-response",
  onConversationMetadata: "conversation-initiation-metadata",
  onAsrInitiationMetadata: "asr-initiation-metadata",
  onInterruption: "interruption",
  onAgentResponseCorrection: "agent-response-correction",
  onAgentChatResponsePart: "agent-chat-response-part",
  onAudioAlignment: "audio-alignment",
  onGuardrailTriggered: "guardrail-triggered",
  onDebug: "debug",
} as const satisfies Record<keyof Callbacks, keyof ConversationEventMap>;
