import { ReadonlySignal, useSignal, useSignalEffect } from "@preact/signals";
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
  const { endSession, isDisconnected } = useConversation();
  const confirmationShown = useSignal(false);

  const value = useMemo(
    () => ({
      confirmationShown,
      requestEndSession: () => {
        if (config.peek().end_confirmation_enabled) {
          confirmationShown.value = true;
        } else {
          endSession();
        }
      },
      confirmEnd: () => {
        if (!confirmationShown.peek()) return;
        confirmationShown.value = false;
        endSession();
      },
      cancelEnd: () => {
        confirmationShown.value = false;
      },
    }),
    [config, confirmationShown, endSession]
  );

  // Close if the session ends some other way (agent, timeout, error)
  useSignalEffect(() => {
    if (isDisconnected.value) {
      confirmationShown.value = false;
    }
  });

  return (
    <EndConfirmationContext.Provider value={value}>
      {children}
    </EndConfirmationContext.Provider>
  );
}

export function useEndConfirmation() {
  return useContextSafely(EndConfirmationContext);
}
