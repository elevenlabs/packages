import { signal, Signal, computed } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";

type SheetContentType = "transcript" | "feedback";

export interface PageConfig {
  id: SheetContentType;
  showHeaderBack: boolean;
  onHeaderBack?: () => void;
}

const SheetContentContext = createContext<{
  currentContent: Signal<SheetContentType>;
  setCurrentContent: (content: SheetContentType) => void;
  currentConfig: Signal<PageConfig>;
} | null>(null);

export function SheetContentProvider({
  defaultContent = "transcript",
  children,
}: {
  defaultContent?: SheetContentType;
  children: ComponentChildren;
}) {
  const currentContent = signal<SheetContentType>(defaultContent);
  const setCurrentContent = (content: SheetContentType) => {
    currentContent.value = content;
  };

  const currentConfig = computed<PageConfig>(() => {
    const contentType = currentContent.value;

    if (contentType === "feedback") {
      return {
        id: "feedback",
        showHeaderBack: true,
        onHeaderBack: () => setCurrentContent("transcript"),
      };
    }

    return {
      id: "transcript",
      showHeaderBack: false,
    };
  });

  return (
    <SheetContentContext.Provider
      value={{ currentContent, setCurrentContent, currentConfig }}
    >
      {children}
    </SheetContentContext.Provider>
  );
}

export function useSheetContent() {
  return useContextSafely(SheetContentContext);
}
