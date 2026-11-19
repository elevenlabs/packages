import { Signal, useComputed, useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { useContextSafely } from "../utils/useContextSafely";
import { useTextOnly, useWidgetConfig } from "./widget-config";

export type SizeVariant = "compact" | "expanded" | "fullscreen" | "page";

interface WidgetSizeContextType {
  variant: Signal<SizeVariant>;
  fullscreenOnly: Signal<boolean>;
  /** The page layout's call pane, shown for voice agents beside the chat on desktop */
  showSpeechPane: Signal<boolean>;
  toggleSize: () => void;
  autoExpand: () => void;
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
  const textOnly = useTextOnly();
  // On mobile an expanded sheet is fullscreen
  const expanded = useSignal(
    initialVariant !== "compact" || config.peek().default_size === "expanded"
  );
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

  const resizedByUser = useSignal(false);

  const toggleSize = useCallback(() => {
    resizedByUser.value = true;
    expanded.value = !expanded.value;
  }, [expanded]);

  // Without the resize button the user couldn't shrink it back
  const autoExpand = useCallback(() => {
    if (
      !config.peek().expand_on_carousel ||
      resizedByUser.peek() ||
      isMobile.peek() ||
      config.peek().show_resize_button === false
    ) {
      return;
    }
    expanded.value = true;
  }, [expanded]);

  // Always-expanded sheets can't be closed, so they keep the toggle
  const fullscreenOnly = useComputed(
    () =>
      isMobile.value &&
      !!config.value.mobile_fullscreen &&
      !config.value.always_expanded
  );

  const showSpeechPane = useComputed(
    () => config.value.layout === "page" && !textOnly.value && !isMobile.value
  );

  const variant = useComputed<SizeVariant>(() => {
    if (config.value.layout === "page") {
      return "page";
    }
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
      showSpeechPane,
      toggleSize,
      autoExpand,
    }),
    [variant, fullscreenOnly, showSpeechPane, toggleSize, autoExpand]
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
