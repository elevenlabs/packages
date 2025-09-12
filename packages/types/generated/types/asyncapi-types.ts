/* Auto-generated from AsyncAPI
 * Role: client
 * DO NOT EDIT MANUALLY
 */

export interface UserAudio {
  userAudioChunk: string;
  additionalProperties?: Record<string, any>;
}

export interface Pong {
  reservedType: "pong";
  eventId: number;
  additionalProperties?: Record<string, any>;
}

export interface UserMessage {
  reservedType: "user_message";
  reservedText?: string;
  additionalProperties?: Record<string, any>;
}

export interface UserActivity {
  reservedType: "user_activity";
  additionalProperties?: Record<string, any>;
}

export interface UserFeedback {
  reservedType?: "feedback";
  eventId: number;
  score: Score;
  additionalProperties?: Record<string, any>;
}

export type Score = "like" | "dislike";

export interface ClientToolResult {
  reservedType: "client_tool_result";
  toolCallId: string;
  result: string;
  isError: boolean;
  additionalProperties?: Record<string, any>;
}

export interface McpToolApprovalResult {
  reservedType: "mcp_tool_approval_result";
  toolCallId: string;
  isApproved: boolean;
  additionalProperties?: Record<string, any>;
}

export interface ContextualUpdate {
  reservedType: "contextual_update";
  reservedText: string;
  additionalProperties?: Record<string, any>;
}

export interface ConversationInitiation {
  reservedType: "conversation_initiation_client_data";
  conversationConfigOverride?: Record<string, any>;
  customLlmExtraBody?: Record<string, any>;
  dynamicVariables?: Record<string, any>;
  additionalProperties?: Record<string, any>;
}

export interface Audio {
  reservedType: "audio";
  audioEvent: AudioEvent;
  additionalProperties?: Record<string, any>;
}

export interface AudioEvent {
  audioBase_64: string;
  eventId: number;
  additionalProperties?: Record<string, any>;
}

