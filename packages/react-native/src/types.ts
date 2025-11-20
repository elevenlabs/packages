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
  AsrInitiationMetadataEvent as AsrMetadataEvent,
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
  /**
   * List of dynamic variable names that your agent's tools expect.
   * Any variables in this list that aren't provided in dynamicVariables will be
   * automatically filled with the value specified in missingDynamicVariableDefault.
   *
   * This is useful when your agent has tools that require dynamic variables,
   * but you don't always have values for all of them.
   *
   * @example
   * {
   *   expectedDynamicVariables: ['clients', 'matters', 'conversation_history'],
   *   missingDynamicVariableDefault: null,
   *   dynamicVariables: { clients: 'client data' }
   *   // Will automatically add: matters: null, conversation_history: null
   * }
   */
  expectedDynamicVariables?: string[];
  /**
   * Default value to use for missing dynamic variables when tools require them.
   * This helps avoid errors when tools expect dynamic variables that aren't provided.
   * Only used when expectedDynamicVariables is specified.
   *
   * @default null
   *
   * @example
   * // Fill missing dynamic variables with null
   * { missingDynamicVariableDefault: null }
   *
   * @example
   * // Fill missing dynamic variables with empty string
   * { missingDynamicVariableDefault: "" }
   *
   * @example
   * // Fill missing dynamic variables with a custom value
   * { missingDynamicVariableDefault: "N/A" }
   */
  missingDynamicVariableDefault?: string | number | boolean | null;
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
export type MCPConnectionStatusEvent = Incoming.McpConnectionStatusClientEvent;
export type AgentToolResponseEvent = Incoming.AgentToolResponseClientEvent;
export type ConversationMetadataEvent = ConversationMetadata;
export type AsrInitiationMetadataEvent = AsrMetadataEvent;
export type AgentChatResponsePartEvent =
  Incoming.AgentChatResponsePartClientEvent;

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
  | MCPToolCallClientEvent
  | MCPConnectionStatusEvent
  | AgentToolResponseEvent
  | ConversationMetadataEvent
  | AsrInitiationMetadataEvent
  | AgentChatResponsePartEvent;
