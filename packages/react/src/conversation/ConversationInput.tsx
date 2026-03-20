import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRawConversation,
  useRawConversationRef,
  useRegisterCallbacks,
} from "./ConversationContext";

export type ConversationInputValue = {
  isMuted: boolean;
  setMuted: (isMuted: boolean) => void;
};

export type ConversationInputProviderProps = React.PropsWithChildren<{
  /** Controlled mute state. If omitted, provider manages state internally. */
  isMuted?: boolean;
  /** Called whenever mute state is changed via setMuted. */
  onMutedChange?: (isMuted: boolean) => void;
}>;

const ConversationInputContext = createContext<ConversationInputValue | null>(
  null
);

/**
 * Reads from `ConversationContext` and manages microphone mute state.
 * `setMuted` calls `conversation.setMicMuted()` and updates local state.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationInputProvider({
  children,
  isMuted: controlledIsMuted,
  onMutedChange,
}: ConversationInputProviderProps) {
  const conversation = useRawConversation();
  const conversationRef = useRawConversationRef();
  const isControlled = controlledIsMuted !== undefined;
  const [uncontrolledIsMuted, setUncontrolledIsMuted] = useState(false);
  const isMuted = isControlled ? controlledIsMuted : uncontrolledIsMuted;

  useRegisterCallbacks({
    onConnect() {
      conversationRef.current?.setMicMuted(isMuted);
    },
    onDisconnect() {
      if (!isControlled) {
        setUncontrolledIsMuted(false);
      }
    },
  });

  useEffect(() => {
    if (isControlled && conversation) {
      conversation.setMicMuted(controlledIsMuted);
    }
  }, [conversation, controlledIsMuted, isControlled]);

  const setMuted = useCallback(
    (muted: boolean) => {
      const conversation = conversationRef.current;
      if (!conversation) {
        throw new Error("No active conversation. Call startSession() first.");
      }
      conversation.setMicMuted(muted);
      if (!isControlled) {
        setUncontrolledIsMuted(muted);
      }
      onMutedChange?.(muted);
    },
    [conversationRef, isControlled, onMutedChange]
  );

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
