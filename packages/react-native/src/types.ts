/**
 * Role in the conversation
 */
export type Role = "user" | "ai";

/**
 * Current mode of the conversation
 */
export type Mode = "speaking" | "listening";

export type ConversationStatus = "disconnected" | "connecting" | "connected";

/**
 * Language support
 */
export type Language =
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
  | "vi";

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

/**
 * Callbacks configuration
 */
export type Callbacks = {
  onConnect?: (props: { conversationId: string }) => void;
  // internal debug events, not to be used
  onDebug?: (props: unknown) => void;
  onDisconnect?: (details: string) => void;
  onError?: (message: string, context?: Record<string, unknown>) => void;
  onMessage?: (props: { message: ConversationEvent; source: Role }) => void;
  onModeChange?: (prop: { mode: Mode }) => void;
  onStatusChange?: (prop: { status: ConversationStatus }) => void;
  onCanSendFeedbackChange?: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (params: ClientToolCallEvent) => void;
};

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

export type UserTranscriptionEvent = {
  type: "user_transcript";
  user_transcription_event: { user_transcript: string };
};

export type AgentResponseEvent = {
  type: "agent_response";
  agent_response_event: { agent_response: string };
};

export type AgentResponseCorrectionEvent = {
  type: "agent_response_correction";
  agent_response_correction_event: {
    original_agent_response: string;
    corrected_agent_response: string;
  };
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
    conversation?: {
      text_only?: boolean;
    };
    source_info?: {
      source?: string | null;
      version?: string | null;
    };
  };
  custom_llm_extra_body?: unknown;
  dynamic_variables?: Record<string, string | number | boolean>;
  user_id?: string;
};

export type ConversationEvent =
  | UserTranscriptionEvent
  | AgentResponseEvent
  | AgentResponseCorrectionEvent
  | AgentAudioEvent
  | InterruptionEvent
  | InternalTentativeAgentResponseEvent
  | ConfigEvent
  | PingEvent
  | ClientToolCallEvent;
