/* Auto-generated from AsyncAPI
 * Role: client
 * DO NOT EDIT MANUALLY
 */

export interface UserAudio {
  user_audio_chunk: string;
}

export interface Pong {
  type: "pong";
  event_id: number;
}

export interface UserMessage {
  type: "user_message";
  text?: string;
}

export interface UserActivity {
  type: "user_activity";
}

export interface UserFeedback {
  type: "feedback";
  event_id: number;
  score: Score;
}

export type Score = "like" | "dislike";

export interface ClientToolResult {
  type: "client_tool_result";
  tool_call_id: string;
  result: string;
  is_error: boolean;
}

export interface McpToolApprovalResult {
  type: "mcp_tool_approval_result";
  tool_call_id: string;
  is_approved: boolean;
}

export interface ContextualUpdate {
  type: "contextual_update";
  text: string;
}

export interface ConversationInitiation {
  type: "conversation_initiation_client_data";
  conversation_config_override?: ConversationConfigOverride;
  custom_llm_extra_body?: Record<string, any>;
  dynamic_variables?: Record<string, any>;
  user_id?: string;
  source_info?: SourceInfo;
}

export interface ConversationConfigOverride {
  agent?: ConversationConfigOverrideAgent;
  tts?: ConversationConfigOverrideTts;
  conversation?: ConversationConfigOverrideConversation;
}

export interface ConversationConfigOverrideAgent {
  first_message?: string;
  language?: ConversationConfigOverrideAgentLanguage;
  prompt?: ConversationConfigOverrideAgentPrompt;
  native_mcp_server_ids?: string[];
}

export type ConversationConfigOverrideAgentLanguage =
  | "en"
  | "ja"
  | "zh"
  | "de"
  | "hi"
  | "fr"
  | "ko"
  | "pt"
  | "pt-br"
  | "it"
  | "es"
  | "id"
  | "nl"
  | "tr"
  | "pl"
  | "sv"
  | "bg"
  | "ro"
  | "ar"
  | "cs"
  | "el"
  | "fi"
  | "ms"
  | "da"
  | "ta"
  | "uk"
  | "ru"
  | "hu"
  | "hr"
  | "sk"
  | "no"
  | "vi"
  | "tl"
  | "af"
  | "hy"
  | "as"
  | "az"
  | "be"
  | "bn"
  | "bs"
  | "ca"
  | "et"
  | "gl"
  | "ka"
  | "gu"
  | "ha"
  | "he"
  | "is"
  | "ga"
  | "jv"
  | "kn"
  | "kk"
  | "ky"
  | "lv"
  | "lt"
  | "lb"
  | "mk"
  | "ml"
  | "mr"
  | "ne"
  | "ps"
  | "fa"
  | "pa"
  | "sr"
  | "sd"
  | "sl"
  | "so"
  | "sw"
  | "te"
  | "th"
  | "ur"
  | "cy";

export interface ConversationConfigOverrideAgentPrompt {
  prompt?: string;
}

export interface ConversationConfigOverrideTts {
  voice_id?: string;
  stability?: number;
  speed?: number;
  similarity_boost?: number;
}

export interface ConversationConfigOverrideConversation {
  text_only?: boolean;
  client_events?: ConversationConfigOverrideConversationClientEventsItem[];
}

export type ConversationConfigOverrideConversationClientEventsItem =
  | "audio"
  | "agent_response"
  | "agent_response_correction"
  | "agent_chat_response_part"
  | "interruption"
  | "user_transcript"
  | "tentative_user_transcript"
  | "conversation_initiation_metadata"
  | "client_tool_call"
  | "agent_tool_request"
  | "agent_tool_response"
  | "mcp_tool_call"
  | "mcp_connection_status"
  | "vad_score"
  | "ping"
  | "asr_initiation_metadata"
  | "internal_turn_probability"
  | "internal_tentative_agent_response";

export interface SourceInfo {
  source?: string;
  version?: string;
}

export interface ConversationConfigUpdate {
  type: "conversation_config_update";
  conversation_config_override: ConversationConfigOverride;
}

export interface Audio {
  type: "audio";
  audio_event: AudioEvent;
}

export interface AudioEvent {
  audio_base_64: string;
  event_id: number;
}

export interface UserTranscript {
  type: "user_transcript";
  user_transcription_event: UserTranscriptionEvent;
}

export interface UserTranscriptionEvent {
  user_transcript: string;
  event_id: number;
}

export interface TentativeUserTranscript {
  type: "tentative_user_transcript";
  tentative_user_transcription_event: TentativeUserTranscriptionEvent;
}

export interface TentativeUserTranscriptionEvent {
  user_transcript: string;
  event_id: number;
}

