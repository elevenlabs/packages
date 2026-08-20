import type {
  AgentTypingClientEvent,
  AudioEventAlignment,
  ClientToolCallClientEvent,
  ExternalAgentConnectedClientEvent,
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
  AgentReasoningResponsePartClientEvent,
  ContextUsageClientEvent,
  Ping,
  RichContentClientEvent,
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
 * Platform-agnostic representation of the event that triggered a disconnection.
 * Replaces the former `Event` / `CloseEvent` DOM constructors which are
 * not available on React Native.
 */
export type DisconnectionContext = {
  type: string;
  reason?: string;
  code?: number;
};

/**
 * Reason for the disconnection
 */
export type DisconnectionDetails =
  | {
      reason: "error";
      message: string;
      context: DisconnectionContext;
      closeCode?: number;
      closeReason?: string;
    }
  | {
      reason: "agent";
      context?: DisconnectionContext;
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
 * An MCP tool call in the one state that can be answered with an approval
 * result. Narrowed from {@link McpToolCallClientEvent} so handlers get
 * `approval_timeout_secs` and the tool metadata without re-narrowing.
 */
export type MCPToolApprovalRequest = Extract<
  McpToolCallClientEvent["mcp_tool_call"],
  { state: "awaiting_approval" }
>;

export type MCPToolApprovalRequestContext = {
  /**
   * Aborted once the SDK will no longer send this handler's decision: the
   * server moved the tool call past `awaiting_approval` (its approval window
   * elapsed, for example), or the session ended. Use it to dismiss approval
   * UI that can no longer have an effect.
   */
  signal: AbortSignal;
};

/**
 * Decides whether an MCP tool call awaiting approval may proceed.
 *
 * The SDK sends the resulting `mcp_tool_approval_result` for you, exactly
 * once per `tool_call_id`. Rejecting, or resolving to anything other than a
 * boolean, is reported through `onError` and treated as a denial.
 */
export type MCPToolApprovalHandler = (
  toolCall: MCPToolApprovalRequest,
  context: MCPToolApprovalRequestContext
) => Promise<boolean> | boolean;

/**
 * Handler option for MCP tool approvals. Sits outside {@link Callbacks}
 * because it has request/response semantics — it returns a value the SDK
 * puts on the wire — so the multi-listener composition that callbacks get in
 * the React SDK does not apply. `clientTools` is the existing precedent.
 */
export type MCPToolApprovalConfig = {
  onMCPToolApprovalRequest?: MCPToolApprovalHandler;
};

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
  /**
   * Called for each streaming reasoning response chunk from the agent.
   * Receives `{ text, type, event_id }` where `type` is `"start"`, `"delta"`,
   * or `"stop"`.
   *
   * @experimental This API is experimental and may change without following
   * semver guarantees.
   */
  onAgentReasoningResponsePart?: (
    props: AgentReasoningResponsePartClientEvent["reasoning_response_part"]
  ) => void;
  /**
   * Called when the agent sends a component for the client to display, such as
   * an item card. Receives `{ rich_content_id, component, props, event_id }`.
   *
   * @experimental This API is experimental and may change without following
   * semver guarantees.
   */
  onRichContent?: (props: RichContentClientEvent["rich_content"]) => void;
  onGuardrailTriggered?: () => void;
  onAudioAlignment?: (props: AudioAlignmentEvent) => void;
  onAgentTyping?: (props: AgentTypingClientEvent["agent_typing_event"]) => void;
  onExternalAgentConnected?: () => void;
  onExternalAgentDisconnected?: () => void;
  /**
   * Called for every `ping` event received from the server. The SDK
   * automatically replies with a `pong`, so this callback is purely
   * informational — a common use is surfacing connection latency to the user.
   *
   * The `ping_ms` property is the estimated ping in milliseconds, based on
   * previous ping/pong timing. It may be `undefined` or `null` when no
   * estimate is available yet.
   */
  onPing?: (props: Ping["ping_event"]) => void;
  /**
   * Called when the server reports LLM context-window usage, which happens
   * after each completed agent turn. Receives `{ event_id, model,
   * context_tokens, context_limit_tokens }`, where `context_tokens` is the
   * prompt size of the turn's last LLM generation and `context_limit_tokens`
   * is that model's maximum context window.
   */
  onContextUsage?: (
    props: ContextUsageClientEvent["context_usage_event"]
  ) => void;
  // internal debug events, not to be used
  onDebug?: (props: any) => void;
  /**
   * Called for every incoming event received from the server.
   */
  onIncomingEvent?: (props: any) => void;
  /**
   * Called for every outgoing event sent to the server.
   */
  onOutgoingEvent?: (props: any) => void;
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
  "onAgentReasoningResponsePart",
  "onRichContent",
  "onAudioAlignment",
  "onGuardrailTriggered",
  "onAgentTyping",
  "onExternalAgentConnected",
  "onExternalAgentDisconnected",
  "onPing",
  "onContextUsage",
  "onDebug",
  "onIncomingEvent",
  "onOutgoingEvent",
] as const satisfies readonly (keyof Callbacks)[];
