import { Signal, useComputed, useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { useContextSafely } from "../utils/useContextSafely";

export type SizeVariant = "compact" | "expanded" | "fullscreen";

interface WidgetSizeContextType {
  variant: Signal<SizeVariant>;
  toggleSize: () => void;
}

const WidgetSizeContext = createContext<WidgetSizeContextType | undefined>(
  undefined
);

interface WidgetSizeProviderProps {
  children: ComponentChildren;
  initialVariant?: SizeVariant;
}

const MOBILE_BREAKPOINT = 768;

export function WidgetSizeProvider({
  children,
  initialVariant = "compact",
}: WidgetSizeProviderProps) {
  const expanded = useSignal(initialVariant !== "compact");
  const isMobile = useSignal<boolean>(
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false
  );

  useEffect(() => {
    const handleResize = () => {
      isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSize = useCallback(() => {
    expanded.value = !expanded.value;
  }, [expanded]);

  const variant = useComputed(() =>
    expanded.value ? (isMobile.value ? "fullscreen" : "expanded") : "compact"
  );

  const value = useMemo(
    () => ({
      variant,
      toggleSize,
    }),
    [variant, toggleSize]
  );

  return (
    <WidgetSizeContext.Provider value={value}>
      {children}
    </WidgetSizeContext.Provider>
  );
}

export function useWidgetSize() {
  return useContextSafely(WidgetSizeContext);
}
