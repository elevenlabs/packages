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
  const supportedOverrides = useComputed(() => {
    const overrides = widgetConfig.value.supported_language_overrides ?? [];
    const validOverrides = overrides.filter(isValidLanguage);

    // Log any invalid language codes
    const invalidOverrides = overrides.filter(code => !isValidLanguage(code));
    if (invalidOverrides.length > 0) {
      console.warn(
        `[ConversationalAI] Invalid language codes in supported_language_overrides:`,
        invalidOverrides
      );
    }

    return validOverrides;
  });

  // Compute language options from supported overrides
  // Note: We filter out any undefined values that might occur if a language code
  // doesn't exist in the Languages object, and add error handling for sorting
  // to prevent the widget from crashing if there are any unexpected issues
  const options = useComputed(() => {
    try {
      return supportedOverrides.value
        .map(code => Languages[code])
        .filter(lang => {
          if (lang === undefined) {
            console.error(
              `[ConversationalAI] Language mapping failed for a supported override`
            );
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          try {
            return a.name.localeCompare(b.name);
          } catch (e) {
            console.error(`[ConversationalAI] Error sorting languages:`, e, {
              a,
              b,
            });
            return 0;
          }
        });
    } catch (e) {
      console.error(`[ConversationalAI] Error computing language options:`, e);
      return [];
    }
  });

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
