// Auto-generated from agent.asyncapi.yaml — DO NOT EDIT MANUALLY

import type {
  TentativeUserTranscript,
  AgentResponseCorrection,
  AgentChatResponsePart,
  Interruption,
  ConversationMetadata,
  AgentToolRequestMessage,
  AgentToolResponseMessage,
  McpToolCall,
  McpConnectionStatusMessage,
  VadScore,
  AsrInitiationMetadata,
  GuardrailTriggered,
  InternalTurnProbability,
} from "@elevenlabs/types";

/** Union of all generated wire type strings */
export type GeneratedWireType =
  | "tentative_user_transcript"
  | "agent_response_correction"
  | "agent_chat_response_part"
  | "interruption"
  | "conversation_initiation_metadata"
  | "agent_tool_request"
  | "agent_tool_response"
  | "mcp_tool_call"
  | "mcp_connection_status"
  | "vad_score"
  | "asr_initiation_metadata"
  | "guardrail_triggered"
  | "internal_turn_probability";

/** Generated event map — simple unwrap events only */
export type GeneratedEventMap = {
  "tentative-user-transcript": (
    props: TentativeUserTranscript["tentative_user_transcription_event"]
  ) => void;
  "agent-response-correction": (
    props: AgentResponseCorrection["agent_response_correction_event"]
  ) => void;
  "agent-chat-response-part": (
    props: AgentChatResponsePart["text_response_part"]
  ) => void;
  interruption: (props: Interruption["interruption_event"]) => void;
  "conversation-initiation-metadata": (
    props: ConversationMetadata["conversation_initiation_metadata_event"]
  ) => void;
  "agent-tool-request": (
    props: AgentToolRequestMessage["agent_tool_request"]
  ) => void;
  "agent-tool-response": (
    props: AgentToolResponseMessage["agent_tool_response"]
  ) => void;
  "mcp-tool-call": (props: McpToolCall["mcp_tool_call"]) => void;
  "mcp-connection-status": (
    props: McpConnectionStatusMessage["mcp_connection_status"]
  ) => void;
  "vad-score": (props: VadScore["vad_score_event"]) => void;
  "asr-initiation-metadata": (
    props: AsrInitiationMetadata["asr_initiation_metadata_event"]
  ) => void;
  "guardrail-triggered": () => void;
  "internal-turn-probability": (
    props: InternalTurnProbability["turn_probability_internal_event"]
  ) => void;
};

/** Runtime: wire `type` → event name (generated events only) */
export const WIRE_TYPE_TO_EVENT_NAME: Record<
  GeneratedWireType,
  keyof GeneratedEventMap
> = {
  tentative_user_transcript: "tentative-user-transcript",
  agent_response_correction: "agent-response-correction",
  agent_chat_response_part: "agent-chat-response-part",
  interruption: "interruption",
  conversation_initiation_metadata: "conversation-initiation-metadata",
  agent_tool_request: "agent-tool-request",
  agent_tool_response: "agent-tool-response",
  mcp_tool_call: "mcp-tool-call",
  mcp_connection_status: "mcp-connection-status",
  vad_score: "vad-score",
  asr_initiation_metadata: "asr-initiation-metadata",
  guardrail_triggered: "guardrail-triggered",
  internal_turn_probability: "internal-turn-probability",
};

/** Runtime: wire `type` → payload field to unwrap (null = no payload) */
export const WIRE_TYPE_TO_PAYLOAD_FIELD: Record<
  GeneratedWireType,
  string | null
> = {
  tentative_user_transcript: "tentative_user_transcription_event",
  agent_response_correction: "agent_response_correction_event",
  agent_chat_response_part: "text_response_part",
  interruption: "interruption_event",
  conversation_initiation_metadata: "conversation_initiation_metadata_event",
  agent_tool_request: "agent_tool_request",
  agent_tool_response: "agent_tool_response",
  mcp_tool_call: "mcp_tool_call",
  mcp_connection_status: "mcp_connection_status",
  vad_score: "vad_score_event",
  asr_initiation_metadata: "asr_initiation_metadata_event",
  guardrail_triggered: null,
  internal_turn_probability: "turn_probability_internal_event",
};
