import {
  computed,
  ReadonlySignal,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useContextSafely } from "../utils/useContextSafely";
import { useConversation } from "./conversation";

export type ConversationMode = "text" | "voice";

interface ConversationModeConfig {
  mode: ReadonlySignal<ConversationMode>;
  setMode: (value: ConversationMode) => void;
  isTextMode: ReadonlySignal<boolean>;
  isVoiceMode: ReadonlySignal<boolean>;
}

const ConversationModeContext = createContext<ConversationModeConfig | null>(
  null
);

interface ConversationModeProviderProps {
  children: ComponentChildren;
}

export function ConversationModeProvider({
  children,
}: ConversationModeProviderProps) {
  const mode = useSignal<ConversationMode>("voice");
  const { isDisconnected, addModeToggleEntry, setVolume } = useConversation();

  // Apply agent audio volume based on conversation mode
  useSignalEffect(() => {
    const isTextMode = mode.value === "text";
    setVolume(isTextMode ? 0 : 1);
  });

  const value = useMemo(
    () => ({
      mode: computed(() => mode.value),
      setMode: (value: ConversationMode) => {
        if (mode.value === value) return;
        mode.value = value;
        if (!isDisconnected.value) {
          addModeToggleEntry(value);
        }
      },
      isTextMode: computed(() => mode.value === "text"),
      isVoiceMode: computed(() => mode.value === "voice"),
    }),
    [isDisconnected, addModeToggleEntry]
  );

  return (
    <ConversationModeContext.Provider value={value}>
      {children}
    </ConversationModeContext.Provider>
  );
}

export function useConversationMode() {
  return useContextSafely(ConversationModeContext);
}
