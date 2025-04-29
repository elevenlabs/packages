import { computed, ReadonlySignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { DefaultTextContents } from "../types/config";
import { useAttributes } from "./attributes";
import { useWidgetConfig } from "./widget-config";
import { TextAttributeList, TextKeyList } from "../types/attributes";
import { useContextSafely } from "../utils/useContextSafely";

export type TextContents = {
  [key in (typeof TextKeyList)[number]]: ReadonlySignal<string>;
};

const TextContentsContext = createContext<TextContents | null>(null);

interface TextContentsProviderProps {
  children: ComponentChildren;
}

export function TextContentsProvider({ children }: TextContentsProviderProps) {
  const config = useWidgetConfig();
  const attributes = useAttributes();

  const value = useMemo(() => {
    return Object.fromEntries(
      TextKeyList.map((key, index) => [
        key,
        computed(
          () =>
            attributes[TextAttributeList[index]].value ??
            config.value[key] ??
            DefaultTextContents[key]
        ),
      ])
    ) as TextContents;
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