export interface AgentResponse {
  type: "agent_response";
  agent_response_event: AgentResponseEvent;
}

export interface AgentResponseEvent {
  agent_response: string;
  event_id: number;
}

export interface AgentResponseCorrection {
  type: "agent_response_correction";
  agent_response_correction_event: AgentResponseCorrectionEvent;
}

export interface AgentResponseCorrectionEvent {
  original_agent_response: string;
  corrected_agent_response: string;
  event_id: number;
}

export interface AgentChatResponsePart {
  type: "agent_chat_response_part";
  text_response_part: TextResponsePart;
}

export interface TextResponsePart {
  text: string;
  type: TextResponsePartType;
}

export type TextResponsePartType = "start" | "delta" | "stop";

export interface Interruption {
  type: "interruption";
  interruption_event: InterruptionEvent;
}

export interface InterruptionEvent {
  event_id: number;
}

export interface ConversationMetadata {
  type: "conversation_initiation_metadata";
  conversation_initiation_metadata_event: ConversationInitiationMetadataEvent;
}

export interface ConversationInitiationMetadataEvent {
  conversation_id: string;
  agent_output_audio_format: ConversationInitiationMetadataEventAgentOutputAudioFormat;
  user_input_audio_format: ConversationInitiationMetadataEventUserInputAudioFormat;
}

export type ConversationInitiationMetadataEventAgentOutputAudioFormat =
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000";

export type ConversationInitiationMetadataEventUserInputAudioFormat =
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
}

export interface ClientToolCall {
  tool_name: string;
  tool_call_id: string;
  parameters: Record<string, any>;
  event_id: number;
}

export interface AgentToolRequestMessage {
  type: "agent_tool_request";
  agent_tool_request: AgentToolRequest;
}

export interface AgentToolRequest {
  tool_name: string;
  tool_call_id: string;
  tool_type: string;
  event_id: number;
}

export interface AgentToolResponseMessage {
  type: "agent_tool_response";
  agent_tool_response: AgentToolResponse;
}

export interface AgentToolResponse {
  tool_name: string;
  tool_call_id: string;
  tool_type: string;
  is_error: boolean;
  is_called: boolean;
  event_id: number;
}

export interface McpToolCall {
  type: "mcp_tool_call";
  mcp_tool_call:
    | McpToolCallOneOf_0
    | McpToolCallOneOf_1
    | McpToolCallOneOf_2
    | McpToolCallOneOf_3;
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
}

export interface McpConnectionStatus {
  integrations: McpConnectionStatusIntegrationsItem[];
}

export interface McpConnectionStatusIntegrationsItem {
  integration_id: string;
  integration_type: McpConnectionStatusIntegrationsItemIntegrationType;
  is_connected: boolean;
  tool_count: number;
}

export type McpConnectionStatusIntegrationsItemIntegrationType =
  | "mcp_server"
  | "mcp_integration";

export interface VadScore {
  type: "vad_score";
  vad_score_event: VadScoreEvent;
}

export interface VadScoreEvent {
  vad_score: number;
}

export interface Ping {
  type: "ping";
  ping_event: PingEvent;
}

export interface PingEvent {
  event_id: number;
  ping_ms?: number;
}

export interface AsrInitiationMetadata {
  type: "asr_initiation_metadata";
  asr_initiation_metadata_event: Record<string, any>;
}

export interface InternalTurnProbability {
  type: "internal_turn_probability";
  turn_probability_internal_event: TurnProbabilityInternalEvent;
}

export interface TurnProbabilityInternalEvent {
  turn_probability: number;
}

export interface InternalTentativeAgentResponse {
  type: "internal_tentative_agent_response";
  tentative_agent_response_internal_event: TentativeAgentResponseInternalEvent;
}

export interface TentativeAgentResponseInternalEvent {
  tentative_agent_response: string;
}

export interface ErrorMessage {
  type: "error";
  error_event: ErrorEvent;
}

export interface ErrorEvent {
  code: ErrorEventCode;
  message?: string;
  error_type?: ErrorEventErrorType;
  reason?: string;
  debug_message?: string;
  details?: Record<string, any>;
}

export type ErrorEventCode = 1000 | 1002 | 1008 | 1011;

export type ErrorEventErrorType =
  | "unknown"
  | "invalid_message"
  | "telephony_agent_error"
  | "mcp_tool_error"
  | "mcp_https_error"
  | "value_error"
  | "missing_fields"
  | "override_error"
  | "missing_dynamic_variable_transfer"
  | "missing_dynamic_variable"
  | "websocket_disconnect"
  | "safety_violation"
  | "llm_timeout"
  | "transport_receive_timeout"
  | "asyncio_timeout"
  | "http_exception"
  | "max_duration_exceeded"
  | "llm_error"
  | "custom_llm_error"
  | "cascade_brain_error"
  | "asr_transcription_error"
  | "vad_error"
  | "turn_probability_error"
  | "tts_cascade_error"
  | "redis_timeout_error"
  | "unknown_websocket_crash";

