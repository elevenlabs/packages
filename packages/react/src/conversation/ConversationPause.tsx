import { createContext, useContext } from "react";
import { ConversationContext } from "./ConversationContext.js";

export type ConversationPauseValue = {
  isPaused: boolean;
};

const ConversationPauseContext = createContext<ConversationPauseValue | null>(
  null
);

/**
 * Reads pause state from `ConversationContext` and provides it through
 * `ConversationPauseContext`. Must be rendered inside a `ConversationProvider`.
 */
export function ConversationPauseProvider({
  children,
}: React.PropsWithChildren) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationPauseProvider must be rendered inside a ConversationProvider"
    );
  }

  return (
    <ConversationPauseContext.Provider value={{ isPaused: ctx.isPaused }}>
      {children}
    </ConversationPauseContext.Provider>
  );
}

/**
 * Returns whether the active conversation is paused.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationPause(): ConversationPauseValue {
  const ctx = useContext(ConversationPauseContext);
  if (!ctx) {
    throw new Error(
      "useConversationPause must be used within a ConversationProvider"
    );
  }
  return ctx;
}
