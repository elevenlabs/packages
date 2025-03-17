import { Language } from "./connection";

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

// TODO correction missing
export type IncomingSocketEvent =
  | UserTranscriptionEvent
  | AgentResponseEvent
  | AgentAudioEvent
  | InterruptionEvent
  | InternalTentativeAgentResponseEvent
  | ConfigEvent
  | PingEvent
  | ClientToolCallEvent;

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
  type: "conversation_initiation_client_data";
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
  };
  custom_llm_extra_body?: any;
  dynamic_variables?: Record<string, string | number | boolean>;
};
export type OutgoingSocketEvent =
  | PongEvent
  | UserAudioEvent
  | InitiationClientDataEvent
  | UserFeedbackEvent
  | ClientToolResultEvent;

export function isValidSocketEvent(event: any): event is IncomingSocketEvent {
  return !!event.type;
}