export interface ConversationModeChange {
  type: "conversation_mode_change";
  conversation_mode_change_event: ConversationModeChangeEvent;
}

export interface ConversationModeChangeEvent {
  mode: ConversationModeChangeEventMode;
}

export type ConversationModeChangeEventMode = "text" | "voice";

export interface AudioClientEvent {
  type: "audio";
  audio_event: AudioEvent;
}

export interface UserTranscriptionClientEvent {
  type: "user_transcript";
  user_transcription_event: UserTranscriptionEvent;
}

export interface TentativeUserTranscriptionClientEvent {
  type: "tentative_user_transcript";
  tentative_user_transcription_event: TentativeUserTranscriptionEvent;
}

export interface AgentResponseClientEvent {
  type: "agent_response";
  agent_response_event: AgentResponseEvent;
}

export interface AgentResponseCorrectionClientEvent {
  type: "agent_response_correction";
  agent_response_correction_event: AgentResponseCorrectionEvent;
}

export interface AgentChatResponsePartClientEvent {
  type: "agent_chat_response_part";
  text_response_part: TextResponsePart;
}

export interface ClientToolCallClientEvent {
  type: "client_tool_call";
  client_tool_call: ClientToolCall;
}

export interface AgentToolRequestClientEvent {
  type: "agent_tool_request";
  agent_tool_request: AgentToolRequest;
}

export interface AgentToolResponseClientEvent {
  type: "agent_tool_response";
  agent_tool_response: AgentToolResponse;
}

export interface McpToolCallClientEvent {
  type: "mcp_tool_call";
  mcp_tool_call:
    | McpToolCallOneOf_0
    | McpToolCallOneOf_1
    | McpToolCallOneOf_2
    | McpToolCallOneOf_3;
}

export interface McpConnectionStatusClientEvent {
  type: "mcp_connection_status";
  mcp_connection_status: McpConnectionStatus;
}

export interface VadScoreClientEvent {
  type: "vad_score";
  vad_score_event: VadScoreEvent;
}

export interface AsrInitiationMetadataEvent {
  type: "asr_initiation_metadata";
  asr_initiation_metadata_event: Record<string, any>;
}

export interface TurnProbabilityInternalClientEvent {
  type: "internal_turn_probability";
  turn_probability_internal_event: TurnProbabilityInternalEvent;
}

export interface TentativeAgentResponseInternalClientEvent {
  type: "internal_tentative_agent_response";
  tentative_agent_response_internal_event: TentativeAgentResponseInternalEvent;
}

export interface ErrorClientEvent {
  type: "error";
  error_event: ErrorEvent;
}

export interface ConversationModeChangeClientEvent {
  type: "conversation_mode_change";
  conversation_mode_change_event: ConversationModeChangeEvent;
}

export interface PongClientToOrchestratorEvent {
  type: "pong";
  event_id: number;
}

export interface UserMessageClientToOrchestratorEvent {
  type: "user_message";
  text?: string;
}

export interface UserActivityClientToOrchestratorEvent {
  type: "user_activity";
}

export interface UserFeedbackClientToOrchestratorEvent {
  type: "feedback";
  event_id: number;
  score: Score;
}

export interface ClientToolResultClientToOrchestratorEvent {
  type: "client_tool_result";
  tool_call_id: string;
  result: string;
  is_error: boolean;
}

export interface McpToolApprovalResultClientToOrchestratorEvent {
  type: "mcp_tool_approval_result";
  tool_call_id: string;
  is_approved: boolean;
}

export interface ContextualUpdateClientToOrchestratorEvent {
  type: "contextual_update";
  text: string;
}

export interface ConversationInitiationClientToOrchestratorEvent {
  type: "conversation_initiation_client_data";
  conversation_config_override?: ConversationConfigOverride;
  custom_llm_extra_body?: Record<string, any>;
  dynamic_variables?: Record<string, any>;
  user_id?: string;
  source_info?: SourceInfo;
}

export interface ConversationConfigUpdateClientToOrchestratorEvent {
  type: "conversation_config_update";
  conversation_config_override: ConversationConfigOverride;
}

export interface InputAudioChunk {
  message_type: "input_audio_chunk";
  audio_base_64: string;
  commit: boolean;
  sample_rate: number;
  previous_text?: string;
}

export interface SessionStarted {
  message_type: "session_started";
  session_id: string;
  config: Config;
}

