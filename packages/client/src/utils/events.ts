import { Outgoing } from "@elevenlabs/types";
import {
  AgentChatResponsePartClientEvent,
  AgentResponse,
  AgentResponseCorrection,
  AgentToolResponseClientEvent,
  AsrInitiationMetadataEvent as AsrMetadataEvent,
  Audio,
  AudioEventAlignment,
  AgentToolRequestClientEvent,
  ClientToolCallMessage,
  ConversationMetadata,
  ErrorMessage,
  Interruption,
  McpConnectionStatusClientEvent,
  McpToolCall,
  Ping,
  InternalTentativeAgentResponse as TentativeAgentResponseInternal,
  UserTranscript,
  VadScore,
} from "@elevenlabs/types/generated/types/asyncapi-types";

// Compatibility layer - incoming events
export type UserTranscriptionEvent = UserTranscript;
export type AgentResponseEvent = AgentResponse;
export type AgentAudioEvent = Audio;
export type InterruptionEvent = Interruption;
export type InternalTentativeAgentResponseEvent =
  TentativeAgentResponseInternal;
export type ConfigEvent = ConversationMetadata;
export type PingEvent = Ping;
export type ClientToolCallEvent = ClientToolCallMessage;
export type VadScoreEvent = VadScore;
export type MCPToolCallClientEvent = McpToolCall;
export type AgentResponseCorrectionEvent = AgentResponseCorrection;
export type AgentToolRequestEvent = AgentToolRequestClientEvent;
export type AgentToolResponseEvent = AgentToolResponseClientEvent;
export type ConversationMetadataEvent = ConversationMetadata;
export type AsrInitiationMetadataEvent = AsrMetadataEvent;
export type MCPConnectionStatusEvent = McpConnectionStatusClientEvent;
export type AgentChatResponsePartEvent = AgentChatResponsePartClientEvent;
export type ErrorMessageEvent = ErrorMessage;
export type AudioAlignmentEvent = AudioEventAlignment;

export type IncomingSocketEvent =
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
  | AgentToolRequestEvent
  | AgentToolResponseEvent
  | ConversationMetadataEvent
  | AsrInitiationMetadataEvent
  | MCPConnectionStatusEvent
  | AgentChatResponsePartEvent
  | ErrorMessageEvent;

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

export type OutgoingSocketEvent =
  | PongEvent
  | UserAudioEvent
  | InitiationClientDataEvent
  | UserFeedbackEvent
  | ClientToolResultEvent
  | ContextualUpdateEvent
  | UserMessageEvent
  | UserActivityEvent
  | MCPToolApprovalResultEvent;

export function isValidSocketEvent(event: any): event is IncomingSocketEvent {
  return !!event.type;
}
