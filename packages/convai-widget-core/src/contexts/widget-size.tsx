import { createContext } from "preact";
import { useCallback, useContext, useEffect, useMemo } from "preact/hooks";
import { Signal, useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";

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
  const variant = useSignal<SizeVariant>(initialVariant);
  const isMobile = useSignal<boolean>(
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false
  );

  useEffect(() => {
    const handleResize = () => {
      const wasMobile = isMobile.value;
      isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
      // desktop -> mobile fullscreen
      if (!wasMobile && isMobile.value && variant.value === "expanded") {
        variant.value = "fullscreen";
      }
      // mobile fullscreen -> desktop expanded
      else if (wasMobile && !isMobile.value && variant.value === "fullscreen") {
        variant.value = "expanded";
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSize = useCallback(() => {
    if (variant.value === "compact") {
      variant.value = isMobile.value ? "fullscreen" : "expanded";
    } else {
      variant.value = "compact";
    }
  }, [variant, isMobile]);

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
  const context = useContext(WidgetSizeContext);
  if (!context) {
    throw new Error("useWidgetSize must be used within WidgetSizeProvider");
  }
  return context;
}
