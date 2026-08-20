import type {
  AgentChatResponsePartClientEvent,
  AgentReasoningResponsePartClientEvent,
  AgentResponse,
  AgentResponseCorrection,
  AgentToolResponseClientEvent,
  AgentToolResponseFullPayloadClientEvent,
  AgentTypingClientEvent,
  AsrInitiationMetadataEvent as AsrMetadataEvent,
  Audio,
  AgentToolRequestClientEvent,
  ClientToolCallMessage,
  ContextUsageClientEvent,
  ConversationMetadata,
  ErrorMessage,
  ExternalAgentConnectedClientEvent,
  ExternalAgentDisconnectedClientEvent,
  GuardrailTriggered,
  Interruption,
  McpConnectionStatusClientEvent,
  McpToolCall,
  Outgoing,
  Ping,
  InternalTentativeAgentResponse as TentativeAgentResponseInternal,
  UserTranscript,
  VadScore,
  RichContentClientEvent,
} from "@elevenlabs/types";
import type { AudioAlignmentEvent } from "../types.js";

// Compatibility layer - incoming events
export type UserTranscriptionEvent = UserTranscript;
export type AgentResponseEvent = AgentResponse;
export type AgentAudioEvent = Audio;
export type InterruptionEvent = Interruption;
export type InternalTentativeAgentResponseEvent =
  TentativeAgentResponseInternal;
export type ConfigEvent = ConversationMetadata;
export type PingEvent = Ping;
export type ContextUsageEvent = ContextUsageClientEvent;
export type ClientToolCallEvent = ClientToolCallMessage;
export type VadScoreEvent = VadScore;
export type MCPToolCallClientEvent = McpToolCall;
export type AgentResponseCorrectionEvent = AgentResponseCorrection;
export type AgentToolRequestEvent = AgentToolRequestClientEvent;
export type AgentToolResponseEvent = AgentToolResponseClientEvent;
export type AgentToolResponseFullPayloadEvent =
  AgentToolResponseFullPayloadClientEvent;
export type ConversationMetadataEvent = ConversationMetadata;
export type AsrInitiationMetadataEvent = AsrMetadataEvent;
export type MCPConnectionStatusEvent = McpConnectionStatusClientEvent;
export type AgentChatResponsePartEvent = AgentChatResponsePartClientEvent;
export type AgentReasoningResponsePartEvent =
  AgentReasoningResponsePartClientEvent;
export type RichContentEvent = RichContentClientEvent;
export type ErrorMessageEvent = ErrorMessage;
export type GuardrailTriggeredEvent = GuardrailTriggered;
export type AgentTypingEvent = AgentTypingClientEvent;
export type ExternalAgentConnectedEvent = ExternalAgentConnectedClientEvent;
export type ExternalAgentDisconnectedEvent =
  ExternalAgentDisconnectedClientEvent;
export type { AudioAlignmentEvent };

export type IncomingSocketEvent =
  | UserTranscriptionEvent
  | AgentResponseEvent
  | AgentResponseCorrectionEvent
  | AgentAudioEvent
  | InterruptionEvent
  | InternalTentativeAgentResponseEvent
  | ConfigEvent
  | PingEvent
  | ContextUsageEvent
  | ClientToolCallEvent
  | VadScoreEvent
  | MCPToolCallClientEvent
  | AgentToolRequestEvent
  | AgentToolResponseEvent
  | AgentToolResponseFullPayloadEvent
  | ConversationMetadataEvent
  | AsrInitiationMetadataEvent
  | MCPConnectionStatusEvent
  | AgentChatResponsePartEvent
  | AgentReasoningResponsePartEvent
  | RichContentEvent
  | ErrorMessageEvent
  | GuardrailTriggeredEvent
  | AgentTypingEvent
  | ExternalAgentConnectedEvent
  | ExternalAgentDisconnectedEvent;

// Compatibility layer - outgoing events
export type PongEvent = Outgoing.PongClientToOrchestratorEvent;
export type UserAudioEvent = Outgoing.UserAudio;
export type UserFeedbackEvent = Outgoing.UserFeedbackClientToOrchestratorEvent;
export type ClientToolResultEvent =
  Outgoing.ClientToolResultClientToOrchestratorEvent;
export type InitiationClientDataEvent =
  Outgoing.ConversationInitiationClientToOrchestratorEvent;
export type ContextualUpdateEvent =
  Outgoing.ContextualUpdateClientToOrchestratorEvent;
export type UserMessageEvent = Outgoing.UserMessageClientToOrchestratorEvent;
export type UserActivityEvent = Outgoing.UserActivityClientToOrchestratorEvent;
export type MCPToolApprovalResultEvent =
  Outgoing.McpToolApprovalResultClientToOrchestratorEvent;
export type MultimodalMessageEvent =
  Outgoing.MultimodalMessageClientToOrchestratorEvent;

export type OutgoingSocketEvent =
  | PongEvent
  | UserAudioEvent
  | InitiationClientDataEvent
  | UserFeedbackEvent
  | ClientToolResultEvent
  | ContextualUpdateEvent
  | UserMessageEvent
  | UserActivityEvent
  | MCPToolApprovalResultEvent
  | MultimodalMessageEvent;

export function isValidSocketEvent(event: any): event is IncomingSocketEvent {
  return !!event.type;
}
