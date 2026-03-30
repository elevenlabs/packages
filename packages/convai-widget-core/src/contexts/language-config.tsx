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

const LAST_USED_LANGUAGE_KEY = "xi:convai-widget-last-used-language";

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

function maybeGetLastUsedLanguage(
  supported: Language[]
): Language | undefined {
  try {
    const stored = localStorage.getItem(LAST_USED_LANGUAGE_KEY);
    if (stored && isValidLanguage(stored) && supported.includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }
  return undefined;
}

function maybeGetBrowserLanguage(
  supported: Language[]
): Language | undefined {
  try {
    for (const lang of navigator.languages) {
      const lower = lang.toLowerCase() as Language;
      if (supported.includes(lower)) return lower;
      const base = lower.split("-")[0] as Language;
      if (supported.includes(base)) return base;
    }
  } catch (e) {
    console.warn("[ConversationalAI] Could not read navigator.languages:", e);
  }
  return undefined;
}

function resolveInitialLanguage({
  languageAttribute,
  supported,
  defaultLanguage,
}: {
  languageAttribute: Language | undefined;
  supported: Language[];
  defaultLanguage: Language;
}): Language {
  return (
    languageAttribute ??
    maybeGetLastUsedLanguage(supported) ??
    maybeGetBrowserLanguage(supported) ??
    defaultLanguage
  );
}

function writeLastUsedLanguage(language: Language): void {
  try {
    localStorage.setItem(LAST_USED_LANGUAGE_KEY, language);
  } catch {
    // localStorage may be unavailable
  }
}

export function LanguageConfigProvider({
  children,
}: LanguageConfigProviderProps) {
  const widgetConfig = useWidgetConfig();
  const languageAttribute = useAttribute("language");
  const overrideLanguageAttribute = useAttribute("override-language");
  const supportedOverrides = useComputed(() =>
    (widgetConfig.value.supported_language_overrides ?? []).filter(
      isValidLanguage
    )
  );

  const attr = languageAttribute.peek();
  const config = widgetConfig.peek();
  const supportedLanguageOverrides = (
    config.supported_language_overrides ?? []
  ).filter(isValidLanguage);
  const initialLanguage = resolveInitialLanguage({
    languageAttribute: attr && isValidLanguage(attr) ? attr : undefined,
    supported: supportedLanguageOverrides,
    defaultLanguage: config.language,
  });

  const languageCode = useSignal(initialLanguage);

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
        writeLastUsedLanguage(value);
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
