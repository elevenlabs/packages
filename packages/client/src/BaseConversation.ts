import { Callbacks, Mode, Status } from "./types.js";
import type { MCPToolApprovalConfig, MCPToolApprovalRequest } from "./types.js";
import type {
  BaseConnection,
  DisconnectionDetails,
  SessionConfig,
  FormatConfig,
} from "./utils/BaseConnection.js";
import { uploadFile, type UploadFileResult } from "./utils/uploadFile.js";
import type { Conversation } from "./index.js";
import type {
  AgentAudioEvent,
  AgentChatResponsePartEvent,
  AgentReasoningResponsePartEvent,
  AgentResponseEvent,
  AgentResponseCorrectionEvent,
  AgentTypingEvent,
  ClientToolCallEvent,
  ContextUsageEvent,
  ExternalAgentConnectedEvent,
  ExternalAgentDisconnectedEvent,
  IncomingSocketEvent,
  InternalTentativeAgentResponseEvent,
  InterruptionEvent,
  PingEvent,
  RichContentEvent,
  UserTranscriptionEvent,
  VadScoreEvent,
  MCPToolCallClientEvent,
  AgentToolResponseEvent,
  AgentToolResponseFullPayloadEvent,
  ConversationMetadataEvent,
  AsrInitiationMetadataEvent,
  MCPConnectionStatusEvent,
  ErrorMessageEvent,
  AgentToolRequestEvent,
  GuardrailTriggeredEvent,
} from "./utils/events.js";
import type { InputConfig } from "./InputController.js";
import type { OutputConfig } from "./OutputController.js";

const END_CALL_DETAILS: DisconnectionDetails = {
  reason: "agent",
  context: { type: "end_call", reason: "Agent ended the call" },
};

export type {
  Role,
  Mode,
  Status,
  Callbacks,
  MCPToolApprovalRequest,
  MCPToolApprovalRequestContext,
  MCPToolApprovalHandler,
  MCPToolApprovalConfig,
} from "./types.js";
export { CALLBACK_KEYS } from "./types.js";
export type { UploadFileResult } from "./utils/uploadFile.js";

/** Allows self-hosting the worklets to avoid whitelisting blob: and data: in the CSP script-src  */
export type AudioWorkletConfig = {
  workletPaths?: {
    rawAudioProcessor?: string;
    audioConcatProcessor?: string;
  };
  libsampleratePath?: string;
};

export type ConversationCreatedCallback = (conversation: Conversation) => void;

export type ConversationLifecycleOptions = {
  onConversationCreated?: ConversationCreatedCallback;
};

export type ContextualUpdateOptions = {
  contextId?: string;
};

/**
 * Attribution for a user message that came from a rich-content button tap.
 * Best-effort: a server that ignores it loses nothing but the reporting, and
 * the message text alone is what the agent acts on.
 */
export type SendUserMessageOptions = {
  /** The rich-content row the tapped button belonged to. */
  richContentId?: string;
};

export type Options = SessionConfig &
  Callbacks &
  ConversationLifecycleOptions &
  ClientToolsConfig &
  MCPToolApprovalConfig &
  InputConfig &
  OutputConfig &
  AudioWorkletConfig;

export type PartialOptions = SessionConfig &
  Partial<Callbacks> &
  ConversationLifecycleOptions &
  Partial<ClientToolsConfig> &
  Partial<MCPToolApprovalConfig> &
  Partial<InputConfig> &
  Partial<OutputConfig> &
  Partial<FormatConfig> &
  Partial<AudioWorkletConfig>;

export type MultimodalMessageInput = {
  text?: string;
  fileId?: string;
};

/**
 * State of one MCP tool call that was handed to `onMCPToolApprovalRequest`.
 *
 * - `pending` — the handler is running and its decision is still wanted.
 * - `settled` — a decision has been sent; nothing more may be sent for this id.
 * - `stale` — the call left `awaiting_approval`, or the session ended, before
 *   the handler resolved; a late decision must be dropped rather than sent.
 */
type MCPApproval = {
  state: "pending" | "settled" | "stale";
  controller: AbortController;
};

export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: any
    ) => Promise<string | number | void> | string | number | void
  >;
};

