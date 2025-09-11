import type { Language } from "./connection";
import type { CONVERSATION_INITIATION_CLIENT_DATA_TYPE } from "./overrides";

export type UserTranscriptionEvent = {
  type: "user_transcript";
  user_transcription_event: { user_transcript: string };
};
export type AgentResponseEvent = {
  type: "agent_response";
  agent_response_event: { agent_response: string };
};
export type AgentAudioEvent = {
  type: "audio";
  audio_event: {
    audio_base_64: string;
    event_id: number;
  };
};
export type InterruptionEvent = {
  type: "interruption";
  interruption_event: {
    event_id: number;
  };
};
export type InternalTentativeAgentResponseEvent = {
  type: "internal_tentative_agent_response";
  tentative_agent_response_internal_event: {
    tentative_agent_response: string;
  };
};
export type ConfigEvent = {
  type: "conversation_initiation_metadata";
  conversation_initiation_metadata_event: {
    conversation_id: string;
    agent_output_audio_format: string;
    user_input_audio_format?: string;
  };
};
export type PingEvent = {
  type: "ping";
  ping_event: {
    event_id: number;
    ping_ms?: number;
  };
};
export type ClientToolCallEvent = {
  type: "client_tool_call";
  client_tool_call: {
    tool_name: string;
    tool_call_id: string;
    parameters: any;
    expects_response: boolean;
  };
};
export type VadScoreEvent = {
  type: "vad_score";
  vad_score_event: {
    vad_score: number;
  };
};

interface BaseMCPToolCallClientEventData {
  service_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_description?: string;
  parameters: Record<string, any>;
  timestamp: string; // ISO string format
}

interface MCPToolCallClientEventLoadingData
  extends BaseMCPToolCallClientEventData {
  state: "loading";
}

interface MCPToolCallClientEventAwaitingApprovalData
  extends BaseMCPToolCallClientEventData {
  state: "awaiting_approval";
  approval_timeout_secs: number;
}

interface MCPToolCallClientEventSuccessData
  extends BaseMCPToolCallClientEventData {
  state: "success";
  result: any[];
}

interface MCPToolCallClientEventFailureData
  extends BaseMCPToolCallClientEventData {
  state: "failure";
  error_message: string;
}

type MCPToolCallClientEventData =
  | MCPToolCallClientEventLoadingData
  | MCPToolCallClientEventAwaitingApprovalData
  | MCPToolCallClientEventSuccessData
  | MCPToolCallClientEventFailureData;

export interface MCPToolCallClientEvent {
  type: "mcp_tool_call";
  mcp_tool_call: MCPToolCallClientEventData;
}

export type AgentResponseCorrectionEvent = {
  type: "agent_response_correction";
  agent_response_correction_event: {
    original_agent_response: string;
    corrected_agent_response: string;
  };
};

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
  | MCPToolCallClientEvent;

export type PongEvent = {
  type: "pong";
  event_id: number;
};
export type UserAudioEvent = {
  user_audio_chunk: string;
};
export type UserFeedbackEvent = {
  type: "feedback";
  score: "like" | "dislike";
  event_id: number;
};
export type ClientToolResultEvent = {
  type: "client_tool_result";
  tool_call_id: string;
  result: any;
  is_error: boolean;
};
export type InitiationClientDataEvent = {
  type: typeof CONVERSATION_INITIATION_CLIENT_DATA_TYPE;
  conversation_config_override?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      first_message?: string;
      language?: Language;
    };
    tts?: {
      voice_id?: string;
    };
    conversation?: {
      text_only?: boolean;
    };
  };
  custom_llm_extra_body?: any;
  dynamic_variables?: Record<string, string | number | boolean>;
  user_id?: string;
  source_info?: {
    source?: string;
    version?: string;
  };
};
export type ContextualUpdateEvent = {
  type: "contextual_update";
  text: string;
};
export type UserMessageEvent = {
  type: "user_message";
  text: string;
};
export type UserActivityEvent = {
  type: "user_activity";
};
export type MCPToolApprovalResultEvent = {
  type: "mcp_tool_approval_result";
  tool_call_id: string;
  is_approved: boolean;
};
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
