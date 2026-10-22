import { Signal, useComputed, useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { useContextSafely } from "../utils/useContextSafely";
import { useWidgetConfig } from "./widget-config";

export type SizeVariant = "compact" | "expanded" | "fullscreen";

interface WidgetSizeContextType {
  variant: Signal<SizeVariant>;
  fullscreenOnly: Signal<boolean>;
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
  const config = useWidgetConfig();
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

  // Always-expanded sheets can't be closed, so they keep the toggle
  const fullscreenOnly = useComputed(
    () =>
      isMobile.value &&
      !!config.value.mobile_fullscreen &&
      !config.value.always_expanded
  );

  const variant = useComputed<SizeVariant>(() => {
    if (fullscreenOnly.value) {
      return "fullscreen";
    }
    if (!expanded.value) {
      return "compact";
    }
    return isMobile.value ? "fullscreen" : "expanded";
  });

  const value = useMemo(
    () => ({
      variant,
      fullscreenOnly,
      toggleSize,
    }),
    [variant, fullscreenOnly, toggleSize]
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
