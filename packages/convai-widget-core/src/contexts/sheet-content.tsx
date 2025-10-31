import { signal, Signal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";

type SheetContentType = "transcript" | "feedback";

const SheetContentContext = createContext<{
  currentContent: Signal<SheetContentType>;
  setCurrentContent: (content: SheetContentType) => void;
} | null>(null);

export function SheetContentProvider({
  defaultContent = "feedback",
  children,
}: {
  defaultContent?: SheetContentType;
  children: ComponentChildren;
}) {
  const currentContent = signal<SheetContentType>(defaultContent);
  const setCurrentContent = (content: SheetContentType) => {
    currentContent.value = content;
  };

  return (
    <SheetContentContext.Provider value={{ currentContent, setCurrentContent }}>
      {children}
    </SheetContentContext.Provider>
  );
}

export function useSheetContent() {
  return useContextSafely(SheetContentContext);
}
