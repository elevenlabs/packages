import { createContext, useContext, useEffect, useState } from "react";
import type { Status } from "@elevenlabs/client";
import { ConversationContext } from "./ConversationContext";
import type { ConversationStatusValue } from "./types";

const ConversationStatusContext =
  createContext<ConversationStatusValue | null>(null);

/**
 * Reads from `ConversationContext` and registers `onStatusChange` + `onError`
 * callbacks. Manages its own `status`/`message` state and provides it through
 * `ConversationStatusContext`. Must be rendered inside a `ConversationProvider`.
 */
export function ConversationStatusProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationStatusProvider must be rendered inside a ConversationProvider"
    );
  }

  const [status, setStatus] = useState<ConversationStatusValue["status"]>("disconnected");
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    return ctx.registerCallbacks({
      onStatusChange: ({ status: newStatus }: { status: Status }) => {
        if (newStatus === "disconnecting") {
          // Transient state — keep current status
          return;
        }
        setStatus(newStatus);
        // Clear error message when transitioning to a non-error state
        setMessage(undefined);
      },
      onError: (errorMessage: string) => {
        setStatus("error");
        setMessage(errorMessage);
      },
    });
  }, [ctx.registerCallbacks]);

  const value: ConversationStatusValue = { status, message };

  return (
    <ConversationStatusContext.Provider value={value}>
      {children}
    </ConversationStatusContext.Provider>
  );
}

/**
 * Returns the current conversation status and any error message.
 * Re-renders only when the connection status changes.
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
