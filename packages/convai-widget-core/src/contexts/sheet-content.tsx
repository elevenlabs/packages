import { type Signal, useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext } from "preact/compat";
import { useMemo } from "preact/hooks";

import { useContextSafely } from "../utils/useContextSafely";

type SheetContentType = "transcript" | "feedback";

export interface PageConfig {
  showHeaderBack: boolean;
  onHeaderBack?: () => void;
}

const SheetContentContext = createContext<{
  currentContent: Signal<SheetContentType>;
  currentConfig: PageConfig;
} | null>(null);

export function SheetContentProvider({
  defaultContent = "transcript",
  children,
}: {
  defaultContent?: SheetContentType;
  children: ComponentChildren;
}) {
  const currentContent = useSignal<SheetContentType>(defaultContent);

  const value = useMemo(() => {
    const contentType = currentContent.value;

    const currentConfig: PageConfig =
      contentType === "feedback"
        ? {
            showHeaderBack: true,
            onHeaderBack: () => {
              currentContent.value = "transcript";
            },
          }
        : {
            showHeaderBack: false,
          };

    return { currentContent, currentConfig };
  }, [currentContent.value]);

  return (
    <SheetContentContext.Provider value={value}>
      {children}
    </SheetContentContext.Provider>
  );
}

export function useSheetContent() {
  return useContextSafely(SheetContentContext);
}
