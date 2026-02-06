import {
  computed,
  ReadonlySignal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo, useRef } from "preact/compat";
import { useWidgetConfig } from "./widget-config";
import { useContextSafely } from "../utils/useContextSafely";
import { useConversationMode } from "./conversation-mode";
import { useConversation } from "./conversation";

interface AudioConfig {
  // Microphone input control
  isMutingEnabled: ReadonlySignal<boolean>;
  isMuted: ReadonlySignal<boolean>;
  setIsMuted: (value: boolean) => void;
}

const AudioConfigContext = createContext<AudioConfig | null>(null);

interface AudioConfigProviderProps {
  children: ComponentChildren;
}

export function AudioConfigProvider({ children }: AudioConfigProviderProps) {
  const widgetConfig = useWidgetConfig();
  const { isTextMode } = useConversationMode();
  const { setMicMuted, status } = useConversation();
  const isMutingEnabled = useComputed(
    () => widgetConfig.value.mic_muting_enabled ?? false
  );
  const isMuted = useSignal(false);
  const prevMuteStateRef = useRef<boolean | null>(null);

  // Reset mute state when call disconnects to ensure each call starts fresh
  useSignalEffect(() => {
    if (status.value === "disconnected") {
      isMuted.value = false;
    }
  });

  // Handle mute state based on conversation mode and user preference
  useSignalEffect(() => {
    if (isTextMode.value) {
      // Text mode: save current state and always mute
      if (prevMuteStateRef.current === null) {
        prevMuteStateRef.current = isMuted.peek();
      }
      setMicMuted(true);
    } else {
      // Voice mode: restore saved state if returning from text mode
      if (prevMuteStateRef.current !== null) {
        isMuted.value = prevMuteStateRef.current;
        prevMuteStateRef.current = null;
      }

      setMicMuted(isMutingEnabled.value ? isMuted.value : false);
    }
  });

  const value = useMemo(
    () => ({
      isMuted: computed(() =>
        isTextMode.value
          ? true // Always mute in text mode
          : isMutingEnabled.value
            ? isMuted.value
            : // The user is not able to unmute themselves if the muting button is hidden
              false
      ),
      setIsMuted: (value: boolean) => {
        isMuted.value = value;
      },
      isMutingEnabled,
    }),
    []
  );

  return (
    <AudioConfigContext.Provider value={value}>
      {children}
    </AudioConfigContext.Provider>
  );
}

export function useAudioConfig() {
  return useContextSafely(AudioConfigContext);
}
