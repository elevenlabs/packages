import {
  computed,
  ReadonlySignal,
  useComputed,
  useSignal,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { Language } from "@elevenlabs/client";
import { isValidLanguage, LanguageInfo, Languages } from "../types/languages";
import { useAttribute } from "./attributes";
import { useWidgetConfig } from "./widget-config";
import { useContextSafely } from "../utils/useContextSafely";

interface LanguageConfig {
  language: ReadonlySignal<LanguageInfo>;
  setLanguage: (value: Language) => void;
  options: ReadonlySignal<LanguageInfo[]>;
  showPicker: ReadonlySignal<boolean>;
}

const LanguageConfigContext = createContext<LanguageConfig | null>(null);

interface LanguageConfigProviderProps {
  children: ComponentChildren;
}

export function LanguageConfigProvider({
  children,
}: LanguageConfigProviderProps) {
  const widgetConfig = useWidgetConfig();
  const languageAttribute = useAttribute("language");
  const overrideLanguageAttribute = useAttribute("override-language");
  const languageCode = useSignal(
    languageAttribute.peek() ?? widgetConfig.peek().language
  );
  const supportedOverrides = useComputed(() =>
    (widgetConfig.value.supported_language_overrides ?? []).filter(
      isValidLanguage
    )
  );

  const options = useComputed(() =>
    supportedOverrides.value
      .map(code => Languages[code])
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  const value = useMemo(
    () => ({
      language: computed(() =>
        isValidLanguage(overrideLanguageAttribute.value)
          ? Languages[overrideLanguageAttribute.value]
          : isValidLanguage(languageCode.value) &&
              supportedOverrides.value.includes(languageCode.value)
            ? Languages[languageCode.value]
            : Languages[widgetConfig.value.language]
      ),
      setLanguage: (value: Language) => {
        languageCode.value = value;
      },
      options,
      showPicker: computed(() => options.value.length > 0),
    }),
    []
  );

  return (
    <LanguageConfigContext.Provider value={value}>
      {children}
    </LanguageConfigContext.Provider>
  );
}

export function useLanguageConfig() {
  return useContextSafely(LanguageConfigContext);
}