export function isTextOnly(options: PartialOptions): boolean | undefined {
  const { textOnly: textOnlyOverride } = options.overrides?.conversation ?? {};
  const { textOnly } = options;
  if (typeof textOnly === "boolean") {
    if (
      typeof textOnlyOverride === "boolean" &&
      textOnly !== textOnlyOverride
    ) {
      console.warn(
        `Conflicting textOnly options provided: ${textOnly} via options.textOnly (will be used) and ${textOnlyOverride} via options.overrides.conversation.textOnly (will be ignored)`
      );
    }
    return textOnly;
  } else if (typeof textOnlyOverride === "boolean") {
    return textOnlyOverride;
  } else {
    return undefined;
  }
}

export abstract class BaseConversation {
  protected lastInterruptTimestamp = 0;
  protected mode: Mode = "listening";
  protected status: Status = "connecting";
  protected volume = 1;
  protected currentEventId = 1;
  protected canSendFeedback = false;
  /**
   * Every MCP tool call this conversation has dispatched to
   * `onMCPToolApprovalRequest`, keyed by `tool_call_id`. Entries are kept for
   * the lifetime of the conversation on purpose: dropping a settled entry
   * would let a repeated `awaiting_approval` event run the handler a second
   * time and put a second, possibly contradictory, result on the wire.
   */
  private readonly mcpApprovals = new Map<string, MCPApproval>();

  protected static getFullOptions(partialOptions: PartialOptions): Options {
    const textOnly = isTextOnly(partialOptions);
    return {
      clientTools: {},
      onConnect: () => {},
      onDebug: () => {},
      onDisconnect: () => {},
      onError: () => {},
      onMessage: () => {},
      onAudio: () => {},
      onModeChange: () => {},
      onStatusChange: () => {},
      onCanSendFeedbackChange: () => {},
      onInterruption: () => {},
      onAgentResponseCorrection: () => {},
      onAgentTyping: () => {},
      onExternalAgentConnected: () => {},
      onExternalAgentDisconnected: () => {},
      onPing: () => {},
      ...partialOptions,
      textOnly,
      overrides: {
        ...partialOptions.overrides,
        conversation: {
          ...partialOptions.overrides?.conversation,
          textOnly,
        },
      },
    };
  }

  protected constructor(
    protected readonly options: Options,
    protected readonly connection: BaseConnection
  ) {
    this.connection.onMessage(this.onMessage);
    this.connection.onDisconnect(this.endSessionWithDetails);
    this.connection.onModeChange(mode => this.updateMode(mode));
    this.connection.onOutgoingMessage(this.onOutgoingMessage);
  }

  protected markConnected() {
    this.updateStatus("connected");
  }

  public endSession() {
    return this.endSessionWithDetails({ reason: "user" });
  }

  private endSessionWithDetails = async (details: DisconnectionDetails) => {
    if (this.status !== "connected" && this.status !== "connecting") return;
    this.updateStatus("disconnecting");
    // Nothing can be answered once the socket is going away, and a handler
    // still waiting on a person very likely outlives the session.
    for (const toolCallId of this.mcpApprovals.keys()) {
      this.markMCPApprovalStale(toolCallId);
    }
    try {
      await this.handleEndSession();
    } finally {
      // Always reach "disconnected" and notify onDisconnect, even if
      // teardown throws — otherwise callers relying on onDisconnect to
      // release their reference to this conversation get stuck forever.
      this.updateStatus("disconnected");
      if (this.options.onDisconnect) {
        this.options.onDisconnect(details);
      }
    }
  };

  protected async handleEndSession() {
    this.connection.close();
  }

  protected updateMode(mode: Mode) {
    if (mode !== this.mode) {
      this.mode = mode;
      if (this.options.onModeChange) {
        this.options.onModeChange({ mode });
      }
    }
  }

  protected updateStatus(status: Status) {
    if (status !== this.status) {
      this.status = status;
      if (this.options.onStatusChange) {
        this.options.onStatusChange({ status });
      }
      this.updateCanSendFeedback();
    }
  }

  protected updateCanSendFeedback() {
    const canSendFeedback = this.status === "connected";
    if (this.canSendFeedback !== canSendFeedback) {
      this.canSendFeedback = canSendFeedback;
      if (this.options.onCanSendFeedbackChange) {
        this.options.onCanSendFeedbackChange({ canSendFeedback });
      }
    }
  }

  protected handleInterruption(event: InterruptionEvent) {
    if (event.interruption_event) {
      this.lastInterruptTimestamp = event.interruption_event.event_id;

      if (this.options.onInterruption) {
        this.options.onInterruption({
          event_id: event.interruption_event.event_id,
        });
      }
    }
  }

