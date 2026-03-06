import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ConversationContext } from "./ConversationContext";

export type ConversationInputValue = {
  isMuted: boolean;
  setMuted: (isMuted: boolean) => void;
};

const ConversationInputContext =
  createContext<ConversationInputValue | null>(null);

/**
 * Reads from `ConversationContext` and manages microphone mute state.
 * `setMuted` calls `conversation.setMicMuted()` and updates local state.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationInputProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationInputProvider must be rendered inside a ConversationProvider"
    );
  }

  const [isMuted, setIsMuted] = useState(false);

  const conversationRef = useRef(ctx.conversation);
  conversationRef.current = ctx.conversation;

  const setMuted = useCallback((muted: boolean) => {
    const conversation = conversationRef.current;
    if (!conversation) {
      throw new Error("No active conversation. Call startSession() first.");
    }
    conversation.setMicMuted(muted);
    setIsMuted(muted);
  }, []);

  const value = useMemo<ConversationInputValue>(
    () => ({ isMuted, setMuted }),
    [isMuted, setMuted]
  );

  return (
    <ConversationInputContext.Provider value={value}>
      {children}
    </ConversationInputContext.Provider>
  );
}

/**
 * Returns the current microphone mute state and a function to change it.
 * Re-renders only when the mute state changes.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationInput(): ConversationInputValue {
  const ctx = useContext(ConversationInputContext);
  if (!ctx) {
    throw new Error(
      "useConversationInput must be used within a ConversationProvider"
    );
  }
  return ctx;
}
