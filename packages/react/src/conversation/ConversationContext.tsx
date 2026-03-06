import { createContext, useContext } from "react";
import type { Conversation } from "@elevenlabs/client";
import type { HookOptions } from "../index";

export type ConversationContextValue = {
  conversation: Conversation | null;
  startSession: (options?: HookOptions) => void;
  endSession: () => void;
};

export const ConversationContext =
  createContext<ConversationContextValue | null>(null);

/**
 * Returns the raw `Conversation` instance (or `null` if no session is active).
 * This is a public escape hatch for advanced use cases that need direct access
 * to the underlying `@elevenlabs/client` Conversation object.
 *
 * Can be used outside a `ConversationProvider` — returns `null` in that case.
 */
export function useRawConversation(): Conversation | null {
  const ctx = useContext(ConversationContext);
  return ctx?.conversation ?? null;
}

