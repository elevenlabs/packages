import { createContext, useContext, useMemo, useState } from "react";
import type { Mode } from "@elevenlabs/client";
import { useRegisterCallbacks } from "./ConversationContext";

export type ConversationModeValue = {
  mode: "speaking" | "listening";
  isSpeaking: boolean;
  isListening: boolean;
};

const ConversationModeContext = createContext<ConversationModeValue | null>(
  null
);

/**
 * Reads from `ConversationContext` and registers an `onModeChange` callback.
 * Manages its own `mode` state and provides it through
 * `ConversationModeContext`. Must be rendered inside a `ConversationProvider`.
 */
export function ConversationModeProvider({
  children,
}: React.PropsWithChildren) {
  const [mode, setMode] = useState<Mode>("listening");

  useRegisterCallbacks({
    onModeChange: ({ mode: newMode }) => {
      setMode(newMode);
    },
    onDisconnect: () => {
      setMode("listening");
    },
  });

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