  protected handleAgentResponse(event: AgentResponseEvent) {
    this.currentEventId = event.agent_response_event.event_id;
    if (this.options.onMessage) {
      this.options.onMessage({
        source: "ai",
        role: "agent",
        message: event.agent_response_event.agent_response,
        event_id: event.agent_response_event.event_id,
      });
    }
  }

  protected handleAgentResponseCorrection(event: AgentResponseCorrectionEvent) {
    if (this.options.onAgentResponseCorrection) {
      this.options.onAgentResponseCorrection(
        event.agent_response_correction_event
      );
    }
  }

  protected handleUserTranscript(event: UserTranscriptionEvent) {
    if (this.options.onMessage) {
      this.options.onMessage({
        source: "user",
        role: "user",
        message: event.user_transcription_event.user_transcript,
        event_id: event.user_transcription_event.event_id,
      });
    }
  }

  protected handleTentativeAgentResponse(
    event: InternalTentativeAgentResponseEvent
  ) {
    if (this.options.onDebug) {
      this.options.onDebug({
        type: "tentative_agent_response",
        response:
          event.tentative_agent_response_internal_event
            .tentative_agent_response,
      });
    }
  }

  protected handleVadScore(event: VadScoreEvent) {
    if (this.options.onVadScore) {
      this.options.onVadScore({
        vadScore: event.vad_score_event.vad_score,
      });
    }
  }

  protected handlePing(event: PingEvent) {
    if (this.options.onPing) {
      this.options.onPing(event.ping_event);
    }
  }

  protected handleContextUsage(event: ContextUsageEvent) {
    if (this.options.onContextUsage) {
      this.options.onContextUsage(event.context_usage_event);
    }
  }

  protected async handleClientToolCall(event: ClientToolCallEvent) {
    if (
      Object.prototype.hasOwnProperty.call(
        this.options.clientTools,
        event.client_tool_call.tool_name
      )
    ) {
      try {
        const result =
          (await this.options.clientTools[event.client_tool_call.tool_name](
            event.client_tool_call.parameters
          )) ?? "Client tool execution successful."; // default client-tool call response

        // The API expects result to be a string, so we need to convert it if it's not already a string
        const formattedResult =
          typeof result === "object" ? JSON.stringify(result) : String(result);

        this.connection.sendMessage({
          type: "client_tool_result",
          tool_call_id: event.client_tool_call.tool_call_id,
          result: formattedResult,
          is_error: false,
        });
      } catch (e) {
        this.onError(
          `Client tool execution failed with following error: ${(e as Error)?.message}`,
          {
            clientToolName: event.client_tool_call.tool_name,
          }
        );
        this.connection.sendMessage({
          type: "client_tool_result",
          tool_call_id: event.client_tool_call.tool_call_id,
          result: `Client tool execution failed: ${(e as Error)?.message}`,
          is_error: true,
        });
      }
    } else {
      if (this.options.onUnhandledClientToolCall) {
        this.options.onUnhandledClientToolCall(event.client_tool_call);

        return;
      }

      this.onError(
        `Client tool with name ${event.client_tool_call.tool_name} is not defined on client`,
        {
          clientToolName: event.client_tool_call.tool_name,
        }
      );
      this.connection.sendMessage({
        type: "client_tool_result",
        tool_call_id: event.client_tool_call.tool_call_id,
        result: `Client tool with name ${event.client_tool_call.tool_name} is not defined on client`,
        is_error: true,
      });
    }
  }

  protected handleAudio(event: AgentAudioEvent) {}

