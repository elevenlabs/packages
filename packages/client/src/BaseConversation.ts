import type {
  BaseConnection,
  DisconnectionDetails,
  OnDisconnectCallback,
  SessionConfig,
} from "./utils/BaseConnection";
import type {
  AgentAudioEvent,
  AgentResponseEvent,
  ClientToolCallEvent,
  IncomingSocketEvent,
  InternalTentativeAgentResponseEvent,
  InterruptionEvent,
  UserTranscriptionEvent,
} from "./utils/events";
import type { InputConfig } from "./utils/input";

export type Role = "user" | "ai";

export type Mode = "speaking" | "listening";

export type Status =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected";

export type Options = SessionConfig &
  Callbacks &
  ClientToolsConfig &
  InputConfig;

export type PartialOptions = SessionConfig &
  Partial<Callbacks> &
  Partial<ClientToolsConfig> &
  Partial<InputConfig>;

export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: any
    ) => Promise<string | number | void> | string | number | void
  >;
};

export type Callbacks = {
  onConnect: (props: { conversationId: string }) => void;
  // internal debug events, not to be used
  onDebug: (props: any) => void;
  onDisconnect: OnDisconnectCallback;
  onError: (message: string, context?: any) => void;
  onMessage: (props: { message: string; source: Role }) => void;
  onAudio: (base64Audio: string) => void;
  onModeChange: (prop: { mode: Mode }) => void;
  onStatusChange: (prop: { status: Status }) => void;
  onCanSendFeedbackChange: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (
    params: ClientToolCallEvent["client_tool_call"]
  ) => void;
};

const EMPTY_FREQUENCY_DATA = new Uint8Array(0);

export class BaseConversation {
  protected lastInterruptTimestamp = 0;
  protected mode: Mode = "listening";
  protected status: Status = "connecting";
  protected volume = 1;
  protected currentEventId = 1;
  protected lastFeedbackEventId = 1;
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
      ...partialOptions,
    };
  }

  protected constructor(
    protected readonly options: Options,
    protected readonly connection: BaseConnection
  ) {
    this.options.onConnect({ conversationId: connection.conversationId });
    this.connection.onMessage(this.onMessage);
    this.connection.onDisconnect(this.endSessionWithDetails);
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
    this.options.onDisconnect(details);
  };

  protected async handleEndSession() {
    this.connection.close();
  }

  protected updateMode(mode: Mode) {
    if (mode !== this.mode) {
      this.mode = mode;
      this.options.onModeChange({ mode });
    }
  }

  protected updateStatus(status: Status) {
    if (status !== this.status) {
      this.status = status;
      this.options.onStatusChange({ status });
    }
  }

  protected updateCanSendFeedback() {
    const canSendFeedback = this.currentEventId !== this.lastFeedbackEventId;
    if (this.canSendFeedback !== canSendFeedback) {
      this.canSendFeedback = canSendFeedback;
      this.options.onCanSendFeedbackChange({ canSendFeedback });
    }
  }

  protected handleInterruption(event: InterruptionEvent) {
    if (event.interruption_event) {
      this.lastInterruptTimestamp = event.interruption_event.event_id;
    }
  }

  protected handleAgentResponse(event: AgentResponseEvent) {
    this.options.onMessage({
      source: "ai",
      message: event.agent_response_event.agent_response,
    });
  }

  protected handleUserTranscript(event: UserTranscriptionEvent) {
    this.options.onMessage({
      source: "user",
      message: event.user_transcription_event.user_transcript,
    });
  }

  protected handleTentativeAgentResponse(
    event: InternalTentativeAgentResponseEvent
  ) {
    this.options.onDebug({
      type: "tentative_agent_response",
      response:
        event.tentative_agent_response_internal_event.tentative_agent_response,
    });
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
        await this.handleClientToolCall(parsedEvent);
        return;
      }
      case "audio": {
        this.handleAudio(parsedEvent);
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

      // unhandled events are expected to be internal events
      default: {
        this.options.onDebug(parsedEvent);
        return;
      }
    }
  };

  private onError(message: string, context?: any) {
    console.error(message, context);
    this.options.onError(message, context);
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

  public setMicMuted(isMuted: boolean) {}

  public getInputByteFrequencyData() {
    return EMPTY_FREQUENCY_DATA;
  }

  public getOutputByteFrequencyData() {
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
}