export interface UserTranscript {
  reservedType: "user_transcript";
  userTranscriptionEvent: UserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface UserTranscriptionEvent {
  userTranscript: string;
  additionalProperties?: Record<string, any>;
}

export interface TentativeUserTranscript {
  reservedType: "tentative_user_transcript";
  tentativeUserTranscriptionEvent: TentativeUserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface TentativeUserTranscriptionEvent {
  userTranscript: string;
  eventId: number;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponse {
  reservedType: "agent_response";
  agentResponseEvent: AgentResponseEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseEvent {
  agentResponse: string;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseCorrection {
  reservedType: "agent_response_correction";
  agentResponseCorrectionEvent: AgentResponseCorrectionEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseCorrectionEvent {
  originalAgentResponse: string;
  correctedAgentResponse: string;
  additionalProperties?: Record<string, any>;
}

export interface Interruption {
  reservedType: "interruption";
  interruptionEvent: InterruptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface InterruptionEvent {
  eventId: number;
  additionalProperties?: Record<string, any>;
}

export interface ConversationMetadata {
  reservedType: "conversation_initiation_metadata";
  conversationInitiationMetadataEvent: ConversationInitiationMetadataEvent;
  additionalProperties?: Record<string, any>;
}

export interface ConversationInitiationMetadataEvent {
  conversationId: string;
  agentOutputAudioFormat: ConversationInitiationMetadataEventAgentOutputAudioFormat;
  userInputAudioFormat: AnonymSchema1;
  additionalProperties?: Record<string, any>;
}

export type ConversationInitiationMetadataEventAgentOutputAudioFormat =
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000";

export type AnonymSchema1 =
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000";

export interface ClientToolCall {
  reservedType: "client_tool_call";
  clientToolCall: ClientToolCall;
  additionalProperties?: Record<string, any>;
}

export interface AgentToolResponse {
  reservedType: "agent_tool_response";
  agentToolResponse: AgentToolResponse;
  additionalProperties?: Record<string, any>;
}

export interface McpToolCall {
  reservedType: "mcp_tool_call";
  mcpToolCall:
    | McpToolCallOneOf_0
    | McpToolCallOneOf_1
    | McpToolCallOneOf_2
    | McpToolCallOneOf_3;
  additionalProperties?: Record<string, any>;
}

export interface McpToolCallOneOf_0 {
  serviceId: string;
  toolCallId: string;
  toolName: string;
  toolDescription?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "loading";
}

export interface McpToolCallOneOf_1 {
  serviceId: string;
  toolCallId: string;
  toolName: string;
  toolDescription?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "awaiting_approval";
  approvalTimeoutSecs: number;
}

export interface McpToolCallOneOf_2 {
  serviceId: string;
  toolCallId: string;
  toolName: string;
  toolDescription?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "success";
  result: Record<string, any>[];
}

export interface McpToolCallOneOf_3 {
  serviceId: string;
  toolCallId: string;
  toolName: string;
  toolDescription?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "failure";
  errorMessage: string;
}

export interface McpConnectionStatus {
  reservedType: "mcp_connection_status";
  mcpConnectionStatus: McpConnectionStatus;
  additionalProperties?: Record<string, any>;
}

export interface McpConnectionStatusIntegrationsItem {
  integrationId: string;
  integrationType: McpConnectionStatusIntegrationsItemIntegrationType;
  isConnected: boolean;
  toolCount: number;
  additionalProperties?: Record<string, any>;
}

export type McpConnectionStatusIntegrationsItemIntegrationType =
  | "mcp_server"
  | "mcp_integration";

export interface VadScore {
  reservedType: "vad_score";
  vadScoreEvent: VadScoreEvent;
  additionalProperties?: Record<string, any>;
}

export interface VadScoreEvent {
  vadScore: number;
  additionalProperties?: Record<string, any>;
}

export interface Ping {
  reservedType: "ping";
  pingEvent: PingEvent;
  additionalProperties?: Record<string, any>;
}

export interface PingEvent {
  eventId: number;
  pingMs?: number;
  additionalProperties?: Record<string, any>;
}

export interface AudioClientEvent {
  reservedType: "audio";
  audioEvent: AudioEvent;
  additionalProperties?: Record<string, any>;
}

export interface UserTranscriptionClientEvent {
  reservedType: "user_transcript";
  userTranscriptionEvent: UserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface TentativeUserTranscriptionClientEvent {
  reservedType: "tentative_user_transcript";
  tentativeUserTranscriptionEvent: TentativeUserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseClientEvent {
  reservedType: "agent_response";
  agentResponseEvent: AgentResponseEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseCorrectionClientEvent {
  reservedType: "agent_response_correction";
  agentResponseCorrectionEvent: AgentResponseCorrectionEvent;
  additionalProperties?: Record<string, any>;
}

export interface ClientToolCallClientEvent {
  reservedType: "client_tool_call";
  clientToolCall: ClientToolCall;
  additionalProperties?: Record<string, any>;
}

export interface AgentToolResponseClientEvent {
  reservedType: "agent_tool_response";
  agentToolResponse: AgentToolResponse;
  additionalProperties?: Record<string, any>;
}

export interface McpToolCallClientEvent {
  reservedType: "mcp_tool_call";
  mcpToolCall:
    | McpToolCallOneOf_0
    | McpToolCallOneOf_1
    | McpToolCallOneOf_2
    | McpToolCallOneOf_3;
  additionalProperties?: Record<string, any>;
}

export interface McpConnectionStatusClientEvent {
  reservedType: "mcp_connection_status";
  mcpConnectionStatus: McpConnectionStatus;
  additionalProperties?: Record<string, any>;
}

export interface VadScoreClientEvent {
  reservedType: "vad_score";
  vadScoreEvent: VadScoreEvent;
  additionalProperties?: Record<string, any>;
}

export interface PongClientToOrchestratorEvent {
  reservedType: "pong";
  eventId: number;
  additionalProperties?: Record<string, any>;
}

export interface UserMessageClientToOrchestratorEvent {
  reservedType: "user_message";
  reservedText?: string;
  additionalProperties?: Record<string, any>;
}

export interface UserActivityClientToOrchestratorEvent {
  reservedType: "user_activity";
  additionalProperties?: Record<string, any>;
}

export interface UserFeedbackClientToOrchestratorEvent {
  reservedType?: "feedback";
  eventId: number;
  score: Score;
  additionalProperties?: Record<string, any>;
}

export interface ClientToolResultClientToOrchestratorEvent {
  reservedType: "client_tool_result";
  toolCallId: string;
  result: string;
  isError: boolean;
  additionalProperties?: Record<string, any>;
}

export interface McpToolApprovalResultClientToOrchestratorEvent {
  reservedType: "mcp_tool_approval_result";
  toolCallId: string;
  isApproved: boolean;
  additionalProperties?: Record<string, any>;
}

export interface ContextualUpdateClientToOrchestratorEvent {
  reservedType: "contextual_update";
  reservedText: string;
  additionalProperties?: Record<string, any>;
}

export interface ConversationInitiationClientToOrchestratorEvent {
  reservedType: "conversation_initiation_client_data";
  conversationConfigOverride?: Record<string, any>;
  customLlmExtraBody?: Record<string, any>;
  dynamicVariables?: Record<string, any>;
  additionalProperties?: Record<string, any>;
}
