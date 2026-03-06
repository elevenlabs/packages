import type { HookOptions } from "../index";

export type ConversationProviderProps = React.PropsWithChildren<HookOptions>;

export type ConversationStatusValue = {
  status: "disconnected" | "connecting" | "connected" | "error";
  message?: string;
};

export type ConversationModeValue = {
  mode: "speaking" | "listening";
  isSpeaking: boolean;
  isListening: boolean;
};
