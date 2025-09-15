import type * as Types from "@elevenlabs/types";
import type {
  Incoming,
  Outgoing,
  Interruption,
  ConversationMetadata,
  Ping,
  Role as MessageRole,
  Mode as ConversationMode,
  Status,
  Callbacks,
} from "@elevenlabs/types";
export type { Callbacks } from "@elevenlabs/types";

/**
 * Role in the conversation
 */
export type Role = MessageRole;

/**
 * Current mode of the conversation
 */
export type Mode = ConversationMode;

export type ConversationStatus = Status;

/**
 * Language support
 */
export type Language = Types.ConversationConfigOverrideAgentLanguage;

/**
 * Client tools configuration
 */
export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: unknown
    ) => Promise<string | number | undefined> | string | number | undefined
  >;
};

/**
 * Options for useConversation hook
 */
export type ConversationOptions = {
  serverUrl?: string;
  tokenFetchUrl?: string;
  clientTools?: Record<
    string,
    (
      parameters: unknown
    ) => Promise<string | number | undefined> | string | number | undefined
  >;
} & Partial<Callbacks>;

// /**
//  * Callbacks configuration
//  */
// export type Callbacks = {
//   onConnect?: (props: { conversationId: string }) => void;
//   // internal debug events, not to be used
//   onDebug?: (props: unknown) => void;
//   onDisconnect?: (details: string) => void;
//   onError?: (message: string, context?: Record<string, unknown>) => void;
//   onMessage?: (props: { message: ConversationEvent; source: Role }) => void;
//   onModeChange?: (prop: { mode: Mode }) => void;
//   onStatusChange?: (prop: { status: ConversationStatus }) => void;
//   onCanSendFeedbackChange?: (prop: { canSendFeedback: boolean }) => void;
//   onUnhandledClientToolCall?: (params: ClientToolCallEvent) => void;
//   onVadScore?: (props: { vadScore: number }) => void;
//   onInterruption?: (props: InterruptionEvent) => void;
//   onAgentToolResponse?: (
//     props: Types.Incoming.AgentToolResponseClientEvent
//   ) => void;
//   onConversationMetadata?: (props: ConversationMetadata) => void;
//   onMCPToolCall?: (props: MCPToolCallClientEvent) => void;
//   onMCPConnectionStatus?: (
//     props: Types.Incoming.McpConnectionStatusClientEvent
//   ) => void;
//   onAsrInitiationMetadata?: (
//     props: Types.Incoming.AsrInitiationMetadataEvent
//   ) => void;
// };

export type ConversationConfig = {
  agentId?: string;
  conversationToken?: string;
  tokenFetchUrl?: string;
  overrides?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      firstMessage?: string;
      language?: Language;
    };
    tts?: {
      voiceId?: string;
    };
    conversation?: {
      textOnly?: boolean;
    };
    client?: {
      source?: string;
      version?: string;
    };
  };
  customLlmExtraBody?: unknown;
  dynamicVariables?: Record<string, string | number | boolean>;
  userId?: string;
};

// Incoming event types
export type UserTranscriptionEvent = Incoming.UserTranscriptionClientEvent;
export type AgentResponseEvent = Incoming.AgentResponseClientEvent;
export type AgentResponseCorrectionEvent =
  Incoming.AgentResponseCorrectionClientEvent;
export type AgentAudioEvent = Incoming.AudioClientEvent;
export type InterruptionEvent = Interruption;
export type InternalTentativeAgentResponseEvent =
  Incoming.TentativeAgentResponseInternalClientEvent;
export type ConfigEvent = ConversationMetadata;
export type PingEvent = Ping;
export type ClientToolCallEvent = Incoming.ClientToolCallClientEvent;
export type VadScoreEvent = Incoming.VadScoreClientEvent;
export type MCPToolCallClientEvent = Incoming.McpToolCallClientEvent;

// Outgoing event types
export type PongEvent = Outgoing.PongClientToOrchestratorEvent;
export type UserAudioEvent = Outgoing.UserAudio;
export type UserFeedbackEvent = Outgoing.UserFeedbackClientToOrchestratorEvent;
export type ClientToolResultEvent =
  Outgoing.ClientToolResultClientToOrchestratorEvent;
export type ContextualUpdateEvent =
  Outgoing.ContextualUpdateClientToOrchestratorEvent;
export type UserMessageEvent = Outgoing.UserMessageClientToOrchestratorEvent;
export type UserActivityEvent = Outgoing.UserActivityClientToOrchestratorEvent;
export type MCPToolApprovalResultEvent =
  Outgoing.McpToolApprovalResultClientToOrchestratorEvent;
export type InitiationClientDataEvent =
  Outgoing.ConversationInitiationClientToOrchestratorEvent;

export type ConversationEvent =
  | UserTranscriptionEvent
  | AgentResponseEvent
  | AgentResponseCorrectionEvent
  | AgentAudioEvent
  | InterruptionEvent
  | InternalTentativeAgentResponseEvent
  | ConfigEvent
  | PingEvent
  | ClientToolCallEvent
  | VadScoreEvent
  | MCPToolCallClientEvent;
