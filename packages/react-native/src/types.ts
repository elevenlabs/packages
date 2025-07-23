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
 * Client tool call event structure
 */
export type ClientToolCallEvent = {
  tool_name: string;
  tool_call_id: string;
  parameters: unknown;
  expects_response: boolean;
};

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
  onMessage?: (props: { message: string; source: Role }) => void;
  onModeChange?: (prop: { mode: Mode }) => void;
  onStatusChange?: (prop: { status: ConversationStatus }) => void;
  onCanSendFeedbackChange?: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (params: ClientToolCallEvent) => void;
};

export type ConversationConfig = {
  agentId?: string;
  conversationToken?: string;
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
  };
  customLlmExtraBody?: unknown;
  dynamicVariables?: Record<string, string | number | boolean>;
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
  };
  custom_llm_extra_body?: unknown;
  dynamic_variables?: Record<string, string | number | boolean>;
};
