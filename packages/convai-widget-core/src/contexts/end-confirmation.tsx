import { ReadonlySignal, useComputed, useSignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";
import { useConversation } from "./conversation";
import { useWidgetConfig } from "./widget-config";

const EndConfirmationContext = createContext<{
  confirmationShown: ReadonlySignal<boolean>;
  requestEndSession: () => void;
  confirmEnd: () => void;
  cancelEnd: () => void;
} | null>(null);

interface EndConfirmationProviderProps {
  children: ComponentChildren;
}

export function EndConfirmationProvider({
  children,
}: EndConfirmationProviderProps) {
  const config = useWidgetConfig();
  const { endSession, isDisconnected, conversationIndex } = useConversation();
  const requestedFor = useSignal<number | null>(null);
  const confirmationShown = useComputed(
    () =>
      requestedFor.value === conversationIndex.value && !isDisconnected.value
  );

  const value = useMemo(
    () => ({
      confirmationShown,
      requestEndSession: () => {
        if (config.peek().end_confirmation_enabled) {
          requestedFor.value = conversationIndex.peek();
        } else {
          endSession();
        }
      },
      confirmEnd: () => {
        if (!confirmationShown.peek()) return;
        requestedFor.value = null;
        endSession();
      },
      cancelEnd: () => {
        requestedFor.value = null;
      },
    }),
    [config, confirmationShown, requestedFor, conversationIndex, endSession]
  );

  return (
    <EndConfirmationContext.Provider value={value}>
      {children}
    </EndConfirmationContext.Provider>
  );
}

export function useEndConfirmation() {
  return useContextSafely(EndConfirmationContext);
}
