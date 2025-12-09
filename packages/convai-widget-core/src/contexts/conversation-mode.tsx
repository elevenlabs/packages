import {
  computed,
  ReadonlySignal,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo, useRef } from "preact/compat";
import { useContextSafely } from "../utils/useContextSafely";
import { useAudioConfig } from "./audio-config";

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
  const { isMuted, setIsMuted, setIsAgentAudioEnabled } = useAudioConfig();
  const prevMuteStateRef = useRef<boolean | null>(null);

  // Sync audio configuration with conversation mode
  useSignalEffect(() => {
    const isTextMode = mode.value === ConversationMode.Text;
    if (isTextMode) {
      // Entering text mode: mute mic and disable agent audio
      prevMuteStateRef.current = isMuted.peek();
      setIsMuted(true);
      setIsAgentAudioEnabled(false);
    } else {
      // Exiting text mode: restore previous mic state and enable agent audio
      const prevMuteState = prevMuteStateRef.current;
      if (prevMuteState !== null) {
        setIsMuted(prevMuteState);
        prevMuteStateRef.current = null;
      }
      setIsAgentAudioEnabled(true);
    }
  });

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