export interface Config {
  sample_rate?: number;
  audio_format?: ConfigAudioFormat;
  language_code?: string;
  vad_commit_strategy?: ConfigVadCommitStrategy;
  vad_silence_threshold_secs?: number;
  vad_threshold?: number;
  min_speech_duration_ms?: number;
  min_silence_duration_ms?: number;
  model_id?: string;
  disable_logging?: boolean;
}

export type ConfigAudioFormat =
  | "pcm_8000"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100"
  | "pcm_48000"
  | "ulaw_8000";

export type ConfigVadCommitStrategy = "manual" | "vad";

export interface PartialTranscript {
  message_type: "partial_transcript";
  text: string;
}

export interface CommittedTranscript {
  message_type: "committed_transcript";
  text: string;
}

export interface CommittedTranscriptWithTimestamps {
  message_type: "committed_transcript_with_timestamps";
  text: string;
  language_code?: string;
  words?: WordsItem[];
}

export interface WordsItem {
  text?: string;
  start?: number;
  end?: number;
  type?: WordsItemType;
  speaker_id?: string;
  logprob?: number;
  characters?: string[];
}

export type WordsItemType = "word" | "spacing";

export interface Error {
  message_type: MessageType;
  error: string;
}

export type MessageType =
  | "error"
  | "auth_error"
  | "quota_exceeded"
  | "commit_throttled"
  | "transcriber_error"
  | "unaccepted_terms"
  | "rate_limited"
  | "input_error"
  | "queue_overflow"
  | "resource_exhausted"
  | "session_time_limit_exceeded"
  | "chunk_size_exceeded"
  | "insufficient_audio_activity";

export interface AuthError {
  message_type: "auth_error";
  error: string;
}

export interface QuotaExceededError {
  message_type: "quota_exceeded";
  error: string;
}

export interface CommitThrottledError {
  message_type: "commit_throttled";
  error: string;
}

export interface TranscriberError {
  message_type: "transcriber_error";
  error: string;
}

export interface UnacceptedTermsError {
  message_type: "unaccepted_terms";
  error: string;
}

export interface RateLimitedError {
  message_type: "rate_limited";
  error: string;
}

export interface InputError {
  message_type: "input_error";
  error: string;
}

export interface QueueOverflowError {
  message_type: "queue_overflow";
  error: string;
}

export interface ResourceExhaustedError {
  message_type: "resource_exhausted";
  error: string;
}

export interface SessionTimeLimitExceededError {
  message_type: "session_time_limit_exceeded";
  error: string;
}

export interface ChunkSizeExceededError {
  message_type: "chunk_size_exceeded";
  error: string;
}

export interface InsufficientAudioActivityError {
  message_type: "insufficient_audio_activity";
  error: string;
}

export interface SessionStartedMessage {
  message_type: "session_started";
  session_id: string;
  config: Config;
}

export interface PartialTranscriptMessage {
  message_type: "partial_transcript";
  text: string;
}

export interface CommittedTranscriptMessage {
  message_type: "committed_transcript";
  text: string;
}

export interface CommittedTranscriptWithTimestampsMessage {
  message_type: "committed_transcript_with_timestamps";
  text: string;
  language_code?: string;
  words?: WordsItem[];
}

export interface ScribeErrorMessage {
  message_type: MessageType;
  error: string;
}

export interface ScribeAuthErrorMessage {
  message_type: "auth_error";
  error: string;
}

export interface ScribeQuotaExceededErrorMessage {
  message_type: "quota_exceeded";
  error: string;
}

export interface ScribeCommitThrottledErrorMessage {
  message_type: "commit_throttled";
  error: string;
}

export interface ScribeTranscriberErrorMessage {
  message_type: "transcriber_error";
  error: string;
}

export interface ScribeUnacceptedTermsErrorMessage {
  message_type: "unaccepted_terms";
  error: string;
}

export interface ScribeRateLimitedErrorMessage {
  message_type: "rate_limited";
  error: string;
}

export interface ScribeInputErrorMessage {
  message_type: "input_error";
  error: string;
}

export interface ScribeQueueOverflowErrorMessage {
  message_type: "queue_overflow";
  error: string;
}

export interface ScribeResourceExhaustedErrorMessage {
  message_type: "resource_exhausted";
  error: string;
}

export interface ScribeSessionTimeLimitExceededErrorMessage {
  message_type: "session_time_limit_exceeded";
  error: string;
}

export interface ScribeChunkSizeExceededErrorMessage {
  message_type: "chunk_size_exceeded";
  error: string;
}

export interface ScribeInsufficientAudioActivityErrorMessage {
  message_type: "insufficient_audio_activity";
  error: string;
}
