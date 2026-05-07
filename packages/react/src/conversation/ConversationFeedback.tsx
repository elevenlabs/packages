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
} from "./ConversationContext.js";

export type ConversationFeedbackValue = {
  canSendFeedback: boolean;
  sendFeedback: (like: boolean) => void;
};

const ConversationFeedbackContext =
  createContext<ConversationFeedbackValue | null>(null);

/**
 * Subscribes to can-send-feedback-change events on the active conversation.
 * Manages its own `canSendFeedback` state and provides it along with
 * a `sendFeedback` action through `ConversationFeedbackContext`.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationFeedbackProvider({
  children,
}: React.PropsWithChildren) {
  const conversation = useRawConversation();
  const conversationRef = useRawConversationRef();
  const [canSendFeedback, setCanSendFeedback] = useState(false);

  useEffect(() => {
    if (!conversation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when conversation disconnects
      setCanSendFeedback(false);
      return;
    }
    return conversation.on(
      "can-send-feedback-change",
      ({ canSendFeedback: newValue }) => {
        setCanSendFeedback(newValue);
      }
    );
  }, [conversation]);

  const sendFeedback = useCallback(
    (like: boolean) => {
      conversationRef.current?.sendFeedback(like);
    },
    [conversationRef]
  );

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
