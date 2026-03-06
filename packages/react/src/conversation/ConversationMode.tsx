import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Mode } from "@elevenlabs/client";
import { ConversationContext } from "./ConversationContext";
import type { ConversationModeValue } from "./types";

const ConversationModeContext =
  createContext<ConversationModeValue | null>(null);

/**
 * Reads from `ConversationContext` and registers an `onModeChange` callback.
 * Manages its own `mode` state and provides it through
 * `ConversationModeContext`. Must be rendered inside a `ConversationProvider`.
 */
export function ConversationModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationModeProvider must be rendered inside a ConversationProvider"
    );
  }

  const [mode, setMode] = useState<Mode>("listening");

  useEffect(() => {
    return ctx.registerCallbacks({
      onModeChange: ({ mode: newMode }: { mode: Mode }) => {
        setMode(newMode);
      },
    });
  }, [ctx.registerCallbacks]);

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