  protected async handleMCPToolCall(event: MCPToolCallClientEvent) {
    const toolCall = event.mcp_tool_call;

    if (this.options.onMCPToolCall) {
      this.options.onMCPToolCall(toolCall);
    }

    if (toolCall.state !== "awaiting_approval") {
      // The server has moved this call on — it ran, failed, or its approval
      // window elapsed — so a decision still in flight can no longer apply.
      this.markMCPApprovalStale(toolCall.tool_call_id);
      return;
    }

    const handler = this.options.onMCPToolApprovalRequest;
    if (!handler) return;

    if (this.status === "disconnecting" || this.status === "disconnected") {
      // Teardown has begun, so a decision could never be sent. Dispatching
      // would put approval UI on screen for a conversation that is already
      // gone. Mirrors the status guard in `endSessionWithDetails`.
      this.onError(
        `Ignored an approval request for MCP tool call ${toolCall.tool_call_id}, which arrived after the session ended`,
        this.mcpApprovalErrorContext(toolCall)
      );
      return;
    }

    if (this.mcpApprovals.has(toolCall.tool_call_id)) {
      // Asking again for an id already in the ledger would either race a
      // pending decision or contradict one already sent.
      this.onError(
        `Ignored a repeated approval request for MCP tool call ${toolCall.tool_call_id}, which has already been handled`,
        this.mcpApprovalErrorContext(toolCall)
      );
      return;
    }

    const approval: MCPApproval = {
      state: "pending",
      controller: new AbortController(),
    };
    this.mcpApprovals.set(toolCall.tool_call_id, approval);

    let isApproved: unknown;
    try {
      isApproved = await handler(toolCall, {
        signal: approval.controller.signal,
      });
    } catch (e) {
      this.onError(
        `MCP tool approval handler failed: ${(e as Error)?.message}`,
        this.mcpApprovalErrorContext(toolCall)
      );
      this.settleMCPApproval(toolCall, false);
      return;
    }

    if (typeof isApproved !== "boolean") {
      // Fail closed: only an explicit `true` may let a tool call through.
      this.onError(
        `MCP tool approval handler must resolve to a boolean, received ${typeof isApproved}`,
        this.mcpApprovalErrorContext(toolCall)
      );
      this.settleMCPApproval(toolCall, false);
      return;
    }

    this.settleMCPApproval(toolCall, isApproved);
  }

  /**
   * Sends the one approval result this `tool_call_id` is allowed, or drops a
   * decision that arrived too late to mean anything.
   */
  private settleMCPApproval(
    toolCall: MCPToolApprovalRequest,
    isApproved: boolean
  ) {
    const approval = this.mcpApprovals.get(toolCall.tool_call_id);
    if (!approval || approval.state !== "pending") {
      this.onError(
        `Discarded an approval decision for MCP tool call ${toolCall.tool_call_id}, which is no longer awaiting approval`,
        this.mcpApprovalErrorContext(toolCall)
      );
      return;
    }
    approval.state = "settled";
    this.sendMCPToolApprovalResult(toolCall.tool_call_id, isApproved);
  }

  private markMCPApprovalStale(toolCallId: string) {
    const approval = this.mcpApprovals.get(toolCallId);
    if (!approval || approval.state !== "pending") return;
    approval.state = "stale";
    approval.controller.abort();
  }

  private mcpApprovalErrorContext(toolCall: MCPToolApprovalRequest) {
    return {
      toolCallId: toolCall.tool_call_id,
      toolName: toolCall.tool_name,
      serviceId: toolCall.service_id,
    };
  }

  protected handleMCPConnectionStatus(event: MCPConnectionStatusEvent) {
    if (this.options.onMCPConnectionStatus) {
      this.options.onMCPConnectionStatus(event.mcp_connection_status);
    }
  }

  protected handleAgentToolRequest(event: AgentToolRequestEvent) {
    if (this.options.onAgentToolRequest) {
      this.options.onAgentToolRequest(event.agent_tool_request);
    }
  }

  protected handleAgentToolResponse(event: AgentToolResponseEvent) {
    if (event.agent_tool_response.tool_name === "end_call") {
      void this.endSessionWithDetails(END_CALL_DETAILS).catch(error => {
        this.onError("Failed to end session after agent end_call", error);
      });
    }

    this.options.onAgentToolResponse?.(event.agent_tool_response);
  }

  protected handleAgentToolResponseFullPayload(
    event: AgentToolResponseFullPayloadEvent
  ) {
    if (event.agent_tool_response_full_payload.tool_name === "end_call") {
      void this.endSessionWithDetails(END_CALL_DETAILS).catch(error => {
        this.onError("Failed to end session after agent end_call", error);
      });
    }

    this.options.onAgentToolResponse?.(event.agent_tool_response_full_payload);
  }

  protected handleConversationMetadata(event: ConversationMetadataEvent) {
    if (this.options.onConversationMetadata) {
      this.options.onConversationMetadata(
        event.conversation_initiation_metadata_event
      );
    }
  }

  protected handleAsrInitiationMetadata(event: AsrInitiationMetadataEvent) {
    if (this.options.onAsrInitiationMetadata) {
      this.options.onAsrInitiationMetadata(event.asr_initiation_metadata_event);
    }
  }

