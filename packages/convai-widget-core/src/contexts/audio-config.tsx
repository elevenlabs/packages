import {
  computed,
  ReadonlySignal,
  useComputed,
  useSignal,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useWidgetConfig } from "./widget-config";
import { useContextSafely } from "../utils/useContextSafely";
import { useConversationMode } from "./conversation-mode";

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
  const isMutingEnabled = useComputed(
    () => widgetConfig.value.mic_muting_enabled ?? false
  );
  const isMuted = useSignal(false);

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
