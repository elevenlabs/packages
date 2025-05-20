import { computed, ReadonlySignal, useComputed } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { DefaultTextContents, TextContents, TextKeys } from "../types/config";
import { useAttribute } from "./attributes";
import { useWidgetConfig } from "./widget-config";

import { useContextSafely } from "../utils/useContextSafely";
import { useLanguageConfig } from "./language-config";

type TextContentsType = {
  [key in keyof TextContents]: ReadonlySignal<string>;
};

const TextContentsContext = createContext<TextContentsType | null>(null);

interface TextContentsProviderProps {
  children: ComponentChildren;
}

export function TextContentsProvider({ children }: TextContentsProviderProps) {
  const config = useWidgetConfig();
  const { language } = useLanguageConfig();
  const textContents = useAttribute("text-contents");
  const parsedTextContents = useComputed(() => {
    try {
      if (textContents.value) {
        const parsed = JSON.parse(textContents.value);
        if (typeof parsed === "object") {
          return parsed as Partial<TextContents>;
        }
      }
    } catch (e) {
      console.error("[ConversationalAI] Cannot parse text-contents:", e);
    }

    return {};
  });

  const value = useMemo(() => {
    return Object.fromEntries(
      TextKeys.map(key => [
        key,
        computed(
          () =>
            parsedTextContents.value[key] ??
            config.value.language_presets?.[language.value.languageCode]
              ?.text_contents?.[key] ??
            config.value.text_contents?.[key] ??
            DefaultTextContents[key]
        ),
      ])
    ) as TextContentsType;
  }, []);

  return (
    <TextContentsContext.Provider value={value}>
      {children}
    </TextContentsContext.Provider>
  );
}

export function useTextContents() {
  return useContextSafely(TextContentsContext);
}
