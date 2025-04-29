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

interface MicConfig {
  isMutingEnabled: ReadonlySignal<boolean>;
  isMuted: ReadonlySignal<boolean>;
  setIsMuted: (value: boolean) => void;
}

const MicConfigContext = createContext<MicConfig | null>(null);

interface MicConfigProviderProps {
  children: ComponentChildren;
}

export function MicConfigProvider({ children }: MicConfigProviderProps) {
  const widgetConfig = useWidgetConfig();
  const isMutingEnabled = useComputed(
    () => widgetConfig.value.mic_muting_enabled ?? false
  );
  const isMuted = useSignal(false);

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
    }),
    []
  );

  return (
    <MicConfigContext.Provider value={value}>
      {children}
    </MicConfigContext.Provider>
  );
}

export function useMicConfig() {
  return useContextSafely(MicConfigContext);
}
