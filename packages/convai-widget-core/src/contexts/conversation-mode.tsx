import { computed, ReadonlySignal, useSignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useContextSafely } from "../utils/useContextSafely";

export enum ConversationMode {
  Voice = "voice",
  Text = "text",
}

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
  const mode = useSignal<ConversationMode>(ConversationMode.Voice);

  const value = useMemo(
    () => ({
      mode: computed(() => mode.value),
      setMode: (value: ConversationMode) => {
        mode.value = value;
      },
      isTextMode: computed(() => mode.value === ConversationMode.Text),
      isVoiceMode: computed(() => mode.value === ConversationMode.Voice),
    }),
    []
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
