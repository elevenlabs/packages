import { createContext, useContext, useMemo, useState } from "react";
import {
  useRawConversationRef,
  useRegisterCallbacks,
} from "./ConversationContext.js";

export type ConversationStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type ConversationStatusValue = {
  /**
   * The state of the connection. `"error"` means the session could not be
   * established (or was torn down by the failure) — a live session never
   * reports it, so gating sends on `status === "connected"` is safe.
   */
  status: ConversationStatus;
  /**
   * The most recent error reported for this session, whether or not it ended
   * the session. Cleared when a new connection attempt starts, and kept once
   * the session is over so consumers can still show why it ended.
   */
  message?: string;
};

const ConversationStatusContext = createContext<ConversationStatusValue | null>(
  null
);

/**
 * Reads from `ConversationContext` and registers `onStatusChange` + `onError`
 * callbacks. Manages its own `status`/`message` state and provides it through
 * `ConversationStatusContext`. Must be rendered inside a `ConversationProvider`.
 */
export function ConversationStatusProvider({
  children,
}: React.PropsWithChildren) {
  const conversationRef = useRawConversationRef();
  const [status, setStatus] =
    useState<ConversationStatusValue["status"]>("disconnected");
  const [message, setMessage] = useState<string | undefined>(undefined);

  useRegisterCallbacks({
    onStatusChange({ status: newStatus }) {
      // "disconnecting" means the provider has already released the
      // conversation (endSession clears it optimistically), so report
      // "disconnected" immediately — holding "connected" here would let
      // consumers observe status === "connected" with no conversation.
      setStatus(newStatus === "disconnecting" ? "disconnected" : newStatus);
      // Only a new attempt invalidates a previous error. Errors raised on the
      // way down stay readable after the session ends, and the failure the
      // provider reports for a rejected startSession always arrives *after*
      // the client's final "disconnected".
      if (newStatus === "connecting" || newStatus === "connected") {
        setMessage(undefined);
      }
    },
    onError(errorMessage) {
      setMessage(errorMessage);
      // The client reports recoverable problems through `onError` while the
      // socket stays open — an unregistered client tool, a throwing tool
      // handler, a server `error` event, a failed MCP approval — and never
      // emits an "error" status of its own. Those must not knock a live
      // session out of "connected": consumers gate sending on it and would
      // disable themselves for the rest of the call. Only an error with no
      // conversation behind it ended or prevented the session; the provider
      // releases the conversation before reporting a rejected startSession.
      if (conversationRef.current === null) {
        setStatus("error");
      }
    },
  });

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
