import type { HookOptions } from "../index";

export type ConversationProviderProps = React.PropsWithChildren<HookOptions>;

export type ConversationModeValue = {
  mode: "speaking" | "listening";
  isSpeaking: boolean;
  isListening: boolean;
};
