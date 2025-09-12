/* Auto-generated from AsyncAPI
 * Role: client
 * DO NOT EDIT MANUALLY
 */

export interface UserAudio {
  user_audio_chunk: string;
  additionalProperties?: Record<string, any>;
}

export interface Pong {
  type: "pong";
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface UserMessage {
  type: "user_message";
  text?: string;
  additionalProperties?: Record<string, any>;
}

export interface UserActivity {
  type: "user_activity";
  additionalProperties?: Record<string, any>;
}

export interface UserFeedback {
  type: "feedback";
  event_id: number;
  score: Score;
  additionalProperties?: Record<string, any>;
}

export type Score = "like" | "dislike";

export interface ClientToolResult {
  type: "client_tool_result";
  tool_call_id: string;
  result: string;
  is_error: boolean;
  additionalProperties?: Record<string, any>;
}

export interface McpToolApprovalResult {
  type: "mcp_tool_approval_result";
  tool_call_id: string;
  is_approved: boolean;
  additionalProperties?: Record<string, any>;
}

export interface ContextualUpdate {
  type: "contextual_update";
  text: string;
  additionalProperties?: Record<string, any>;
}

export interface ConversationInitiation {
  type: "conversation_initiation_client_data";
  conversation_config_override?: ConversationConfigOverride;
  custom_llm_extra_body?: Record<string, any>;
  dynamic_variables?: Record<string, any>;
  additionalProperties?: Record<string, any>;
}

export interface ConversationConfigOverride {
  agent?: ConversationConfigOverrideAgent;
  tts?: ConversationConfigOverrideTts;
  conversation?: ConversationConfigOverrideConversation;
  additionalProperties?: Record<string, any>;
}

export interface ConversationConfigOverrideAgent {
  first_message?: string;
  language?: string;
  prompt?: ConversationConfigOverrideAgentPrompt;
  native_mcp_server_ids?: string[];
  additionalProperties?: Record<string, any>;
}

export interface ConversationConfigOverrideAgentPrompt {
  prompt?: string;
  additionalProperties?: Record<string, any>;
}

export interface ConversationConfigOverrideTts {
  voice_id?: string;
  stability?: number;
  speed?: number;
  similarity_boost?: number;
  additionalProperties?: Record<string, any>;
}

export interface ConversationConfigOverrideConversation {
  text_only?: boolean;
  additionalProperties?: Record<string, any>;
}

export interface Audio {
  type: "audio";
  audio_event: AudioEvent;
  additionalProperties?: Record<string, any>;
}

export interface AudioEvent {
  audio_base_64: string;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface UserTranscript {
  type: "user_transcript";
  user_transcription_event: UserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface UserTranscriptionEvent {
  user_transcript: string;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface TentativeUserTranscript {
  type: "tentative_user_transcript";
  tentative_user_transcription_event: TentativeUserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface TentativeUserTranscriptionEvent {
  user_transcript: string;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponse {
  type: "agent_response";
  agent_response_event: AgentResponseEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseEvent {
  agent_response: string;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseCorrection {
  type: "agent_response_correction";
  agent_response_correction_event: AgentResponseCorrectionEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseCorrectionEvent {
  original_agent_response: string;
  corrected_agent_response: string;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface Interruption {
  type: "interruption";
  interruption_event: InterruptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface InterruptionEvent {
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface ConversationMetadata {
  type: "conversation_initiation_metadata";
  conversation_initiation_metadata_event: ConversationInitiationMetadataEvent;
  additionalProperties?: Record<string, any>;
}

export interface ConversationInitiationMetadataEvent {
  conversation_id: string;
  agent_output_audio_format: ConversationInitiationMetadataEventAgentOutputAudioFormat;
  user_input_audio_format: AnonymSchema1;
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

export interface ClientToolCallMessage {
  type: "client_tool_call";
  client_tool_call: ClientToolCall;
  additionalProperties?: Record<string, any>;
}

export interface ClientToolCall {
  tool_name: string;
  tool_call_id: string;
  parameters: Record<string, any>;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface AgentToolResponseMessage {
  type: "agent_tool_response";
  agent_tool_response: AgentToolResponse;
  additionalProperties?: Record<string, any>;
}

export interface AgentToolResponse {
  tool_name: string;
  tool_call_id: string;
  tool_type: string;
  is_error: boolean;
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface McpToolCall {
  type: "mcp_tool_call";
  mcp_tool_call:
    | McpToolCallOneOf_0
    | McpToolCallOneOf_1
    | McpToolCallOneOf_2
    | McpToolCallOneOf_3;
  additionalProperties?: Record<string, any>;
}

export interface McpToolCallOneOf_0 {
  service_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_description?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "loading";
}

export interface McpToolCallOneOf_1 {
  service_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_description?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "awaiting_approval";
  approval_timeout_secs: number;
}

export interface McpToolCallOneOf_2 {
  service_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_description?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "success";
  result: Record<string, any>[];
}

export interface McpToolCallOneOf_3 {
  service_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_description?: string;
  parameters: Record<string, any>;
  timestamp: string;
  state: "failure";
  error_message: string;
}

export interface McpConnectionStatusMessage {
  type: "mcp_connection_status";
  mcp_connection_status: McpConnectionStatus;
  additionalProperties?: Record<string, any>;
}

export interface McpConnectionStatus {
  integrations: McpConnectionStatusIntegrationsItem[];
  additionalProperties?: Record<string, any>;
}

export interface McpConnectionStatusIntegrationsItem {
  integration_id: string;
  integration_type: McpConnectionStatusIntegrationsItemIntegrationType;
  is_connected: boolean;
  tool_count: number;
  additionalProperties?: Record<string, any>;
}

export type McpConnectionStatusIntegrationsItemIntegrationType =
  | "mcp_server"
  | "mcp_integration";

export interface VadScore {
  type: "vad_score";
  vad_score_event: VadScoreEvent;
  additionalProperties?: Record<string, any>;
}

export interface VadScoreEvent {
  vad_score: number;
  additionalProperties?: Record<string, any>;
}

export interface Ping {
  type: "ping";
  ping_event: PingEvent;
  additionalProperties?: Record<string, any>;
}

export interface PingEvent {
  event_id: number;
  ping_ms?: number;
  additionalProperties?: Record<string, any>;
}

export interface AudioClientEvent {
  type: "audio";
  audio_event: AudioEvent;
  additionalProperties?: Record<string, any>;
}

export interface UserTranscriptionClientEvent {
  type: "user_transcript";
  user_transcription_event: UserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface TentativeUserTranscriptionClientEvent {
  type: "tentative_user_transcript";
  tentative_user_transcription_event: TentativeUserTranscriptionEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseClientEvent {
  type: "agent_response";
  agent_response_event: AgentResponseEvent;
  additionalProperties?: Record<string, any>;
}

export interface AgentResponseCorrectionClientEvent {
  type: "agent_response_correction";
  agent_response_correction_event: AgentResponseCorrectionEvent;
  additionalProperties?: Record<string, any>;
}

export interface ClientToolCallClientEvent {
  type: "client_tool_call";
  client_tool_call: ClientToolCall;
  additionalProperties?: Record<string, any>;
}

export interface AgentToolResponseClientEvent {
  type: "agent_tool_response";
  agent_tool_response: AgentToolResponse;
  additionalProperties?: Record<string, any>;
}

export interface McpToolCallClientEvent {
  type: "mcp_tool_call";
  mcp_tool_call:
    | McpToolCallOneOf_0
    | McpToolCallOneOf_1
    | McpToolCallOneOf_2
    | McpToolCallOneOf_3;
  additionalProperties?: Record<string, any>;
}

export interface McpConnectionStatusClientEvent {
  type: "mcp_connection_status";
  mcp_connection_status: McpConnectionStatus;
  additionalProperties?: Record<string, any>;
}

export interface VadScoreClientEvent {
  type: "vad_score";
  vad_score_event: VadScoreEvent;
  additionalProperties?: Record<string, any>;
}

export interface PongClientToOrchestratorEvent {
  type: "pong";
  event_id: number;
  additionalProperties?: Record<string, any>;
}

export interface UserMessageClientToOrchestratorEvent {
  type: "user_message";
  text?: string;
  additionalProperties?: Record<string, any>;
}

export interface UserActivityClientToOrchestratorEvent {
  type: "user_activity";
  additionalProperties?: Record<string, any>;
}

export interface UserFeedbackClientToOrchestratorEvent {
  type: "feedback";
  event_id: number;
  score: Score;
  additionalProperties?: Record<string, any>;
}

export interface ClientToolResultClientToOrchestratorEvent {
  type: "client_tool_result";
  tool_call_id: string;
  result: string;
  is_error: boolean;
  additionalProperties?: Record<string, any>;
}

export interface McpToolApprovalResultClientToOrchestratorEvent {
  type: "mcp_tool_approval_result";
  tool_call_id: string;
  is_approved: boolean;
  additionalProperties?: Record<string, any>;
}

export interface ContextualUpdateClientToOrchestratorEvent {
  type: "contextual_update";
  text: string;
  additionalProperties?: Record<string, any>;
}

export interface ConversationInitiationClientToOrchestratorEvent {
  type: "conversation_initiation_client_data";
  conversation_config_override?: ConversationConfigOverride;
  custom_llm_extra_body?: Record<string, any>;
  dynamic_variables?: Record<string, any>;
  additionalProperties?: Record<string, any>;
}