  protected handleAgentChatResponsePart(event: AgentChatResponsePartEvent) {
    if (this.options.onAgentChatResponsePart) {
      this.options.onAgentChatResponsePart(event.text_response_part);
    }
  }

  protected handleAgentReasoningResponsePart(
    event: AgentReasoningResponsePartEvent
  ) {
    if (this.options.onAgentReasoningResponsePart) {
      this.options.onAgentReasoningResponsePart(event.reasoning_response_part);
    }
  }

  protected handleRichContent(event: RichContentEvent) {
    if (this.options.onRichContent) {
      this.options.onRichContent(event.rich_content);
    }
  }

  protected handleGuardrailTriggered(_event: GuardrailTriggeredEvent) {
    if (this.options.onGuardrailTriggered) {
      this.options.onGuardrailTriggered();
    }
  }

  protected handleAgentTyping(event: AgentTypingEvent) {
    if (this.options.onAgentTyping) {
      this.options.onAgentTyping(event.agent_typing_event);
    }
  }

  protected handleExternalAgentConnected(_event: ExternalAgentConnectedEvent) {
    if (this.options.onExternalAgentConnected) {
      this.options.onExternalAgentConnected();
    }
  }

  protected handleExternalAgentDisconnected(
    _event: ExternalAgentDisconnectedEvent
  ) {
    if (this.options.onExternalAgentDisconnected) {
      this.options.onExternalAgentDisconnected();
    }
  }

  protected handleErrorEvent(event: ErrorMessageEvent) {
    const errorEvent = event.error_event;
    const errorType = errorEvent?.error_type;
    const message =
      errorEvent?.message || errorEvent?.reason || "Unknown error";

    if (errorType === "max_duration_exceeded") {
      void this.endSessionWithDetails({
        reason: "error",
        message: message,
        context: { type: "max_duration_exceeded" },
      }).catch(error => {
        this.onError(
          "Failed to end session after max_duration_exceeded",
          error
        );
      });
      return;
    }

    this.onError(`Server error: ${message}`, {
      errorType,
      code: errorEvent?.code,
      debugMessage: errorEvent?.debug_message,
      details: errorEvent?.details,
    });
  }

  private onMessage = async (parsedEvent: IncomingSocketEvent) => {
    this.options.onIncomingEvent?.(parsedEvent);

    switch (parsedEvent.type) {
      case "interruption": {
        this.handleInterruption(parsedEvent);
        return;
      }
      case "agent_response": {
        this.handleAgentResponse(parsedEvent);
        return;
      }
      case "agent_response_correction": {
        this.handleAgentResponseCorrection(parsedEvent);
        return;
      }
      case "user_transcript": {
        this.handleUserTranscript(parsedEvent);
        return;
      }
      case "internal_tentative_agent_response": {
        this.handleTentativeAgentResponse(parsedEvent);
        return;
      }
      case "client_tool_call": {
        try {
          await this.handleClientToolCall(parsedEvent);
        } catch (error) {
          this.onError(
            `Unexpected error in client tool call handling: ${error instanceof Error ? error.message : String(error)}`,
            {
              clientToolName: parsedEvent.client_tool_call.tool_name,
              toolCallId: parsedEvent.client_tool_call.tool_call_id,
            }
          );
        }
        return;
      }
      case "audio": {
        this.handleAudio(parsedEvent);
        return;
      }

      case "vad_score": {
        this.handleVadScore(parsedEvent);
        return;
      }

      case "ping": {
        this.connection.sendMessage({
          type: "pong",
          event_id: parsedEvent.ping_event.event_id,
        });
        // Surface the ping event (including the estimated `ping_ms`) so
        // consumers can, for example, warn when latency is high enough to
        // degrade the experience.
        this.handlePing(parsedEvent);
        return;
      }

      case "context_usage": {
        this.handleContextUsage(parsedEvent);
        return;
      }

      case "mcp_tool_call": {
        try {
          await this.handleMCPToolCall(parsedEvent);
        } catch (error) {
          this.onError(
            `Unexpected error in MCP tool call handling: ${error instanceof Error ? error.message : String(error)}`,
            {
              toolCallId: parsedEvent.mcp_tool_call.tool_call_id,
              toolName: parsedEvent.mcp_tool_call.tool_name,
            }
          );
        }
        return;
      }

      case "mcp_connection_status": {
        this.handleMCPConnectionStatus(parsedEvent);
        return;
      }

      case "agent_tool_request": {
        this.handleAgentToolRequest(parsedEvent);
        return;
      }

      case "agent_tool_response": {
        this.handleAgentToolResponse(parsedEvent);
        return;
      }

      case "agent_tool_response_full_payload": {
        this.handleAgentToolResponseFullPayload(parsedEvent);
        return;
      }

      case "conversation_initiation_metadata": {
        this.handleConversationMetadata(parsedEvent);
        return;
      }

      case "asr_initiation_metadata": {
        this.handleAsrInitiationMetadata(parsedEvent);
        return;
      }

      case "agent_chat_response_part": {
        this.handleAgentChatResponsePart(parsedEvent);
        return;
      }

      case "agent_reasoning_response_part": {
        this.handleAgentReasoningResponsePart(parsedEvent);
        return;
      }

      case "rich_content": {
        this.handleRichContent(parsedEvent);
        return;
      }

      case "guardrail_triggered": {
        this.handleGuardrailTriggered(parsedEvent);
        return;
      }

      case "error": {
        this.handleErrorEvent(parsedEvent);
        return;
      }

      case "agent_typing": {
        this.handleAgentTyping(parsedEvent);
        return;
      }

      case "external_agent_connected": {
        this.handleExternalAgentConnected(parsedEvent);
        return;
      }

      case "external_agent_disconnected": {
        this.handleExternalAgentDisconnected(parsedEvent);
        return;
      }

      default: {
        if (this.options.onDebug) {
          this.options.onDebug(parsedEvent);
        }
        return;
      }
    }
  };

