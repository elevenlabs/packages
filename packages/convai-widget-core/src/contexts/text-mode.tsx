import { computed, ReadonlySignal, useSignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useContextSafely } from "../utils/useContextSafely";

interface TextModeConfig {
  isTextMode: ReadonlySignal<boolean>;
  setIsTextMode: (value: boolean) => void;
}

const TextModeContext = createContext<TextModeConfig | null>(null);

interface TextModeProviderProps {
  children: ComponentChildren;
}

export function TextModeProvider({ children }: TextModeProviderProps) {
  const isTextMode = useSignal(false);

  const value = useMemo(
    () => ({
      isTextMode: computed(() => isTextMode.value),
      setIsTextMode: (value: boolean) => {
        isTextMode.value = value;
      },
    }),
    []
  );

  return (
    <TextModeContext.Provider value={value}>
      {children}
    </TextModeContext.Provider>
  );
}

export function useTextMode() {
  return useContextSafely(TextModeContext);
}
