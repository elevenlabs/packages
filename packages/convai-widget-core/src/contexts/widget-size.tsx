import { createContext } from "preact";
import { useContext, useEffect, useMemo } from "preact/hooks";
import { Signal, useSignal, computed } from "@preact/signals";
import type { ComponentChildren } from "preact";

export type WidgetVariant = "compact" | "expanded" | "fullscreen";

interface WidgetVariants {
  container: string;
  content: string;
  origin: string;
}

const WIDGET_VARIANTS: Record<WidgetVariant, WidgetVariants> = {
  compact: {
    container: "w-full max-w-[400px] h-[550px]",
    content: "rounded-sheet",
    origin: "origin-bottom-right",
  },
  expanded: {
    container: "w-full max-w-[600px] h-[calc(100dvh-64px)]",
    content: "rounded-sheet",
    origin: "origin-bottom-right",
  },
  fullscreen: {
    // Negative margin trick to compensate for the margin of the widget with animations
    // TODO: respect the widget location & not hardcode the margin
    container: "w-[calc(100dvw)] h-[calc(100dvh)] -mr-8 -mb-8",
    content: "rounded-none",
    origin: "origin-bottom-right",
  },
};

interface WidgetSizeContextType {
  variant: Signal<WidgetVariant>;
  variants: WidgetVariants;
  toggleSize: () => void;
}

const WidgetSizeContext = createContext<WidgetSizeContextType | undefined>(
  undefined
);

interface WidgetSizeProviderProps {
  children: ComponentChildren;
  initialVariant?: WidgetVariant;
}

const MOBILE_BREAKPOINT = 768;

export function WidgetSizeProvider({
  children,
  initialVariant = "compact",
}: WidgetSizeProviderProps) {
  const variant = useSignal<WidgetVariant>(initialVariant);
  const isMobile = useSignal<boolean>(
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false
  );
  const variants = computed(() => WIDGET_VARIANTS[variant.value]);

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

  const toggleSize = () => {
    if (variant.value === "compact") {
      variant.value = isMobile.value ? "fullscreen" : "expanded";
    } else {
      variant.value = "compact";
    }
  };

  const value = useMemo(
    () => ({
      variant,
      variants: variants.value,
      toggleSize,
    }),
    [variant, variants, toggleSize]
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