  private onError(message: string, context?: any) {
    console.error(message, context);
    if (this.options.onError) {
      this.options.onError(message, context);
    }
  }

  private onOutgoingMessage = (event: any) => {
    this.options.onOutgoingEvent?.(event);
  };

  public getId() {
    return this.connection.conversationId;
  }

  public isOpen() {
    return this.status === "connected";
  }

  public abstract setVolume(options: { volume: number }): void;
  public abstract setMicMuted(isMuted: boolean): void;
  /**
   * Returns byte frequency data (0-255) for the input audio, focused on the
   * human voice range (100-8000 Hz).
   */
  public abstract getInputByteFrequencyData(): Uint8Array;
  /**
   * Returns byte frequency data (0-255) for the output audio, focused on the
   * human voice range (100-8000 Hz).
   */
  public abstract getOutputByteFrequencyData(): Uint8Array;
  public abstract getInputVolume(): number;
  public abstract getOutputVolume(): number;

  public sendFeedback(like: boolean | null, eventId?: number) {
    if (!this.canSendFeedback) {
      console.warn("Cannot send feedback: the conversation is not connected.");
      return;
    }

    this.connection.sendMessage({
      type: "feedback",
      score: like !== null ? (like ? "like" : "dislike") : null,
      event_id: eventId ?? this.currentEventId,
    });
  }

  public sendContextualUpdate(text: string, options?: ContextualUpdateOptions) {
    this.connection.sendMessage({
      type: "contextual_update",
      text,
      ...(options?.contextId ? { context_id: options.contextId } : {}),
    });
  }

  public sendUserMessage(text: string, options?: SendUserMessageOptions) {
    this.connection.sendMessage({
      type: "user_message",
      text,
      rich_content_id: options?.richContentId ?? undefined,
    });
  }

  public sendUserActivity() {
    this.connection.sendMessage({
      type: "user_activity",
    });
  }

  public sendMCPToolApprovalResult(toolCallId: string, isApproved: boolean) {
    this.connection.sendMessage({
      type: "mcp_tool_approval_result",
      tool_call_id: toolCallId,
      is_approved: isApproved,
    });
  }

  public sendMultimodalMessage(options: MultimodalMessageInput) {
    this.connection.sendMessage({
      type: "multimodal_message",
      text: options.text
        ? { type: "user_message" as const, text: options.text }
        : undefined,
      file: options.fileId
        ? { type: "file_input" as const, file_id: options.fileId }
        : undefined,
    });
  }

  public async uploadFile(file: Blob): Promise<UploadFileResult> {
    if (this.options.orchestrator) {
      // Without this guard the file body would leave the customer network for the ElevenLabs cloud.
      throw new Error(
        "uploadFile is not supported for self-hosted orchestrator sessions."
      );
    }
    return uploadFile({
      conversationId: this.connection.conversationId,
      origin: this.options.origin,
      file,
    });
  }
}
