import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Mode } from "@elevenlabs/client";
import { useRawConversation } from "./ConversationContext.js";

export type ConversationModeValue = {
  mode: "speaking" | "listening";
  isSpeaking: boolean;
  isListening: boolean;
};

const ConversationModeContext = createContext<ConversationModeValue | null>(
  null
);

/**
 * Subscribes to mode-change events on the active conversation and provides
 * the current mode through `ConversationModeContext`.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationModeProvider({
  children,
}: React.PropsWithChildren) {
  const conversation = useRawConversation();
  const [mode, setMode] = useState<Mode>("listening");

  useEffect(() => {
    if (!conversation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when conversation disconnects
      setMode("listening");
      return;
    }
    return conversation.on("mode-change", ({ mode: newMode }) => {
      setMode(newMode);
    });
  }, [conversation]);

  const value = useMemo<ConversationModeValue>(
    () => ({
      mode,
      isSpeaking: mode === "speaking",
      isListening: mode === "listening",
    }),
    [mode]
  );

  return (
    <ConversationModeContext.Provider value={value}>
      {children}
    </ConversationModeContext.Provider>
  );
}

/**
 * Returns the current conversation mode (speaking/listening) and
 * convenience booleans. Re-renders only when the mode changes.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationMode(): ConversationModeValue {
  const ctx = useContext(ConversationModeContext);
  if (!ctx) {
    throw new Error(
      "useConversationMode must be used within a ConversationProvider"
    );
  }
  return ctx;
}
