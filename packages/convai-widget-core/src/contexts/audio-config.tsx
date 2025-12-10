import {
  computed,
  ReadonlySignal,
  Signal,
  useComputed,
  useSignal,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useWidgetConfig } from "./widget-config";
import { useContextSafely } from "../utils/useContextSafely";

interface AudioConfig {
  // Microphone input control
  isMutingEnabled: ReadonlySignal<boolean>;
  isMuted: ReadonlySignal<boolean>;
  setIsMuted: (value: boolean) => void;
  // Agent audio output control
  isAgentAudioEnabled: Signal<boolean>;
}

const AudioConfigContext = createContext<AudioConfig | null>(null);

interface AudioConfigProviderProps {
  children: ComponentChildren;
}

export function AudioConfigProvider({ children }: AudioConfigProviderProps) {
  const widgetConfig = useWidgetConfig();
  const isMutingEnabled = useComputed(
    () => widgetConfig.value.mic_muting_enabled ?? false
  );
  const isMuted = useSignal(false);
  const isAgentAudioEnabled = useSignal(true);

  const value = useMemo(
    () => ({
      isMuted: computed(() =>
        isMutingEnabled.value
          ? isMuted.value
          : // The user will not be able to unmute themselves if the muting
            // button is hidden so we always return false
            false
      ),
      setIsMuted: (value: boolean) => {
        isMuted.value = value;
      },
      isMutingEnabled,
      isAgentAudioEnabled,
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
