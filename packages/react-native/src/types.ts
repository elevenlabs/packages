/**
 * Role in the conversation - consistent with client SDK
 */
export type Role = "user" | "ai";

/**
 * Current mode of the conversation - consistent with client SDK
 */
export type Mode = "speaking" | "listening";

export type ConversationStatus = "disconnected" | "connecting" | "connected";

/**
 * Language support - aligned with client SDK
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
 * Client tools configuration - consistent with client SDK
 */
export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: Record<string, unknown>
    ) => Promise<string | number | undefined> | string | number | undefined
  >;
};

/**
 * Callbacks configuration - aligned with client SDK but adapted for React Native
 */
export type Callbacks = {
  onConnect: (props: { conversationId: string }) => void;
  onDisconnect: (details: string) => void;
  onError: (message: string, context?: Record<string, unknown>) => void;
  onMessage: (props: { message: string; source: Role }) => void;
  onAudio: (base64Audio: string) => void;
  onModeChange: (prop: { mode: Mode }) => void;
  onStatusChange: (prop: { status: ConversationStatus }) => void;
  onCanSendFeedbackChange: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (params: string) => void;
  // React Native specific callbacks
  onPermissionRequested?: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
};
