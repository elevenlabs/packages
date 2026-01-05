import { Callbacks, Mode, Status } from "@elevenlabs/types";
import type {
  BaseConnection,
  DisconnectionDetails,
  SessionConfig,
  FormatConfig,
} from "./utils/BaseConnection";
import type {
  AgentAudioEvent,
  AgentChatResponsePartEvent,
  AgentResponseEvent,
  ClientToolCallEvent,
  IncomingSocketEvent,
  InternalTentativeAgentResponseEvent,
  InterruptionEvent,
  UserTranscriptionEvent,
  VadScoreEvent,
  MCPToolCallClientEvent,
  AgentToolResponseEvent,
  ConversationMetadataEvent,
  AsrInitiationMetadataEvent,
  MCPConnectionStatusEvent,
  ErrorMessageEvent,
  AgentToolRequestEvent,
  ConversationModeChangeEvent,
} from "./utils/events";
import type { InputConfig } from "./utils/input";
import type { OutputConfig } from "./utils/output";

export type { Role, Mode, Status, Callbacks } from "@elevenlabs/types";

/** Allows self-hosting the worklets to avoid whitelisting blob: and data: in the CSP script-src  */
export type AudioWorkletConfig = {
  workletPaths?: {
    rawAudioProcessor?: string;
    audioConcatProcessor?: string;
  };
  libsampleratePath?: string;
};

export type Options = SessionConfig &
  Callbacks &
  ClientToolsConfig &
  InputConfig &
  OutputConfig &
  AudioWorkletConfig;

export type PartialOptions = SessionConfig &
  Partial<Callbacks> &
  Partial<ClientToolsConfig> &
  Partial<InputConfig> &
  Partial<OutputConfig> &
  Partial<FormatConfig> &
  Partial<AudioWorkletConfig>;

export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: any
    ) => Promise<string | number | void> | string | number | void
  >;
};

const EMPTY_FREQUENCY_DATA = new Uint8Array(0);

export class BaseConversation {
  protected lastInterruptTimestamp = 0;
  protected mode: Mode = "listening";
  protected status: Status = "connecting";
  protected volume = 1;
  protected currentEventId = 1;
  protected lastFeedbackEventId = 0;
  protected canSendFeedback = false;

  protected static getFullOptions(partialOptions: PartialOptions): Options {
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
      ...partialOptions,
    };
  }

  protected constructor(
    protected readonly options: Options,
    protected readonly connection: BaseConnection
  ) {
    if (this.options.onConnect) {
      this.options.onConnect({ conversationId: connection.conversationId });
    }
    this.connection.onMessage(this.onMessage);
    this.connection.onDisconnect(this.endSessionWithDetails);
    this.connection.onModeChange(mode => this.updateMode(mode));
    this.updateStatus("connected");
  }

  public endSession() {
    return this.endSessionWithDetails({ reason: "user" });
  }

  private endSessionWithDetails = async (details: DisconnectionDetails) => {
    if (this.status !== "connected" && this.status !== "connecting") return;
    this.updateStatus("disconnecting");
    await this.handleEndSession();
    this.updateStatus("disconnected");
    if (this.options.onDisconnect) {
      this.options.onDisconnect(details);
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
    }
  }

  protected updateCanSendFeedback() {
    const canSendFeedback = this.currentEventId !== this.lastFeedbackEventId;
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
    if (this.options.onMessage) {
      this.options.onMessage({
        source: "ai",
        role: "agent",
        message: event.agent_response_event.agent_response,
      });
    }
  }

  protected handleUserTranscript(event: UserTranscriptionEvent) {
    if (this.options.onMessage) {
      this.options.onMessage({
        source: "user",
        role: "user",
        message: event.user_transcription_event.user_transcript,
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

  protected handleMCPToolCall(event: MCPToolCallClientEvent) {
    if (this.options.onMCPToolCall) {
      this.options.onMCPToolCall(event.mcp_tool_call);
    }
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
      this.endSessionWithDetails({
        reason: "agent",
        context: new CloseEvent("end_call", { reason: "Agent ended the call" }),
      });
    }

    if (this.options.onAgentToolResponse) {
      this.options.onAgentToolResponse(event.agent_tool_response);
    }
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

  protected handleErrorEvent(event: ErrorMessageEvent) {
    const errorType = event.error_event.error_type;
    const message =
      event.error_event.message || event.error_event.reason || "Unknown error";

    if (errorType === "max_duration_exceeded") {
      this.endSessionWithDetails({
        reason: "error",
        message: message,
        context: new Event("max_duration_exceeded"),
      });
      return;
    }

    this.onError(`Server error: ${message}`, {
      errorType,
      code: event.error_event.code,
      debugMessage: event.error_event.debug_message,
      details: event.error_event.details,
    });
  }

  protected handleConversationModeChange(event: ConversationModeChangeEvent) {
    if (this.options.onConversationModeChange) {
      this.options.onConversationModeChange(
        event.conversation_mode_change_event
      );
    }
  }

  private onMessage = async (parsedEvent: IncomingSocketEvent) => {
    switch (parsedEvent.type) {
      case "interruption": {
        this.handleInterruption(parsedEvent);
        return;
      }
      case "agent_response": {
        this.handleAgentResponse(parsedEvent);
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
        // parsedEvent.ping_event.ping_ms can be used on client side, for example
        // to warn if ping is too high that experience might be degraded.
        return;
      }

      case "mcp_tool_call": {
        this.handleMCPToolCall(parsedEvent);
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

      case "error": {
        this.handleErrorEvent(parsedEvent);
        return;
      }

      case "conversation_mode_change": {
        this.handleConversationModeChange(parsedEvent);
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

  public getId() {
    return this.connection.conversationId;
  }

  public isOpen() {
    return this.status === "connected";
  }

  public setVolume = ({ volume }: { volume: number }) => {
    this.volume = volume;
  };

  public setMicMuted(isMuted: boolean) {
    this.connection.setMicMuted(isMuted);
  }

  public getInputByteFrequencyData(): Uint8Array {
    return EMPTY_FREQUENCY_DATA;
  }

  public getOutputByteFrequencyData(): Uint8Array {
    return EMPTY_FREQUENCY_DATA;
  }

  public getInputVolume() {
    return 0;
  }

  public getOutputVolume() {
    return 0;
  }

  public sendFeedback(like: boolean) {
    if (!this.canSendFeedback) {
      console.warn(
        this.lastFeedbackEventId === 0
          ? "Cannot send feedback: the conversation has not started yet."
          : "Cannot send feedback: feedback has already been sent for the current response."
      );
      return;
    }

    this.connection.sendMessage({
      type: "feedback",
      score: like ? "like" : "dislike",
      event_id: this.currentEventId,
    });
    this.lastFeedbackEventId = this.currentEventId;
    this.updateCanSendFeedback();
  }

  public sendContextualUpdate(text: string) {
    this.connection.sendMessage({
      type: "contextual_update",
      text,
    });
  }

  public sendUserMessage(text: string) {
    this.connection.sendMessage({
      type: "user_message",
      text,
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

  public setTextOnlyMode(textOnly: boolean): void {
    if (!this.isOpen()) {
      console.warn("Cannot change mode: conversation is not active");
      return;
    }

    this.connection.sendMessage({
      type: "conversation_config_update",
      conversation_config_override: {
        conversation: {
          text_only: textOnly,
        },
      },
    });
  }
}
