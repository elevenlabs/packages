import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRawConversationRef, useRegisterCallbacks } from "./ConversationContext";

export type ConversationFeedbackValue = {
  canSendFeedback: boolean;
  sendFeedback: (like: boolean) => void;
};

const ConversationFeedbackContext =
  createContext<ConversationFeedbackValue | null>(null);

/**
 * Reads from `ConversationContext` and registers an `onCanSendFeedbackChange`
 * callback. Manages its own `canSendFeedback` state and provides it along with
 * a `sendFeedback` action through `ConversationFeedbackContext`.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationFeedbackProvider({
  children,
}: React.PropsWithChildren) {
  const conversationRef = useRawConversationRef();
  const [canSendFeedback, setCanSendFeedback] = useState(false);

  useRegisterCallbacks({
    onCanSendFeedbackChange: ({
      canSendFeedback: newValue,
    }: {
      canSendFeedback: boolean;
    }) => {
      setCanSendFeedback(newValue);
    },
  });

  const sendFeedback = useCallback((like: boolean) => {
    conversationRef.current?.sendFeedback(like);
  }, [conversationRef]);

  const value = useMemo<ConversationFeedbackValue>(
    () => ({
      canSendFeedback,
      sendFeedback,
    }),
    [canSendFeedback, sendFeedback]
  );

  return (
    <ConversationFeedbackContext.Provider value={value}>
      {children}
    </ConversationFeedbackContext.Provider>
  );
}

/**
 * Returns the current feedback state and a `sendFeedback` action.
 * Re-renders only when `canSendFeedback` changes.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationFeedback(): ConversationFeedbackValue {
  const ctx = useContext(ConversationFeedbackContext);
  if (!ctx) {
    throw new Error(
      "useConversationFeedback must be used within a ConversationProvider"
    );
  }
  return ctx;
}
