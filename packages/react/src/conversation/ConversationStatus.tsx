import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  useRawConversation,
  useSessionLifecycle,
} from "./ConversationContext.js";

export type ConversationStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type ConversationStatusValue = {
  status: ConversationStatus;
  message?: string;
};

const ConversationStatusContext = createContext<ConversationStatusValue | null>(
  null
);

/**
 * Derives conversation status from the session lifecycle and subscribes to
 * error events on the active conversation. Must be rendered inside a
 * `ConversationProvider`.
 */
export function ConversationStatusProvider({
  children,
}: React.PropsWithChildren) {
  const conversation = useRawConversation();
  const { isStarting, startupError } = useSessionLifecycle();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Subscribe to error events on the conversation
  useEffect(() => {
    if (!conversation) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when conversation reconnects
    setErrorMessage(undefined);
    return conversation.on("error", msg => {
      setErrorMessage(msg);
    });
  }, [conversation]);

  // Clear error when starting a new session
  useEffect(() => {
    if (isStarting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when new session starts
      setErrorMessage(undefined);
    }
  }, [isStarting]);

  const status: ConversationStatus = startupError
    ? "error"
    : errorMessage !== undefined
      ? "error"
      : isStarting
        ? "connecting"
        : conversation
          ? "connected"
          : "disconnected";

  const message = startupError ?? errorMessage;

  const value = useMemo<ConversationStatusValue>(
    () => ({ status, message }),
    [status, message]
  );

  return (
    <ConversationStatusContext.Provider value={value}>
      {children}
    </ConversationStatusContext.Provider>
  );
}

/**
 * Returns the current conversation status and any error message.
 * Re-renders when the connection status or error message changes.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationStatus(): ConversationStatusValue {
  const ctx = useContext(ConversationStatusContext);
  if (!ctx) {
    throw new Error(
      "useConversationStatus must be used within a ConversationProvider"
    );
  }
  return ctx;
}
